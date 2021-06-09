# Contributing

- Read the [style guide](#style-guide).
- Ask for help on the [official Discord server](https://discord.gg/ddeno)
- If you are going to work on an issue, mention so in the issue comments before
  you start working on the issue.
- If you are going to work on a new feature, create an issue and discuss with
  other contributors before you start working on the feature.
- Abide by and heed to
  [Discord Developer Terms of Service](https://discord.com/developers/docs/legal)

## Submitting a Pull Request

- Give the PR a descriptive title.
- Ensure there is a related issue and it is referenced in the pull request text.
- Ensure there are tests that cover the changes.
- Ensure all of the checks (lint and test) are passing.
- Use underscores as a separator in filenames.
- Comply with
  [these guidelines for inclusive code](https://chromium.googlesource.com/chromium/src/+/master/styleguide/inclusive_code.md).
- An exported function must not have more than 4 individual parameters, the rest
  arguments should be encorporated inside an object as a single parameter.
- Export all interfaces, types, and enums that are used for or inside an
  exported entity.
- Every exported entity must be accompanied by a Typedoc (JSDoc without explicit
  types) comment block. Ideally, we prefer single line comment block.
- Please follow the
  [guidelines for inclusive code](https://chromium.googlesource.com/chromium/src/+/master/styleguide/inclusive_code.md).
