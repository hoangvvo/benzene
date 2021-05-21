import {
  ExecutionArgs,
  ExecutionResult,
  formatError,
  FormattedExecutionResult,
  getOperationAST,
  GraphQLArgs,
  GraphQLError,
  GraphQLSchema,
  parse,
  SubscriptionArgs,
  validate,
  validateSchema,
} from "graphql";
import lru, { Lru } from "tiny-lru";
import createCompileQueryJS from "./runtimes/js";
import {
  CompileQuery,
  ContextFn,
  GraphQLCompiled,
  Maybe,
  Options,
  QueryCache,
  ValueOrPromise,
} from "./types";

export default class Benzene<TContext = any, TExtra = any> {
  private lru: Lru<QueryCache>;
  public schema: GraphQLSchema;
  formatErrorFn: typeof formatError;
  contextFn?: ContextFn<TContext, TExtra>;
  private compileQuery: CompileQuery;

  constructor(options: Options<TContext, TExtra>) {
    if (!options) throw new TypeError("GQL must be initialized with options");
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
    this.compileQuery = options.compileQuery || createCompileQueryJS();
  }

  public getCached(
    query: string,
    operationName?: Maybe<string>
  ): QueryCache | ExecutionResult {
    const key = query + (operationName ? `:${operationName}` : "");
    let cached = this.lru.get(key);

    if (cached) {
      return cached;
    } else {
      let document;
      try {
        document = parse(query);
      } catch (syntaxErr) {
        return {
          errors: [syntaxErr],
        };
      }

      const validationErrors = validate(this.schema, document);
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

      // Could not compile query since its result is ExecutionResult
      if (!("execute" in compiled)) return compiled;

      // Cache the compiled query
      // TODO: We are not caching multi document query right now
      cached = {
        document,
        compiled,
        operation,
      };

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
    const cachedOrResult = this.getCached(source, operationName);
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
            cachedOrResult.compiled
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
    compiled: GraphQLCompiled
  ): ValueOrPromise<ExecutionResult> {
    return compiled.execute(args);
  }

  subscribe(
    args: Pick<
      SubscriptionArgs,
      | "document"
      | "contextValue"
      | "variableValues"
      | "rootValue"
      | "operationName"
    >,
    compiled: GraphQLCompiled
  ): Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult> {
    return compiled.subscribe!(args);
  }
}
