import { describe, expect, it } from 'vitest';
import { parse } from '../parser/parser';
import type { Diagram } from '../types';
import { generateMermaid } from './generator';

/** Convenience: parse DSL then generate Mermaid in one step. */
function gen(src: string): string {
  return generateMermaid(parse(src).diagram);
}

describe('Mermaid generator', () => {
  it('starts with a flowchart header using the diagram direction', () => {
    expect(gen('direction LR\nA -> B').split('\n')[0]).toBe('flowchart LR');
    expect(gen('A -> B').split('\n')[0]).toBe('flowchart TD');
  });

  it('renders the right shape per node type', () => {
    const out = gen(['s [service]', 'd [database]', 'q [queue]', 'c [cache]', 'x [external]'].join('\n'));
    expect(out).toContain('s["s"]:::service');
    expect(out).toContain('d[("d")]:::database');
    expect(out).toContain('q[["q"]]:::queue');
    expect(out).toContain('c(["c"]):::cache');
    expect(out).toContain('x{{"x"}}:::external');
  });

  it('renders solid, dashed and bidirectional edges', () => {
    expect(gen('A -> B')).toContain('A --> B');
    expect(gen('A --> B')).toContain('A -.-> B');
    expect(gen('A <-> B')).toContain('A <--> B');
  });

  it('renders edge labels with the matching arrow syntax', () => {
    expect(gen('A -> B : call')).toContain('A -->|"call"| B');
    expect(gen('A --> B : async')).toContain('A -.->|"async"| B');
    expect(gen('A <-> B : sync')).toContain('A <-->|"sync"| B');
  });

  it('wraps grouped nodes in a subgraph block', () => {
    const out = gen(['group Backend {', '  API [service]', '}'].join('\n'));
    expect(out).toMatch(/subgraph \w+\["Backend"\]/);
    expect(out).toContain('end');
  });

  it('nests subgraphs for nested groups', () => {
    const out = gen(
      ['group Outer {', '  group Inner {', '    A [service]', '  }', '}'].join('\n'),
    );
    // Two subgraph openers and two matching ends.
    expect(out.match(/subgraph/g)).toHaveLength(2);
    expect(out.match(/^\s*end$/gm)).toHaveLength(2);
  });

  it('escapes angle brackets that arrive via the DSL', () => {
    const out = gen('A [service] "Node <b>"');
    expect(out).toContain('#lt;');
    expect(out).toContain('#gt;');
    expect(out).not.toContain('<b>');
  });

  it('escapes double quotes in labels (defense in depth)', () => {
    // Build the IR directly: the DSL itself can't carry a `"` inside a label,
    // but the generator must still neutralise one if it ever appears.
    const diagram: Diagram = {
      direction: 'TD',
      nodes: [{ id: 'A', label: 'say "hi"', type: 'service', group: null }],
      edges: [],
      groups: [],
    };
    const out = generateMermaid(diagram);
    expect(out).toContain('#quot;');
    expect(out).not.toContain('"hi"');
  });

  it('only emits classDefs for node types actually used', () => {
    const out = gen('A [service] -> B [database]'.replace(' -> ', '\n') + '\nA -> B');
    expect(out).toContain('classDef service');
    expect(out).toContain('classDef database');
    expect(out).not.toContain('classDef queue');
  });
});
