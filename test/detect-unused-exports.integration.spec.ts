import { detectUnusedExports } from '../src';
import {
  ConsumedExportModule,
  DynamicModuleInstancesModule,
  EnhancerModule,
  GlobalConsumedModule,
  OrphanExportModule,
  PropertyInjectModule,
  RedundantExportModule,
  RedundantTokenModule,
  ReExportModule,
} from './fixtures';
import { graphOf } from './support/graph-of';

describe('detectUnusedExports with Nest graphs', () => {
  it('reports a provider exported but used only inside its module', async () => {
    const findings = detectUnusedExports(await graphOf(RedundantExportModule));

    expect(findings).toContainEqual(
      expect.objectContaining({
        module: 'GroomingModule',
        token: 'WhiskerService',
      }),
    );
    expect(findings.map(({ token }) => token)).not.toContain('GroomingService');
  });

  it('reports an unused string token', async () => {
    const findings = detectUnusedExports(await graphOf(RedundantTokenModule));

    expect(findings.map(({ token }) => token)).toContain('PURR_CLIENT');
  });

  it('reports a provider injected by nothing', async () => {
    const findings = detectUnusedExports(await graphOf(OrphanExportModule));

    expect(findings).toEqual([
      expect.objectContaining({ token: 'StrayCatService' }),
    ]);
  });

  it.each([
    ['constructor injection', ConsumedExportModule, 'ConsumedService'],
    ['property injection', PropertyInjectModule, 'ConsumedService'],
    ['global module injection', GlobalConsumedModule, 'LitterService'],
  ] as const)(
    'keeps an export used through %s',
    async (_case, module, token) => {
      const findings = detectUnusedExports(await graphOf(module));

      expect(findings.map((finding) => finding.token)).not.toContain(token);
    },
  );

  it.each([
    ['module re-exports', ReExportModule],
    ['global enhancers', EnhancerModule],
  ] as const)(
    'does not mistake %s for unused provider exports',
    async (_case, module) => {
      expect(detectUnusedExports(await graphOf(module))).toEqual([]);
    },
  );

  it('never reports internal Nest providers', async () => {
    const findings = detectUnusedExports(await graphOf(ConsumedExportModule));

    expect(findings.map(({ token }) => token)).toEqual(
      expect.not.arrayContaining([
        'HttpAdapterHost',
        'ModulesContainer',
        'Reflector',
        'SerializedGraph',
      ]),
    );
  });

  it('distinguishes separate instances of the same dynamic module', async () => {
    const findings = detectUnusedExports(
      await graphOf(DynamicModuleInstancesModule),
    );

    expect(findings).toContainEqual(
      expect.objectContaining({ token: 'CAT_B' }),
    );
    expect(findings).not.toContainEqual(
      expect.objectContaining({ token: 'CAT_A' }),
    );
  });
});
