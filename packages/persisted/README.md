# @benzene/persisted

[![npm](https://badgen.net/npm/v/@benzene/persisted)](https://www.npmjs.com/package/@benzene/persisted)
![CI](https://github.com/hoangvvo/benzene/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/hoangvvo/benzene/branch/main/graph/badge.svg?token=KUCEOC1JT2)](https://codecov.io/gh/hoangvvo/benzene)
[![PRs Welcome](https://badgen.net/badge/PRs/welcome/ff5252)](/CONTRIBUTING.md)

> Add popular persisted queries supports to [Benzene](https://github.com/hoangvvo/benzene)

```js
import { GraphQL } from '@benzene/server';
import { PersistedAutomatic } from '@benzene/persisted';

const GQL = new GraphQL({
  persisted: new PersistedAutomatic({ cache })
})
```

Documentation is available at [hoangvvo.github.io/benzene/#/persisted](https://hoangvvo.github.io/benzene/#/persisted/)