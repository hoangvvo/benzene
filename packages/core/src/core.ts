import {
  DocumentNode,
  ExecutionArgs,
  ExecutionResult,
  formatError,
  FormattedExecutionResult,
  getOperationAST,
  GraphQLArgs,
  GraphQLError,
  GraphQLSchema,
  parse,
  print,
  SubscriptionArgs,
  validate,
  validateSchema,
  ValidationRule,
} from "graphql";
import lru, { Lru } from "tiny-lru";
import {
  CompiledCache,
  CompiledQuery,
  CompileQuery,
  ContextFn,
  Maybe,
  Options,
  ValueOrPromise,
} from "./types";
import { isExecutionResult, makeCompileQuery } from "./utils";

export default class Benzene<TContext = any, TExtra = any> {
  private lru: Lru<CompiledCache>;
  public schema: GraphQLSchema;
  private validateFn: typeof validate;
  private validationRules?: ValidationRule[];
  formatErrorFn: typeof formatError;
  contextFn?: ContextFn<TContext, TExtra>;
  private compileQuery: CompileQuery;

  constructor(options: Options<TContext, TExtra>) {
    if (!options) throw new TypeError("GQL must be initialized with options");
    this.validateFn = options.validateFn || validate;
    this.validationRules = options.validationRules;
    this.formatErrorFn = options.formatErrorFn || formatError;
    this.contextFn = options.contextFn;
    // build cache
    this.lru = lru(1024);
    // construct schema and validate
    const schemaValidationErrors = validateSchema(options.schema);
    if (schemaValidationErrors.length > 0) {
      throw schemaValidationErrors;
    }
    this.schema = options.schema;
    if (!options.compileQuery) {
      console.warn(`The default GraphQL implementation of Benzene has been changed from graphql-jit to graphql-js.
To remove this message, explicitly specify the desired runtime.
Learn more at: https://benzene.vercel.app/reference/runtime#built-in-implementations.`);
    }
    this.compileQuery = options.compileQuery || makeCompileQuery();
  }

  public compile(
    query: string | DocumentNode,
    operationName?: Maybe<string>
  ): CompiledCache | ExecutionResult {
    let document;
    if (typeof query === "object") {
      // query is DocumentNode
      document = query;
      query = print(document);
    }

    const key = query + (operationName ? `:${operationName}` : "");
    let cached = this.lru.get(key);

    if (cached) {
      return cached;
    } else {
      if (!document) {
        try {
          document = parse(query);
        } catch (syntaxErr) {
          return {
            errors: [syntaxErr],
          };
        }
      }

      const validationErrors = this.validateFn(
        this.schema,
        document,
        this.validationRules
      );
      if (validationErrors.length > 0) {
        return {
          errors: validationErrors,
        };
      }

      const operation = getOperationAST(document, operationName)?.operation;
      if (!operation)
        return {
          errors: [
            new GraphQLError(
              "Must provide operation name if query contains multiple operations."
            ),
          ],
        };

      const compiled = this.compileQuery(this.schema, document, operationName);

      // Compilation is a failure since its result is ExecutionResult
      if (!("execute" in compiled)) return compiled;

      cached = compiled as CompiledCache;
      cached.document = document;
      cached.operation = operation;

      this.lru.set(key, cached);

      return cached;
    }
  }

  formatExecutionResult(result: ExecutionResult): FormattedExecutionResult {
    const o: FormattedExecutionResult = {};
    if (result.data) o.data = result.data;
    if (result.errors) o.errors = result.errors.map(this.formatErrorFn);
    return o;
  }

  public async graphql({
    source,
    contextValue,
    variableValues,
    operationName,
    rootValue,
  }: Partial<GraphQLArgs> & {
    source: string;
  }): Promise<FormattedExecutionResult> {
    const cachedOrResult = this.compile(source, operationName);
    return this.formatExecutionResult(
      "document" in cachedOrResult
        ? await this.execute(
            {
              document: cachedOrResult.document,
              contextValue,
              variableValues,
              rootValue,
              operationName,
            },
            cachedOrResult
          )
        : cachedOrResult
    );
  }

  execute(
    args: Pick<
      ExecutionArgs,
      | "document"
      | "contextValue"
      | "variableValues"
      | "rootValue"
      | "operationName"
    >,
    compiled?: CompiledQuery
  ): ValueOrPromise<ExecutionResult> {
    if (!compiled) {
      const compiledOrResult = this.compile(args.document);
      if (isExecutionResult(compiledOrResult)) return compiledOrResult;
      compiled = compiledOrResult;
    }
    return compiled.execute(args);
  }

  async subscribe(
    args: Pick<
      SubscriptionArgs,
      | "document"
      | "contextValue"
      | "variableValues"
      | "rootValue"
      | "operationName"
    >,
    compiled?: CompiledQuery
  ): Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult> {
    if (!compiled) {
      const compiledOrResult = this.compile(args.document);
      if (isExecutionResult(compiledOrResult)) return compiledOrResult;
      compiled = compiledOrResult;
    }
    return compiled.subscribe(args);
  }
}
