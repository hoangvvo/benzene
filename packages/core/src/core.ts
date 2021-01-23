import {
  validateSchema,
  validate,
  parse,
  getOperationAST,
  GraphQLError,
  GraphQLSchema,
  ExecutionResult,
  formatError,
  SubscriptionArgs,
  GraphQLArgs,
  ExecutionArgs,
  FormattedExecutionResult,
} from "graphql";
import {
  compileQuery,
  isCompiledQuery,
  CompiledQuery,
} from "@hoangvvo/graphql-jit";
import lru, { Lru } from "tiny-lru";
import { Options, ContextFn, QueryCache, ValueOrPromise } from "./types";

export default class Benzene<TContext = any, TExtra = any> {
  private lru: Lru<QueryCache>;
  public schema: GraphQLSchema;
  formatErrorFn: typeof formatError;
  contextFn?: ContextFn<TContext, TExtra>;

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
  }

  // This API is internal even if it is defined as public
  public getCachedGQL(
    query: string,
    operationName?: string | null
  ): QueryCache | ExecutionResult {
    const key = query + (operationName ? `:${operationName}` : "");
    const cached = this.lru.get(key);

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

      const jit = compileQuery(
        this.schema,
        document,
        operationName || undefined
      );

      if (!isCompiledQuery(jit)) return jit;

      // Cache the compiled query
      // TODO: We are not caching multi document query right now
      this.lru.set(key, {
        document,
        jit,
        operation,
      });

      return { operation, jit, document };
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
    const cachedOrResult = this.getCachedGQL(source, operationName);
    return this.formatExecutionResult(
      "document" in cachedOrResult
        ? await this.execute(
            {
              document: cachedOrResult.document,
              contextValue,
              variableValues,
              rootValue,
            },
            cachedOrResult.jit
          )
        : cachedOrResult
    );
  }

  // Reimplements graphql/execution/execute but using jit
  execute(
    {
      contextValue,
      variableValues,
      rootValue,
    }: Partial<Omit<SubscriptionArgs, "schema">>,
    jit: CompiledQuery
  ): ValueOrPromise<ExecutionResult> {
    return jit.query(rootValue, contextValue, variableValues);
  }

  // Reimplements graphql/subscription/subscribe but using jit
  subscribe(
    {
      contextValue,
      variableValues,
      rootValue,
    }: Partial<Omit<ExecutionArgs, "schema">>,
    jit: CompiledQuery
  ): Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult> {
    return jit.subscribe!(rootValue, contextValue, variableValues);
  }
}
