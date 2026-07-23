import type { SerializedGraphJson, UnusedExportFinding } from './types';

/**
 * Find exported providers that no class in another module injects.
 * @param graph - A serialized Nest dependency graph.
 */
export function detectUnusedExports(
  graph: SerializedGraphJson,
): UnusedExportFinding[] {
  const consumedAcrossModules = new Set<string>();

  for (const edge of Object.values(graph.edges)) {
    const metadata = edge.metadata;
    if (metadata.type !== 'class-to-class') continue;
    if (metadata.internal === true) continue;

    const sourceModuleId = graph.nodes[edge.source]?.parent;
    const targetModuleId = graph.nodes[edge.target]?.parent;
    const isSameModule =
      sourceModuleId !== undefined && targetModuleId !== undefined
        ? sourceModuleId === targetModuleId
        : metadata.sourceModuleName === metadata.targetModuleName;
    if (isSameModule) continue;

    consumedAcrossModules.add(edge.target);
  }

  const findings: UnusedExportFinding[] = [];
  for (const [nodeId, node] of Object.entries(graph.nodes)) {
    const metadata = node.metadata;
    if (metadata?.type !== 'provider') continue;
    if (metadata.internal === true) continue;
    if (metadata.exported !== true) continue;
    if (consumedAcrossModules.has(nodeId)) continue;

    findings.push({
      module: metadata.sourceModuleName ?? '<unknown module>',
      nodeId,
      token: node.label ?? nodeId,
    });
  }

  return findings;
}
