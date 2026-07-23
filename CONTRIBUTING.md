# Contributing

Issues and pull requests are welcome.

1. Use Node from `.nvmrc` and enable Corepack.
2. Run `pnpm install`.
3. Install [`prek`](https://prek.j178.dev/installation/) and run `prek install`
   to enable the pre-commit hooks.
4. Add tests for behavior changes.
5. Run `prek run --all-files` and `pnpm run ci` before opening a pull request.

Keep changes small, focused, and compatible with NestJS 10 and 11.
