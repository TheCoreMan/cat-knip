import { Test } from '@nestjs/testing';

import {
  analyzeModule,
  expectNoUnusedExports,
  getModuleRefWithSnapshot,
  getUnusedExports,
} from '../src/testing';
import type { SerializedGraphJson } from '../src/types';
import {
  ConsumedExportModule,
  OrphanExportModule,
  RedundantExportModule,
  RedundantTokenModule,
} from './fixtures';

describe('getUnusedExports', () => {
  it('reads a compiled testing module and applies an exact match', async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [RedundantExportModule],
    }).compile({ snapshot: true });

    try {
      expect(
        getUnusedExports(moduleReference, {
          ignore: {
            exactMatches: ['GroomingModule:WhiskerService'],
          },
        }).map(({ token }) => token),
      ).not.toContain('WhiskerService');
    } finally {
      await moduleReference.close();
    }
  });

  it('accepts a raw serialized graph', () => {
    const graph: SerializedGraphJson = {
      edges: {},
      nodes: {
        cat: {
          label: 'CatService',
          metadata: {
            exported: true,
            sourceModuleName: 'CatModule',
            type: 'provider',
          },
        },
      },
    };

    expect(getUnusedExports(graph)).toEqual([
      { module: 'CatModule', nodeId: 'cat', token: 'CatService' },
    ]);
  });

  it('applies module, token, and exact-match ignores independently', () => {
    const graph: SerializedGraphJson = {
      edges: {},
      nodes: {
        first: {
          label: 'SharedService',
          metadata: {
            exported: true,
            sourceModuleName: 'FirstModule',
            type: 'provider',
          },
        },
        second: {
          label: 'SharedService',
          metadata: {
            exported: true,
            sourceModuleName: 'SecondModule',
            type: 'provider',
          },
        },
        third: {
          label: 'OtherService',
          metadata: {
            exported: true,
            sourceModuleName: 'SecondModule',
            type: 'provider',
          },
        },
      },
    };

    expect(
      getUnusedExports(graph, {
        ignore: { modules: ['FirstModule'] },
      }),
    ).toEqual([
      expect.objectContaining({
        module: 'SecondModule',
        token: 'SharedService',
      }),
      expect.objectContaining({
        module: 'SecondModule',
        token: 'OtherService',
      }),
    ]);
    expect(
      getUnusedExports(graph, { ignore: { tokens: ['SharedService'] } }),
    ).toEqual([
      expect.objectContaining({
        module: 'SecondModule',
        token: 'OtherService',
      }),
    ]);
    expect(
      getUnusedExports(graph, {
        ignore: { exactMatches: ['FirstModule:SharedService'] },
      }),
    ).toEqual([
      expect.objectContaining({
        module: 'SecondModule',
        token: 'SharedService',
      }),
      expect.objectContaining({
        module: 'SecondModule',
        token: 'OtherService',
      }),
    ]);
  });

  it('rejects a real testing module compiled without snapshots', async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [RedundantExportModule],
    }).compile();

    try {
      expect(() => getUnusedExports(moduleReference)).toThrow(
        'Compile the TestingModule with `.compile({ snapshot: true })`',
      );
    } finally {
      await moduleReference.close();
    }
  });

  it('rejects an empty raw graph', () => {
    expect(() => getUnusedExports({ edges: {}, nodes: {} })).toThrow(
      'dependency graph is empty',
    );
  });

  it('compiles and closes a root module', async () => {
    const findings = await analyzeModule(RedundantExportModule);

    expect(findings).toContainEqual(
      expect.objectContaining({ token: 'WhiskerService' }),
    );
  });

  it('accepts module metadata and ignore rules', async () => {
    const findings = await analyzeModule(
      { imports: [RedundantExportModule] },
      { ignore: { tokens: ['WhiskerService'] } },
    );

    expect(findings.map(({ token }) => token)).not.toContain('WhiskerService');
  });

  it('analyzes a valid graph without injection edges', async () => {
    await expect(analyzeModule(OrphanExportModule)).resolves.toEqual([
      expect.objectContaining({ token: 'StrayCatService' }),
    ]);
  });
});

describe('expectNoUnusedExports', () => {
  it('does not throw when every export is consumed', async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [ConsumedExportModule],
    }).compile({ snapshot: true });

    try {
      expect(() => expectNoUnusedExports(moduleReference)).not.toThrow();
    } finally {
      await moduleReference.close();
    }
  });

  it('applies ignore options before asserting', async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [OrphanExportModule],
    }).compile({ snapshot: true });

    try {
      expect(() =>
        expectNoUnusedExports(moduleReference, {
          ignore: { modules: ['OrphanExportModule'] },
        }),
      ).not.toThrow();
    } finally {
      await moduleReference.close();
    }
  });

  it('prints sorted findings without node IDs', async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [RedundantTokenModule, OrphanExportModule],
    }).compile({ snapshot: true });
    const findings = getUnusedExports(moduleReference);

    try {
      let error: Error | undefined;
      try {
        expectNoUnusedExports(moduleReference);
      } catch (cause) {
        if (!(cause instanceof Error)) throw cause;
        error = cause;
      }

      expect(error?.message).toBe(
        'cat-knip found 2 unused module exports:\n\n' +
          '- OrphanExportModule => StrayCatService\n' +
          '- RedundantTokenModule => PURR_CLIENT',
      );

      for (const { nodeId } of findings) {
        expect(error?.message).not.toContain(nodeId);
      }
    } finally {
      await moduleReference.close();
    }
  });
});

describe('getModuleRefWithSnapshot', () => {
  it('enables snapshots and closes the module on async disposal', async () => {
    let wasClosed = false;

    {
      await using moduleReference = await getModuleRefWithSnapshot({
        imports: [ConsumedExportModule],
      });
      const close = moduleReference.close.bind(moduleReference);
      moduleReference.close = async () => {
        wasClosed = true;
        await close();
      };

      expect(() => expectNoUnusedExports(moduleReference)).not.toThrow();
    }

    expect(wasClosed).toBe(true);
  });
});
