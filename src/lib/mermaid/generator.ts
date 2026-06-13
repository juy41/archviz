/**
 * Diagram IR → Mermaid flowchart source.
 *
 * Pure and deterministic: given a {@link Diagram} it returns the exact same
 * Mermaid string every time, which is what makes it easy to unit-test and what
 * lets the "Copy as Mermaid" button hand the user a ready-to-paste block.
 *
 * Node colours use a fixed pastel palette with dark text. Light pastel fills +
 * dark labels stay legible on BOTH the light and dark Mermaid canvases, so the
 * same generated source renders cleanly under either theme.
 */
import type { Diagram, DiagramEdge, DiagramNode, NodeType } from '../types';

/** classDef styling per node type — pastel fill, saturated stroke, dark text. */
const CLASS_DEFS: Record<NodeType, string> = {
  service: 'fill:#dbeafe,stroke:#3b82f6,stroke-width:1px,color:#1e3a8a',
  database: 'fill:#dcfce7,stroke:#22c55e,stroke-width:1px,color:#14532d',
  queue: 'fill:#fef3c7,stroke:#f59e0b,stroke-width:1px,color:#78350f',
  cache: 'fill:#f3e8ff,stroke:#a855f7,stroke-width:1px,color:#581c87',
  external: 'fill:#e2e8f0,stroke:#64748b,stroke-width:1px,color:#1e293b',
  default: 'fill:#f1f5f9,stroke:#94a3b8,stroke-width:1px,color:#0f172a',
};

/**
 * Escape a label for safe inclusion in Mermaid source.
 *
 * SECURITY: Mermaid is configured with `securityLevel: 'strict'` (see
 * lib/mermaid/render.ts), which HTML-escapes label text. We additionally
 * neutralise the characters that carry meaning to the Mermaid parser, using
 * Mermaid's own `#...;` entity encoding, so a malicious label can neither break
 * out of the quoted string nor inject markup.
 */
function escapeLabel(label: string): string {
  return label
    .replace(/[\r\n]+/g, ' ')
    .replace(/"/g, '#quot;')
    .replace(/</g, '#lt;')
    .replace(/>/g, '#gt;')
    .trim();
}

/** Render a node's shape declaration, e.g. `db[("Orders DB")]:::database`. */
function nodeShape(node: DiagramNode): string {
  const label = `"${escapeLabel(node.label)}"`;
  const id = node.id;
  let shape: string;
  switch (node.type) {
    case 'database':
      shape = `${id}[(${label})]`; // cylinder
      break;
    case 'queue':
      shape = `${id}[[${label}]]`; // subroutine / pipeline
      break;
    case 'cache':
      shape = `${id}([${label}])`; // stadium
      break;
    case 'external':
      shape = `${id}{{${label}}}`; // hexagon
      break;
    case 'service':
    case 'default':
    default:
      shape = `${id}[${label}]`; // rectangle
      break;
  }
  return `${shape}:::${node.type}`;
}

/** Render an edge, choosing the arrow syntax + optional label by edge kind. */
function edgeLine(edge: DiagramEdge): string {
  const label = edge.label ? `"${escapeLabel(edge.label)}"` : null;
  switch (edge.kind) {
    case 'dashed':
      // Use the pipe-label form (not the `-. text .->` middle form) so the
      // quotes are stripped consistently with the other edge kinds.
      return label ? `${edge.from} -.->|${label}| ${edge.to}` : `${edge.from} -.-> ${edge.to}`;
    case 'bidirectional':
      return label ? `${edge.from} <-->|${label}| ${edge.to}` : `${edge.from} <--> ${edge.to}`;
    case 'solid':
    default:
      return label ? `${edge.from} -->|${label}| ${edge.to}` : `${edge.from} --> ${edge.to}`;
  }
}

/**
 * Generate Mermaid `flowchart` source from a diagram.
 *
 * Layout of the output:
 *   1. `flowchart <dir>`
 *   2. nested `subgraph` blocks containing their member node shapes
 *   3. top-level (ungrouped) node shapes
 *   4. edges
 *   5. `classDef` rules for the colour palette
 */
export function generateMermaid(diagram: Diagram): string {
  const lines: string[] = [`flowchart ${diagram.direction}`];

  // Index nodes + groups for quick lookup while we walk the group tree.
  const nodesByGroup = new Map<string | null, DiagramNode[]>();
  for (const node of diagram.nodes) {
    const list = nodesByGroup.get(node.group) ?? [];
    list.push(node);
    nodesByGroup.set(node.group, list);
  }
  const childGroups = new Map<string | null, typeof diagram.groups>();
  for (const group of diagram.groups) {
    const list = childGroups.get(group.parent) ?? [];
    list.push(group);
    childGroups.set(group.parent, list);
  }

  const emitGroup = (groupId: string, indent: string): void => {
    const group = diagram.groups.find((g) => g.id === groupId);
    if (!group) return;
    lines.push(`${indent}subgraph ${group.id}["${escapeLabel(group.label)}"]`);
    for (const node of nodesByGroup.get(group.id) ?? []) {
      lines.push(`${indent}  ${nodeShape(node)}`);
    }
    for (const child of childGroups.get(group.id) ?? []) {
      emitGroup(child.id, `${indent}  `);
    }
    lines.push(`${indent}end`);
  };

  // Top-level groups (and, recursively, their nodes + nested groups).
  for (const group of childGroups.get(null) ?? []) {
    emitGroup(group.id, '  ');
  }

  // Ungrouped nodes.
  for (const node of nodesByGroup.get(null) ?? []) {
    lines.push(`  ${nodeShape(node)}`);
  }

  // Edges.
  for (const edge of diagram.edges) {
    lines.push(`  ${edgeLine(edge)}`);
  }

  // Colour palette. Only emit classDefs for types actually in use to keep the
  // generated source tidy.
  const usedTypes = new Set<NodeType>(diagram.nodes.map((n) => n.type));
  for (const type of usedTypes) {
    lines.push(`  classDef ${type} ${CLASS_DEFS[type]};`);
  }

  return lines.join('\n');
}
