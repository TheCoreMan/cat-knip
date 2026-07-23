import type { INestApplication, ModuleMetadata, Type } from '@nestjs/common';
import { SerializedGraph } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';

import { detectUnusedExports } from './detect-unused-exports';
import type { SerializedGraphJson, UnusedExportFinding } from './types';

export type GraphSource =
  SerializedGraphJson | TestingModule | INestApplication;

export interface CatKnipIgnoreOptions {
  /** Ignore every export owned by any of these modules. */
  modules?: ReadonlyArray<string>;
  /** Ignore these provider tokens regardless of their owning module. */
  tokens?: ReadonlyArray<string>;
  /** Ignore exact `ModuleName:token` pairs. */
  exactMatches?: ReadonlyArray<string>;
}

export interface CatKnipOptions {
  /**
   * Exclude intentional or dependency-owned exports from findings.
   * @example Ignore specific exports owned by third-party dependencies.
   * ```ts
   * const dependencyOwnedExports = [
   *   'ClsCommonModule:Symbol(CLS_CTX)',
   *   'ClsCommonModule:Symbol(CLS_REQ)',
   *   'ClsCommonModule:Symbol(CLS_RES)',
   *   'ClsRootModule:ClsGuardOptions',
   *   'ClsRootModule:ClsInterceptorOptions',
   *   'ClsRootModule:ClsMiddlewareOptions',
   *   'ConfigModule:CONFIGURATION(app)',
   *   'PrometheusModule:Symbol(PROMETHEUS_OPTIONS)',
   *   'ScheduleModule:SchedulerRegistry',
   *   'WinstonModule:NestWinston',
   *   'WinstonModule:winston',
   * ];
   *
   * getUnusedExports(moduleRef, {
   *   ignore: { exactMatches: dependencyOwnedExports },
   * });
   * ```
   */
  ignore?: Readonly<CatKnipIgnoreOptions>;
}

function isSerializedGraph(source: GraphSource): source is SerializedGraphJson {
  return 'nodes' in source && 'edges' in source;
}

function assertSnapshotEnabled(graph: SerializedGraphJson): void {
  if (Object.keys(graph.nodes).length === 0) {
    throw new Error(
      'cat-knip: dependency graph is empty. ' +
        'Compile the TestingModule with `.compile({ snapshot: true })` ' +
        '(not `createNestApplication({ snapshot: true })`).',
    );
  }
}

function toGraph(source: GraphSource): SerializedGraphJson {
  const graph = isSerializedGraph(source)
    ? source
    : (source.get(SerializedGraph).toJSON() as SerializedGraphJson);
  assertSnapshotEnabled(graph);
  return graph;
}

function isIgnored(
  finding: UnusedExportFinding,
  rules: CatKnipIgnoreOptions | undefined,
): boolean {
  return Boolean(
    rules?.modules?.includes(finding.module) ||
    rules?.tokens?.includes(finding.token) ||
    rules?.exactMatches?.includes(`${finding.module}:${finding.token}`),
  );
}

/**
 * Read a Nest graph source and return its unused module exports.
 * @param source - A serialized graph, testing module, or Nest application.
 * @param options - Optional rules for intentional exports.
 */
export function getUnusedExports(
  source: GraphSource,
  options: CatKnipOptions = {},
): UnusedExportFinding[] {
  return detectUnusedExports(toGraph(source)).filter(
    (finding) => !isIgnored(finding, options.ignore),
  );
}

/**
 * Compile a Nest testing module with snapshots and close it on async disposal.
 * @param metadata - Testing module metadata.
 */
export async function getModuleRefWithSnapshot(
  metadata: ModuleMetadata,
): Promise<TestingModule & AsyncDisposable> {
  const moduleReference = await Test.createTestingModule(metadata).compile({
    snapshot: true,
  });

  return Object.defineProperty(moduleReference, Symbol.asyncDispose, {
    value: () => moduleReference.close(),
  }) as TestingModule & AsyncDisposable;
}

/**
 * Assert that a compiled Nest testing module has no unused exports.
 * @param moduleRef - A testing module compiled with snapshots enabled.
 * @param options - Optional rules for intentional or dependency-owned exports.
 */
export function expectNoUnusedExports(
  moduleRef: TestingModule,
  options: CatKnipOptions = {},
): void {
  const findings = getUnusedExports(moduleRef, options);

  if (findings.length === 0) return;

  const details = findings
    .map(({ module, token }) => `- ${module}: ${String(token)}`)
    .sort()
    .join('\n');

  throw new Error(
    `cat-knip found ${findings.length} unused module exports:\n\n${details}`,
  );
}

/**
 * Compile, analyze, and close a Nest testing module.
 * @param root - A root module or testing module metadata.
 * @param options - Optional rules for intentional exports.
 */
export async function analyzeModule(
  root: Type<unknown> | ModuleMetadata,
  options: CatKnipOptions = {},
): Promise<UnusedExportFinding[]> {
  const metadata: ModuleMetadata =
    typeof root === 'function' ? { imports: [root] } : root;
  const moduleReference = await Test.createTestingModule(metadata).compile({
    snapshot: true,
  });

  try {
    return getUnusedExports(moduleReference, options);
  } finally {
    await moduleReference.close();
  }
}
