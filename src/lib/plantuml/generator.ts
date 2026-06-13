/**
 * Diagram IR → PlantUML component-diagram source.
 *
 * Powers the "Copy as PlantUML" button. Like the Mermaid generator this is pure
 * and deterministic. Node types map onto PlantUML's built-in component shapes.
 */
import type { Diagram, DiagramEdge, DiagramGroup, DiagramNode, NodeType } from '../types';

/** PlantUML keyword used to declare each node type. */
const PUML_KEYWORD: Record<NodeType, string> = {
  service: 'component',
  database: 'database',
  queue: 'queue',
  cache: 'collections',
  external: 'cloud',
  default: 'rectangle',
};

const DIRECTION_HINT: Record<Diagram['direction'], string> = {
  LR: 'left to right direction',
  RL: 'left to right direction',
  TD: 'top to bottom direction',
  TB: 'top to bottom direction',
  BT: 'top to bottom direction',
};

/** Escape a label so it is safe inside a PlantUML double-quoted string. */
function escapeLabel(label: string): string {
  return label.replace(/[\r\n]+/g, ' ').replace(/"/g, '\\"');
}

function nodeLine(node: DiagramNode): string {
  return `${PUML_KEYWORD[node.type]} "${escapeLabel(node.label)}" as ${node.id}`;
}

function edgeLine(edge: DiagramEdge): string {
  const arrow = edge.kind === 'dashed' ? '..>' : edge.kind === 'bidirectional' ? '<-->' : '-->';
  const label = edge.label ? ` : ${escapeLabel(edge.label)}` : '';
  return `${edge.from} ${arrow} ${edge.to}${label}`;
}

export function generatePlantUml(diagram: Diagram): string {
  const lines: string[] = ['@startuml', DIRECTION_HINT[diagram.direction], 'skinparam shadowing false'];

  const nodesByGroup = new Map<string | null, DiagramNode[]>();
  for (const node of diagram.nodes) {
    const list = nodesByGroup.get(node.group) ?? [];
    list.push(node);
    nodesByGroup.set(node.group, list);
  }
  const childGroups = new Map<string | null, DiagramGroup[]>();
  for (const group of diagram.groups) {
    const list = childGroups.get(group.parent) ?? [];
    list.push(group);
    childGroups.set(group.parent, list);
  }

  const emitGroup = (group: DiagramGroup, indent: string): void => {
    lines.push(`${indent}package "${escapeLabel(group.label)}" {`);
    for (const node of nodesByGroup.get(group.id) ?? []) {
      lines.push(`${indent}  ${nodeLine(node)}`);
    }
    for (const child of childGroups.get(group.id) ?? []) {
      emitGroup(child, `${indent}  `);
    }
    lines.push(`${indent}}`);
  };

  for (const group of childGroups.get(null) ?? []) {
    emitGroup(group, '');
  }
  for (const node of nodesByGroup.get(null) ?? []) {
    lines.push(nodeLine(node));
  }
  for (const edge of diagram.edges) {
    lines.push(edgeLine(edge));
  }

  lines.push('@enduml');
  return lines.join('\n');
}
