import {
  detectUnusedExports,
  type SerializedGraphJson,
  type SerializedGraphNode,
} from '../src';

function provider(
  label: string,
  metadata: SerializedGraphNode['metadata'] = {},
): SerializedGraphNode {
  return {
    label,
    metadata: {
      exported: true,
      sourceModuleName: 'CatModule',
      type: 'provider',
      ...metadata,
    },
  };
}

describe('detectUnusedExports', () => {
  it('uses node IDs to match cross-module consumption', () => {
    const graph: SerializedGraphJson = {
      edges: {
        consumed: {
          metadata: {
            sourceModuleName: 'ShelterModule',
            targetModuleName: 'CatModule',
            type: 'class-to-class',
          },
          source: 'consumer',
          target: 'first',
        },
      },
      nodes: {
        first: provider('SharedService'),
        second: provider('SharedService', { sourceModuleName: 'OtherModule' }),
      },
    };

    expect(detectUnusedExports(graph)).toEqual([
      { module: 'OtherModule', nodeId: 'second', token: 'SharedService' },
    ]);
  });

  it('does not count same-module or internal edges as consumption', () => {
    const graph: SerializedGraphJson = {
      edges: {
        internal: {
          metadata: {
            internal: true,
            sourceModuleName: 'OtherModule',
            targetModuleName: 'CatModule',
            type: 'class-to-class',
          },
          source: 'internal-consumer',
          target: 'cat',
        },
        local: {
          metadata: {
            sourceModuleName: 'CatModule',
            targetModuleName: 'CatModule',
            type: 'class-to-class',
          },
          source: 'local-consumer',
          target: 'cat',
        },
      },
      nodes: { cat: provider('CatService') },
    };

    expect(detectUnusedExports(graph)).toHaveLength(1);
  });

  it('uses parent IDs when dynamic module instances share a name', () => {
    const graph: SerializedGraphJson = {
      edges: {
        consumed: {
          metadata: {
            sourceModuleName: 'DynamicCatModule',
            targetModuleName: 'DynamicCatModule',
            type: 'class-to-class',
          },
          source: 'consumer',
          target: 'cat',
        },
      },
      nodes: {
        cat: { ...provider('CAT'), parent: 'first-instance' },
        consumer: { parent: 'second-instance' },
      },
    };

    expect(detectUnusedExports(graph)).toEqual([]);
  });

  it('skips unrelated, internal, and non-exported nodes and edges', () => {
    const graph: SerializedGraphJson = {
      edges: {
        module: {
          metadata: { type: 'module-to-module' },
          source: 'one',
          target: 'two',
        },
      },
      nodes: {
        controller: provider('Controller', { type: 'controller' }),
        internal: provider('Internal', { internal: true }),
        private: provider('Private', { exported: false }),
      },
    };

    expect(detectUnusedExports(graph)).toEqual([]);
  });

  it('falls back to readable placeholders for incomplete graph metadata', () => {
    const graph: SerializedGraphJson = {
      edges: {},
      nodes: {
        fallback: {
          metadata: { exported: true, type: 'provider' },
        },
      },
    };

    expect(detectUnusedExports(graph)).toEqual([
      {
        module: '<unknown module>',
        nodeId: 'fallback',
        token: 'fallback',
      },
    ]);
  });
});
