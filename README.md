# cat-knip

[![CI](https://github.com/TheCoreMan/cat-knip/actions/workflows/ci.yml/badge.svg)](https://github.com/TheCoreMan/cat-knip/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/cat-knip)](https://www.npmjs.com/package/cat-knip)
[![license](https://img.shields.io/npm/l/cat-knip)](./LICENSE)

Find NestJS providers exported by a module but never injected by another module.

## Install

```sh
pnpm add -D cat-knip
```

## Use

```ts
import { Test } from '@nestjs/testing';
import { getUnusedExports } from 'cat-knip/testing';
import { AppModule } from '../src/app.module';

it('has no unused module exports', async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile({ snapshot: true });

  const findings = getUnusedExports(moduleRef);
  await moduleRef.close();

  expect(findings).toEqual([]);
});
```

`snapshot: true` must be passed to `compile()`. To keep intentional exports:

```ts
getUnusedExports(moduleRef, {
  ignore: ['SharedService', { module: 'AuthModule', token: 'AUTH_CLIENT' }],
});
```

Requires NestJS 10 or 11. cat-knip analyzes the runtime DI graph; it has no CLI and does not parse source files.

Contributions are welcome; see [CONTRIBUTING.md](./CONTRIBUTING.md).
