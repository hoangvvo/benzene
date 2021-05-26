# Contribute to Benzene

:+1::tada: Thank you for being here. It is people like you that make `benzene` great and help shape a better open-source community.

## What `benzene` is looking for

I welcome all contributions from the community. There are many ways to contribute:

- :art: Submit PR to fix bugs, enhance/add existed/new features.
- :children_crossing: Submit bug reports and feature requests.
- :pencil: Improve documentation and writing examples.

However, please avoid using the issue tracker for questions. Use the `Discussion` tab instead.

## How to contribute

### Bug reports

If you are submitting a :bug: bug report, please:

- Use a clear and descriptive title. Describe the behavior you observed and the expected behavior.
- Describe the exact steps which reproduce the problem. A minimal reproduction repo is greatly appreciated.
- Include Node version, OS, or other information that may be helpful in the troubleshooting.

### Process on submitting a PR

*Generally, all pull requests should have references to an issue.*

If you are :sparkles: **adding a new feature**, please first [create an issue](../../issues/new) for discussion.

The steps to submit a PR are:

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device.

2. Install all dependencies and dev dependencies by `npm i`.

3. Make changes and commit. Use the present tense and imperative mood ("Add feature" instead of "Adds feature" or "Added feature").

4. Make sure your code is linted by running `npm run lint -- --fix`. 

5. If a change is not documentation-related, please add a tests if possible.

6. Build and run tests

```bash
npm run build
npm test
```

7. [Create a pull request](https://help.github.com/en/articles/creating-a-pull-request-from-a-fork)

#### Document the changes

This project uses [changesets](https://github.com/atlassian/changesets). Every PR should include changes and their scopes for versioning. This can be done by:

```bash
npx changeset
```

Answer all the prompted questions and commit to created files in `.changeset` folder.

For more on adding a changeset, see [this](https://github.com/atlassian/changesets/blob/master/docs/adding-a-changeset.md#i-am-in-a-multi-package-repository-a-mono-repo).

### Release new version

This section is done by maintainer only.

Run `changeset version` to bump all packages' versions and update `CHANGELOG` files:

```bash
npx changeset version
```

Commit the changes:

```bash
git commit -a -m 'Version Packages'
```

Publish to `npm` and push the changes (with tags) to `main`.

```bash
npx changeset publish
git push && git push --tags
```