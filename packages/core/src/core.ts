import {
  DocumentNode,
  ExecutionArgs,
  ExecutionResult,
  FormattedExecutionResult,
  getOperationAST,
  GraphQLArgs,
  GraphQLError,
  GraphQLFormattedError,
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
  BenzeneGraphQLArgs,
  CompiledResult,
  CompileQuery,
  ContextFn,
  Maybe,
  Options,
  ValueOrPromise,
} from "./types";
import { formatError, isExecutionResult, makeCompileQuery } from "./utils";

export default class Benzene<TContext = any, TExtra = any> {
  private lru: Lru<CompiledResult>;
  public schema: GraphQLSchema;
  private validateFn: typeof validate;
  private validationRules?: ValidationRule[];
  formatErrorFn: (error: GraphQLError) => GraphQLFormattedError;
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
    if (!(options.schema instanceof GraphQLSchema)) {
      throw new Error(`Expected ${options.schema} to be a GraphQL schema.`);
    }
    const schemaValidationErrors = validateSchema(options.schema);
    if (schemaValidationErrors.length > 0) {
      throw schemaValidationErrors;
    }
    this.schema = options.schema;
    this.compileQuery = options.compileQuery || makeCompileQuery();
  }

  public compile(
    query: string | DocumentNode,
    operationName?: Maybe<string>
  ): CompiledResult | ExecutionResult {
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
        if (!query) throw new Error("Must provide document.");
        try {
          document = parse(query);
        } catch (syntaxErr: any) {
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

      const compiled = this.compileQuery(this.schema, document, operationName);

      // Compilation is a failure since its result is ExecutionResult
      if (isExecutionResult(compiled)) return compiled;

      cached = compiled as CompiledResult;
      cached.document = document;

      const operation = getOperationAST(document, operationName)?.operation;

      if (operation) {
        // If we could not determine the operation, it is unsafe to cache
        cached.operation = operation;
        this.lru.set(key, cached);
      }
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
    if (isExecutionResult(cachedOrResult)) return cachedOrResult;
    return this.execute({
      document: cachedOrResult.document,
      contextValue,
      variableValues,
      rootValue,
      operationName,
      compiled: cachedOrResult,
    });
  }

  execute(
    args: BenzeneGraphQLArgs<ExecutionArgs>
  ): ValueOrPromise<ExecutionResult> {
    if (!args.compiled) {
      if (!args.document) throw new Error("Must provide document.");
      const compiledOrResult = this.compile(args.document);
      if (isExecutionResult(compiledOrResult)) return compiledOrResult;
      args.compiled = compiledOrResult;
    } else {
      args.document = args.compiled.document;
    }
    return args.compiled.execute(args as ExecutionArgs);
  }

  async subscribe(
    args: BenzeneGraphQLArgs<SubscriptionArgs>
  ): Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult> {
    if (!args.compiled) {
      if (!args.document) throw new Error("Must provide document.");
      const compiledOrResult = this.compile(args.document);
      if (isExecutionResult(compiledOrResult)) return compiledOrResult;
      args.compiled = compiledOrResult;
    } else {
      args.document = args.compiled.document;
    }
    return args.compiled.subscribe(args as SubscriptionArgs);
  }
}
