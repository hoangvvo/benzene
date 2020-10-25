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
} from 'graphql';
import {
  compileQuery,
  isCompiledQuery,
  CompiledQuery,
} from '@hoangvvo/graphql-jit';
import lru, { Lru } from 'tiny-lru';
import {
  Config,
  QueryCache,
  FormattedExecutionResult,
  ValueOrPromise,
  GraphQLPersisted,
} from './types';

export class GraphQL {
  private lru: Lru<QueryCache>;
  public schema: GraphQLSchema;
  protected options: Config;
  persisted?: GraphQLPersisted;

  constructor(options: Config) {
    // validate options
    if (!options) {
      throw new TypeError('GQL must be initialized with options');
    }
    this.options = options;
    // build cache
    this.lru = lru(1024);
    // construct schema and validate
    this.schema = this.options.schema;
    const schemaValidationErrors = validateSchema(this.schema);
    if (schemaValidationErrors.length > 0) {
      throw schemaValidationErrors;
    }
    // persisted config
    this.persisted = options.persisted;
  }

  // This API is internal even if it is defined as public
  public getCachedGQL(
    query: string,
    operationName?: string | null
  ): QueryCache | ExecutionResult {
    const key = query + (operationName ? `:${operationName}` : '');
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
              'Must provide operation name if query contains multiple operations.'
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
    if (result.errors)
      o.errors = result.errors.map(this.options.formatError || formatError);
    return o;
  }

  public async graphql({
    source,
    contextValue,
    variableValues,
    operationName,
    rootValue,
  }: Pick<
    GraphQLArgs,
    'contextValue' | 'variableValues' | 'operationName' | 'rootValue'
  > & {
    source: string;
  }): Promise<FormattedExecutionResult> {
    const cachedOrResult = this.getCachedGQL(source, operationName);
    return this.formatExecutionResult(
      'document' in cachedOrResult
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
    }: Omit<SubscriptionArgs, 'schema'>,
    jit: CompiledQuery
  ): ValueOrPromise<ExecutionResult> {
    return jit.query(rootValue, contextValue, variableValues);
  }

  // Reimplements graphql/subscription/subscribe but using jit
  subscribe(
    { contextValue, variableValues, rootValue }: Omit<ExecutionArgs, 'schema'>,
    jit: CompiledQuery
  ): Promise<AsyncIterableIterator<ExecutionResult> | ExecutionResult> {
    return jit.subscribe!(rootValue, contextValue, variableValues);
  }
}
