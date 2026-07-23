/** The subset of Nest's serialized graph used by cat-knip. */
export interface SerializedGraphJson {
  edges: Record<string, SerializedGraphEdge>;
  nodes: Record<string, SerializedGraphNode>;
}

export interface SerializedGraphEdge {
  metadata: {
    internal?: boolean;
    sourceModuleName?: string;
    targetModuleName?: string;
    type?: string;
    [key: string]: unknown;
  };
  source: string;
  target: string;
}

export interface SerializedGraphNode {
  id?: string;
  label?: string;
  /** ID of the module node that owns this provider or consumer. */
  parent?: string;
  metadata?: {
    exported?: boolean;
    internal?: boolean;
    sourceModuleName?: string;
    type?: string;
    [key: string]: unknown;
  };
}

export interface UnusedExportFinding {
  /** Module whose exports array contains the redundant entry. */
  module: string;
  /** Graph node ID, useful when debugging duplicate provider registrations. */
  nodeId: string;
  /** Human-readable provider token or class name. */
  token: string;
}
