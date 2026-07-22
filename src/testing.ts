import type { INestApplication, ModuleMetadata, Type } from '@nestjs/common';
import { SerializedGraph } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';

import { detectUnusedExports } from './detect-unused-exports';
import type { SerializedGraphJson, UnusedExportFinding } from './types';

export type GraphSource =
  SerializedGraphJson | TestingModule | INestApplication;

export interface CatKnipOptions {
  ignore?: ReadonlyArray<string | Readonly<{ module: string; token: string }>>;
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
  rules: CatKnipOptions['ignore'],
): boolean {
  return (rules ?? []).some((rule) =>
    typeof rule === 'string'
      ? rule === finding.token
      : rule.module === finding.module && rule.token === finding.token,
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
