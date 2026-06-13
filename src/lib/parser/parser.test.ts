import { describe, expect, it } from 'vitest';
import { parse } from './parser';

describe('DSL parser — happy paths', () => {
  it('parses a simple connection into two nodes and one solid edge', () => {
    const { diagram, errors } = parse('A -> B');
    expect(errors).toEqual([]);
    expect(diagram.nodes.map((n) => n.id)).toEqual(['A', 'B']);
    expect(diagram.edges).toHaveLength(1);
    expect(diagram.edges[0]).toMatchObject({ from: 'A', to: 'B', kind: 'solid', label: null });
  });

  it('reads an edge label after a colon', () => {
    const { diagram, errors } = parse('API -> Cache : gRPC');
    expect(errors).toEqual([]);
    expect(diagram.edges[0].label).toBe('gRPC');
  });

  it('reads an edge label after a pipe separator', () => {
    const { diagram } = parse('API -> Cache | reads');
    expect(diagram.edges[0].label).toBe('reads');
  });

  it('distinguishes solid, dashed and bidirectional operators', () => {
    const { diagram } = parse(['A -> B', 'A --> C', 'A <-> D'].join('\n'));
    expect(diagram.edges.map((e) => e.kind)).toEqual(['solid', 'dashed', 'bidirectional']);
  });

  it('applies a node type declaration', () => {
    const { diagram, errors } = parse(['DB [database]', 'API -> DB'].join('\n'));
    expect(errors).toEqual([]);
    const db = diagram.nodes.find((n) => n.id === 'DB');
    expect(db?.type).toBe('database');
  });

  it('supports every documented node type', () => {
    const src = [
      'a [service]',
      'b [database]',
      'c [queue]',
      'd [external]',
      'e [cache]',
      'f [default]',
    ].join('\n');
    const { diagram, errors } = parse(src);
    expect(errors).toEqual([]);
    expect(diagram.nodes.map((n) => n.type)).toEqual([
      'service',
      'database',
      'queue',
      'external',
      'cache',
      'default',
    ]);
  });

  it('creates each node once even when referenced repeatedly', () => {
    const { diagram } = parse(['A -> B', 'B -> C', 'C -> A'].join('\n'));
    expect(diagram.nodes.map((n) => n.id)).toEqual(['A', 'B', 'C']);
    expect(diagram.edges).toHaveLength(3);
  });

  it('ignores blank lines and # / // comments', () => {
    const src = ['# a comment', '', '// another comment', 'A -> B', '   '].join('\n');
    const { diagram, errors } = parse(src);
    expect(errors).toEqual([]);
    expect(diagram.nodes).toHaveLength(2);
    expect(diagram.edges).toHaveLength(1);
  });

  it('reads the direction directive (case-insensitive)', () => {
    expect(parse('direction LR').diagram.direction).toBe('LR');
    expect(parse('direction lr').diagram.direction).toBe('LR');
    expect(parse('A -> B').diagram.direction).toBe('TD'); // default
  });

  it('honours quoted labels with spaces and assigns a safe id', () => {
    const { diagram, errors } = parse('"Load Balancer" -> "API Server"');
    expect(errors).toEqual([]);
    expect(diagram.nodes[0]).toMatchObject({ id: 'Load_Balancer', label: 'Load Balancer' });
    expect(diagram.nodes[1]).toMatchObject({ id: 'API_Server', label: 'API Server' });
  });

  it('uses an explicit display label from a node declaration', () => {
    const { diagram } = parse(['Auth [service] "Auth Service"', 'Auth -> DB'].join('\n'));
    const auth = diagram.nodes.find((n) => n.id === 'Auth');
    expect(auth).toMatchObject({ label: 'Auth Service', type: 'service' });
  });

  it('places nodes inside a group and nests groups', () => {
    const src = [
      'group Backend {',
      '  API [service]',
      '  group Data {',
      '    DB [database]',
      '  }',
      '}',
      'Web -> API',
    ].join('\n');
    const { diagram, errors } = parse(src);
    expect(errors).toEqual([]);
    expect(diagram.groups.map((g) => g.label)).toEqual(['Backend', 'Data']);

    const api = diagram.nodes.find((n) => n.id === 'API');
    const db = diagram.nodes.find((n) => n.id === 'DB');
    const web = diagram.nodes.find((n) => n.id === 'Web');
    const backend = diagram.groups.find((g) => g.label === 'Backend');
    const data = diagram.groups.find((g) => g.label === 'Data');

    expect(api?.group).toBe(backend?.id);
    expect(db?.group).toBe(data?.id);
    expect(data?.parent).toBe(backend?.id);
    expect(web?.group).toBeNull(); // declared after the group closed
  });

  it('disambiguates two different labels that slugify to the same id', () => {
    const { diagram } = parse('"My Node" -> "My-Node"');
    const ids = diagram.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });
});

describe('DSL parser — error reporting', () => {
  it('reports an unknown node type with the right line number', () => {
    const { errors } = parse(['A -> B', 'B [storage]'].join('\n'));
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(2);
    expect(errors[0].message).toMatch(/Unknown node type/);
  });

  it('reports a malformed connection (missing target)', () => {
    const { errors } = parse('A ->');
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(1);
    expect(errors[0].message).toMatch(/Malformed connection/);
  });

  it('reports an unclosed group at the opening line', () => {
    const { errors } = parse(['group Backend {', '  API [service]'].join('\n'));
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(1);
    expect(errors[0].message).toMatch(/Unclosed group/);
  });

  it("reports a stray '}'", () => {
    const { errors } = parse('}');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Unexpected '}'/);
  });

  it('reports an invalid direction value', () => {
    const { errors } = parse('direction SIDEWAYS');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Unknown direction/);
  });

  it('reports completely unrecognized syntax', () => {
    const { errors } = parse('this is not valid dsl');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Unrecognized syntax/);
  });

  it('keeps valid lines while still reporting the bad one (partial parse)', () => {
    const src = ['A -> B', '!!! broken !!!', 'B -> C'].join('\n');
    const { diagram, errors } = parse(src);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(2);
    // The two valid edges still made it into the diagram.
    expect(diagram.edges).toHaveLength(2);
    expect(diagram.nodes.map((n) => n.id)).toEqual(['A', 'B', 'C']);
  });

  it('points the column at the first non-whitespace character', () => {
    const { errors } = parse('      }');
    expect(errors[0].column).toBe(7);
  });
});
