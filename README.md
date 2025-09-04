# @hyrious/dup

Find duplicates in your package-lock.json / pnpm-lock.yaml.

This script is using string matching, it is very fast.

## Usage

<pre><code>$ cd path/to/your/npm-project
$ <a href="https://github.com/antfu/ni">nlx</a> @hyrious/dup
foo@1.0.0
foo@2.0.0</code></pre>

### Next Steps

You can run <code><a href="https://github.com/antfu/ni">na</a> why {package-name}</code>
to find out why they are there in your dependencies tree.

- The duplicates are likely to happen after you have run
  <code><a href="https://github.com/antfu/taze">taze</a> -wi</code>. This is
  because package managers tend to keep indirect dependencies' versions if
  updating them is not necessary and for smaller downloading footprint.

  You can run <code><a href="https://github.com/antfu/ni">na</a> dedupe</code>
  to force update all dependencies to the same version (if possible).

- Some modules may deploy their function and CLI in the same package, which
  results in the CLI's dependencies (`yargs`, `commander`, etc.) being included
  in your dependencies tree and you actually does not need them.

  You can add [overrides](https://pnpm.io/settings#overrides) to remove
  them, for example (in pnpm-workspace.yaml):

  ```yaml
  overrides:
    "critters>chalk": "npm:noop-package@1.0.0"
    "html-minifier>commander": "npm:noop-package@1.0.0"
  ```

  Or in [package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#overrides)
  (for npm):

  ```json
  "overrides": {
    "chalk": "npm:noop-package@1.0.0",
    "commander": "npm:noop-package@1.0.0"
  }
  ```

- If an indirect dependency's newer version breaks your codebase, you can either

  - Hack into it (if possible) in your codebase and alter its behavior;
  - Make a [patch](https://pnpm.io/cli/patch) to fix it manually;
  - Raise an issue to the package's repo.

  I'm just encouraging you to use less dependencies to risk less.

- Bonus: run `DUP_EVIL=1 dup` to add overrides to all duplicate dependencies.
  It's _evil_ since things may break because of dependencies getting newer.

## License

MIT @ [hyrious](https://github.com/hyrious)
