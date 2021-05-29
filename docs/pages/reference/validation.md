# Validation

Validation refers to the process of validating a GraphQL document against a GraphQL schema and a set of rules
to ensure that it is unambiguous and mistake‐free.

See the [validation specification](https://spec.graphql.org/June2018/#sec-Validation) to learn more.

## Custom validation function

**Benzene** allows custom validation function like below:

```js
const GQL = new Benzene({
  validateFn(schema, ast, rules) {
    // Return an array of errors in case of validation failures or an empty one otherwise
  },
});
```

If defined, this will be used instead of [the `validate` function from `graphql-js`](https://github.com/graphql/graphql-js/tree/main/src/validation).

## Custom validation rules

We can also provide a set of custom validation rules that would be used in the validation function.

```js
const customValidationRules = [depthLimit, queryComplexity];
const GQL = new Benzene({
  validationRules: customValidationRules,
});
```

To best follow the [GraphQL specification on validation](https://spec.graphql.org/June2018/#sec-Validation),
it is recommended to also include `specifiedRules` from `graphql-js` in addition to our custom rules.

```js
import { specifiedRules } from "graphql";

const GQL = new Benzene({
  validationRules: [...customValidationRules],
});
```