/**
 * ArchViz DSL parser.
 *
 * A small, forgiving, line-oriented parser that turns the text DSL into the
 * strongly-typed {@link Diagram} IR. It never throws: every problem is collected
 * as a {@link ParseError} with a 1-based line/column, and any line that parses
 * cleanly still contributes to the diagram. This is what lets the live preview
 * keep rendering while the user is in the middle of typing an invalid line.
 *
 * Grammar (one statement per line):
 *
 *   comment    := ('#' | '//') ...
 *   direction  := 'direction' WS ('TD'|'TB'|'LR'|'RL'|'BT')
 *   groupOpen  := 'group' WS ref WS? '{'
 *   groupClose := '}'
 *   edge       := ref WS? op WS? ref ( (':' | '|') label )?
 *   op         := '<->' | '-->' | '->'
 *   nodeDecl   := id ( '[' type ']' )? ( '"' label '"' )?
 *   ref        := id | '"' label '"'
 *   id         := [A-Za-z_][A-Za-z0-9_]*
 */
import {
  DIRECTIONS,
  NODE_TYPES,
  type Diagram,
  type DiagramEdge,
  type DiagramGroup,
  type DiagramNode,
  type Direction,
  type EdgeKind,
  type NodeType,
  type ParseError,
  type ParseResult,
} from '../types';

const VALID_TYPES = new Set<string>(NODE_TYPES);
const VALID_DIRECTIONS = new Set<string>(DIRECTIONS);

// A reference is either a bare identifier or a double-quoted string.
const REF = String.raw`(?:"[^"]*"|[A-Za-z_][A-Za-z0-9_]*)`;

// Operators must be matched longest-first so `-->` is not read as `->`.
const EDGE_RE = new RegExp(
  String.raw`^(${REF})\s*(<->|-->|->)\s*(${REF})\s*(?:[:|]\s*(.+?))?\s*$`,
);
const OP_PRESENT_RE = /(<->|-->|->)/;
const NODE_DECL_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s*(?:\[\s*([A-Za-z]+)\s*\])?\s*(?:"([^"]*)")?\s*$/;
const GROUP_OPEN_RE = new RegExp(String.raw`^group\s+(${REF})\s*\{\s*$`);
const GROUP_CLOSE_RE = /^\}\s*$/;
const DIRECTION_RE = /^direction\s+([A-Za-z]+)\s*$/i;

/** Strip the surrounding quotes from a quoted ref; pass identifiers through. */
function refName(token: string): string {
  return token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1) : token;
}

/** Turn an arbitrary label into a Mermaid-safe identifier. */
function slugify(name: string): string {
  let id = name.replace(/[^A-Za-z0-9_]/g, '_');
  if (id === '' || id.replace(/_/g, '') === '') id = 'node';
  if (/^[0-9]/.test(id)) id = `n_${id}`;
  return id;
}

interface OpenGroup {
  id: string;
  line: number;
}

const OP_KIND: Record<string, EdgeKind> = {
  '->': 'solid',
  '-->': 'dashed',
  '<->': 'bidirectional',
};

/**
 * Parse DSL source into a {@link ParseResult}.
 *
 * The input is treated as fully untrusted text. The parser only ever reads it —
 * it is never evaluated, executed, or interpolated into the DOM.
 */
export function parse(source: string): ParseResult {
  const errors: ParseError[] = [];
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const groups: DiagramGroup[] = [];

  const nodesByRef = new Map<string, DiagramNode>();
  const groupsById = new Map<string, DiagramGroup>();
  const usedIds = new Set<string>();
  const groupStack: OpenGroup[] = [];

  let direction: Direction = 'TD';
  let edgeSeq = 0;

  const currentGroup = (): string | null =>
    groupStack.length > 0 ? groupStack[groupStack.length - 1].id : null;

  const uniqueId = (base: string): string => {
    let id = base;
    let i = 2;
    while (usedIds.has(id)) id = `${base}_${i++}`;
    usedIds.add(id);
    return id;
  };

  /** Look up a node by its reference text, creating it on first sight. */
  const ensureNode = (ref: string): DiagramNode => {
    const existing = nodesByRef.get(ref);
    if (existing) return existing;
    const node: DiagramNode = {
      id: uniqueId(slugify(ref)),
      label: ref,
      type: 'default',
      group: currentGroup(),
    };
    nodesByRef.set(ref, node);
    nodes.push(node);
    return node;
  };

  const addError = (line: number, column: number, message: string): void => {
    errors.push({ line, column, message });
  };

  const rawLines = source.split(/\r?\n/);

  rawLines.forEach((raw, index) => {
    const lineNo = index + 1;
    const line = raw.trim();
    const column = raw.length - raw.trimStart().length + 1;

    // 1. Blank lines and comments are ignored.
    if (line === '' || line.startsWith('#') || line.startsWith('//')) return;

    // 2. Group close.
    if (GROUP_CLOSE_RE.test(line)) {
      if (groupStack.length === 0) {
        addError(lineNo, column, "Unexpected '}' — no group is open here.");
      } else {
        groupStack.pop();
      }
      return;
    }

    // 3. Group open.
    const groupOpen = GROUP_OPEN_RE.exec(line);
    if (groupOpen) {
      const name = refName(groupOpen[1]);
      const id = uniqueId(slugify(`group_${name}`));
      const group: DiagramGroup = { id, label: name, parent: currentGroup() };
      groups.push(group);
      groupsById.set(id, group);
      groupStack.push({ id, line: lineNo });
      return;
    }

    // 4. Direction directive.
    if (/^direction\b/i.test(line)) {
      const dir = DIRECTION_RE.exec(line);
      if (!dir) {
        addError(lineNo, column, "Invalid 'direction'. Use: direction TD|TB|LR|RL|BT.");
        return;
      }
      const value = dir[1].toUpperCase();
      if (!VALID_DIRECTIONS.has(value)) {
        addError(
          lineNo,
          column,
          `Unknown direction "${dir[1]}". Valid values: ${DIRECTIONS.join(', ')}.`,
        );
        return;
      }
      direction = value as Direction;
      return;
    }

    // 5. Edge — any line containing a connection operator is treated as an edge,
    //    so we can report a precise error when the syntax is almost-but-not-quite.
    if (OP_PRESENT_RE.test(line)) {
      const edge = EDGE_RE.exec(line);
      if (!edge) {
        addError(
          lineNo,
          column,
          'Malformed connection. Expected: A -> B  (optionally  : label).',
        );
        return;
      }
      const [, fromTok, op, toTok, label] = edge;
      const from = ensureNode(refName(fromTok));
      const to = ensureNode(refName(toTok));
      const e: DiagramEdge = {
        id: `edge_${edgeSeq++}`,
        from: from.id,
        to: to.id,
        kind: OP_KIND[op] ?? 'solid',
        label: label ? label.trim() : null,
      };
      edges.push(e);
      return;
    }

    // 6. Node declaration (with optional [type] and "label").
    const decl = NODE_DECL_RE.exec(line);
    if (decl) {
      const [, name, type, label] = decl;
      const node = ensureNode(name);
      if (type !== undefined) {
        if (VALID_TYPES.has(type)) {
          node.type = type as NodeType;
        } else {
          addError(
            lineNo,
            column,
            `Unknown node type "${type}". Valid types: ${NODE_TYPES.filter((t) => t !== 'default').join(', ')}.`,
          );
        }
      }
      if (label !== undefined && label !== '') node.label = label;
      return;
    }

    // 7. Nothing matched.
    addError(
      lineNo,
      column,
      `Unrecognized syntax: "${line}". Expected a node, a connection (A -> B), a group, or a directive.`,
    );
  });

  // Any group left open at EOF is reported at the line where it was opened.
  for (const open of groupStack) {
    addError(open.line, 1, "Unclosed group — add a matching '}'.");
  }

  const diagram: Diagram = { direction, nodes, edges, groups };
  return { diagram, errors };
}
