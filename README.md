# cat-knip

[![CI](https://github.com/TheCoreMan/cat-knip/actions/workflows/ci.yml/badge.svg)](https://github.com/TheCoreMan/cat-knip/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/cat-knip)](https://www.npmjs.com/package/cat-knip)
[![license](https://img.shields.io/npm/l/cat-knip)](./LICENSE)

Find NestJS providers exported by a module but never injected by another module.

![cat-knip logo](/docs/cat-knip-logo.png 'cat-knip logo')

## Install

```sh
pnpm add -D cat-knip
```

## Use

```ts
import {
  expectNoUnusedExports,
  getModuleRefWithSnapshot,
} from 'cat-knip/testing';
import { AppModule } from '../src/app.module';

it('has no unused module exports', async () => {
  await using moduleRef = await getModuleRefWithSnapshot({
    imports: [AppModule],
  });

  expectNoUnusedExports(moduleRef);
});
```

`getModuleRefWithSnapshot` compiles with `snapshot: true` and closes the module when the `await using` scope exits. `await using` requires TypeScript 5.2 or newer.

When the assertion fails, it prints one unused export per line without internal graph node IDs:

```text
cat-knip found 2 unused module exports:

- AuthModule => AUTH_CLIENT
- SharedModule => SharedService
```

When creating a testing module directly, `snapshot: true` must be passed to `compile()`.

## Ignoring exports

Use the `ignore` option with `getUnusedExports`, `expectNoUnusedExports`, or `analyzeModule` to exclude exports that cat-knip should not report:

```ts
getUnusedExports(moduleRef, {
  ignore: {
    modules: ['ThirdPartyModule'],
    tokens: ['SharedService'],
    exactMatches: ['AuthModule:AUTH_CLIENT'],
  },
});
```

- `modules` ignores every export owned by a named module. Use it when an entire dependency module is outside your control.
- `tokens` ignores a token regardless of which module owns it. Use it for an intentional public token that may be exported by multiple modules.
- `exactMatches` ignores only a specific `ModuleName:token` pair. Use it when a dependency module has particular exports you do not own, without suppressing its other findings.

For example, Nest dependencies can add exported providers to the runtime graph. Ignore those dependency-owned exports while continuing to check first-party exports:

```ts
expectNoUnusedExports(moduleRef, {
  ignore: {
    modules: ['ClsCommonModule', 'ClsRootModule', 'WinstonModule'],
    exactMatches: ['ConfigModule:CONFIGURATION(app)'],
  },
});
```

Requires Node.js 20.5 or newer and NestJS 10 or 11. cat-knip analyzes the runtime DI graph; it has no CLI and does not parse source files.

Contributions are welcome; see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Why "cat-knip"?

NestJS's logo is a cat, and there's a unused code detection tool called ["knip"](https://knip.dev/). The #dad-joke was right there, I couldn't help myself.
