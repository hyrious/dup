# Lockfile Formats

## NPM Lockfile v3

https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json#file-format

```json
{
  "lockfileVersion": 3,
  "packages": {
    "node_modules/{package-name}": {
      "version": "0.1.0"
    },
  }
}
```

## PNPM Lockfile v6

https://github.com/pnpm/spec/blob/master/lockfile/6.0.md

```yaml
lockfileVersion: '6.0'

packages:

  /{package-name}@version(peer-dep1@v1)(peer-dep2@v2):
    ...
```

## PNPM Lockfile v9

No spec yet :/

```yaml
lockfileVersion: '9.0'

packages:

  '{@scoped/package-name}@0.1.0(peer-dep1@v1)(peer-dep2@v2)': {}
# ^ scoped packages always wrapped in single quotes, this is js-yaml's behavior

  {package-name}@0.1.0(peer-dep1@v1)(peer-dep2@v2): {}
# ^ no / any more
```

## Yarn Lockfile v1

https://classic.yarnpkg.com/lang/en/docs/yarn-lock/


```yaml
"@scoped/{package-name}@{sepc}", "@scoped/{package-name}@{spec2}":
  version "0.1.0"

{package-name}@{spec}:
  version "0.1.0"
```
