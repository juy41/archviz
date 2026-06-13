/**
 * Internal representation (IR) of an architecture diagram.
 *
 * The DSL parser produces this structure; the Mermaid and PlantUML generators
 * consume it. Keeping a single, strongly-typed IR in the middle means the
 * parser and the generators never need to know about each other.
 */

/** The kind of component a node represents. Drives shape + colour. */
export type NodeType = 'service' | 'database' | 'queue' | 'external' | 'cache' | 'default';

/** Connection style between two nodes. */
export type EdgeKind = 'solid' | 'dashed' | 'bidirectional';

/** Layout direction of the whole diagram. */
export type Direction = 'TD' | 'TB' | 'LR' | 'RL' | 'BT';

/** The set of node types the DSL understands. */
export const NODE_TYPES: readonly NodeType[] = [
  'service',
  'database',
  'queue',
  'external',
  'cache',
  'default',
] as const;

/** The set of layout directions the DSL understands. */
export const DIRECTIONS: readonly Direction[] = ['TD', 'TB', 'LR', 'RL', 'BT'] as const;

export interface DiagramNode {
  /** Mermaid-safe identifier (matches /^[A-Za-z_][A-Za-z0-9_]*$/), unique per diagram. */
  id: string;
  /** Human-readable label shown inside the node. */
  label: string;
  type: NodeType;
  /** Id of the enclosing group, or null when the node lives at the top level. */
  group: string | null;
}

export interface DiagramEdge {
  id: string;
  /** Source node id (references DiagramNode.id). */
  from: string;
  /** Target node id (references DiagramNode.id). */
  to: string;
  kind: EdgeKind;
  /** Optional label rendered on the connection. */
  label: string | null;
}

export interface DiagramGroup {
  id: string;
  label: string;
  /** Id of the parent group for nesting, or null at the top level. */
  parent: string | null;
}

export interface Diagram {
  direction: Direction;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
}

/** A single, human-readable parse problem tied to a source location. */
export interface ParseError {
  /** 1-based line number in the source. */
  line: number;
  /** 1-based column number where the problem starts. */
  column: number;
  message: string;
}

/**
 * Result of parsing DSL source. `diagram` always contains every element that
 * parsed successfully (bad lines are skipped, not fatal), so the live preview
 * can keep rendering while the user is mid-edit. `errors` lists every problem.
 */
export interface ParseResult {
  diagram: Diagram;
  errors: ParseError[];
}
