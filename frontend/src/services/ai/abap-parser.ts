import {
  Registry,
  MemoryFile,
  Statements,
  Expressions,
} from "@abaplint/core";
import type { ABAPFile } from "@abaplint/core";

export interface AbapDependencyInfo {
  subObjectName: string;
  implementedInterfaces: string[];
  classReferences: string[];
  includeReferences: string[];
  superClass: string | null;
  typeReferences: string[];
  parsed: boolean;
  parseError?: string;
}

export interface ParsedDependencies {
  subObjects: AbapDependencyInfo[];
  externalDependencies: string[];
}

const BUILTIN_TYPES = new Set([
  "STRING", "XSTRING", "I", "INT8", "F", "D", "T", "C", "N", "X", "P",
  "ABAP_BOOL", "ABAP_TRUE", "ABAP_FALSE", "FLAG", "CHAR1",
  "SY", "SYST", "ANY", "DATA", "CLIKE", "CSEQUENCE", "NUMERIC", "SIMPLE",
  "TABLE", "SORTED", "STANDARD", "HASHED",
  "REF", "OBJECT", "XSEQUENCE",
]);

function buildAbaplintFilename(name: string, objtype: string): string {
  const normalized = name.toLowerCase().replace(/\//g, "#");
  switch (objtype) {
    case "CLAS/OC": return `${normalized}.clas.abap`;
    case "INTF/OI": return `${normalized}.intf.abap`;
    case "PROG/P":  return `${normalized}.prog.abap`;
    case "PROG/I":  return `${normalized}.prog.abap`;
    case "FUGR/F":  return `${normalized}.fugr.abap`;
    case "FUGR/FF": return `${normalized}.fugr.abap`;
    case "FUGR/I":  return `${normalized}.prog.abap`;
    default:        return `${normalized}.prog.abap`;
  }
}

function extractFromFile(file: ABAPFile): Omit<AbapDependencyInfo, "subObjectName" | "parsed" | "parseError"> {
  const result = {
    implementedInterfaces: [] as string[],
    classReferences: [] as string[],
    includeReferences: [] as string[],
    superClass: null as string | null,
    typeReferences: [] as string[],
  };

  const structure = file.getStructure();
  if (!structure) return result;

  // 1. INTERFACES statements
  for (const stmt of structure.findAllStatements(Statements.InterfaceDef)) {
    const ifName = stmt.findFirstExpression(Expressions.InterfaceName);
    if (ifName) {
      result.implementedInterfaces.push(ifName.concatTokens().toUpperCase());
    }
  }

  // 2. INCLUDE statements
  for (const stmt of structure.findAllStatements(Statements.Include)) {
    const incName = stmt.findFirstExpression(Expressions.IncludeName);
    if (incName) {
      result.includeReferences.push(incName.concatTokens().toUpperCase());
    }
  }

  // 3. CLASS ... DEFINITION INHERITING FROM
  for (const stmt of structure.findAllStatements(Statements.ClassDefinition)) {
    const superExpr = stmt.findFirstExpression(Expressions.SuperClassName);
    if (superExpr) {
      result.superClass = superExpr.concatTokens().toUpperCase();
    }
  }

  // 4. TYPE REF TO — ClassName expressions
  for (const expr of structure.findAllExpressionsRecursive(Expressions.ClassName)) {
    result.classReferences.push(expr.concatTokens().toUpperCase());
  }

  // 5. TypeName expressions (filter builtins)
  for (const expr of structure.findAllExpressionsRecursive(Expressions.TypeName)) {
    const name = expr.concatTokens().toUpperCase();
    // Skip built-in types and compound types with dashes (field-symbols like VBAK-VBELN)
    const baseName = name.split("-")[0];
    if (!BUILTIN_TYPES.has(baseName) && baseName.length > 1) {
      result.typeReferences.push(name);
    }
  }

  // Deduplicate
  result.implementedInterfaces = [...new Set(result.implementedInterfaces)];
  result.classReferences = [...new Set(result.classReferences)];
  result.includeReferences = [...new Set(result.includeReferences)];
  result.typeReferences = [...new Set(result.typeReferences)];

  return result;
}

/**
 * Parse ABAP sources with @abaplint/core and extract dependency information.
 */
export async function parseAbapDependencies(
  sources: Record<string, string>,
  subObjects: Array<{ name: string; objtype: string }>,
): Promise<ParsedDependencies> {
  const allNames = new Set(subObjects.map((s) => s.name.toUpperCase()));
  const results: AbapDependencyInfo[] = [];

  for (const sub of subObjects) {
    const source = sources[sub.name];
    if (!source) {
      results.push({
        subObjectName: sub.name,
        implementedInterfaces: [],
        classReferences: [],
        includeReferences: [],
        superClass: null,
        typeReferences: [],
        parsed: false,
        parseError: "No source code available",
      });
      continue;
    }

    try {
      const reg = new Registry();
      const filename = buildAbaplintFilename(sub.name, sub.objtype);
      reg.addFile(new MemoryFile(filename, source));
      await reg.parseAsync();

      // Get parsed ABAP files
      let abapFile: ABAPFile | undefined;
      for (const obj of reg.getObjects()) {
        const files = (obj as { getABAPFiles?: () => readonly ABAPFile[] }).getABAPFiles?.();
        if (files && files.length > 0) {
          abapFile = files[0] as ABAPFile;
          break;
        }
      }

      if (!abapFile) {
        results.push({
          subObjectName: sub.name,
          implementedInterfaces: [],
          classReferences: [],
          includeReferences: [],
          superClass: null,
          typeReferences: [],
          parsed: false,
          parseError: "No ABAP file found after parsing",
        });
        continue;
      }

      const extracted = extractFromFile(abapFile);
      results.push({
        subObjectName: sub.name,
        ...extracted,
        parsed: true,
      });
    } catch (err) {
      results.push({
        subObjectName: sub.name,
        implementedInterfaces: [],
        classReferences: [],
        includeReferences: [],
        superClass: null,
        typeReferences: [],
        parsed: false,
        parseError: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Compute external dependencies: references not found among sub-object names
  const allRefs = new Set<string>();
  for (const r of results) {
    for (const name of r.implementedInterfaces) allRefs.add(name);
    for (const name of r.classReferences) allRefs.add(name);
    for (const name of r.includeReferences) allRefs.add(name);
    if (r.superClass) allRefs.add(r.superClass);
  }
  const externalDependencies = [...allRefs].filter((name) => !allNames.has(name));

  return { subObjects: results, externalDependencies };
}

/**
 * Attempt deterministic topological ordering based on parsed dependencies.
 * Returns ordered sub-objects if a valid DAG exists, null otherwise.
 */
export function tryDeterministicOrdering(
  deps: ParsedDependencies,
  subObjects: Array<{ name: string; objtype: string }>,
): Array<{ name: string; order: number; dependsOn: string[] }> | null {
  const nameSet = new Set(subObjects.map((s) => s.name.toUpperCase()));

  // Build adjacency: subObject -> set of internal sub-object names it depends on
  const graph = new Map<string, Set<string>>();
  for (const sub of deps.subObjects) {
    const key = sub.subObjectName.toUpperCase();
    const edges = new Set<string>();

    for (const ref of sub.implementedInterfaces) {
      if (nameSet.has(ref)) edges.add(ref);
    }
    for (const ref of sub.classReferences) {
      if (nameSet.has(ref)) edges.add(ref);
    }
    for (const ref of sub.includeReferences) {
      if (nameSet.has(ref)) edges.add(ref);
    }
    if (sub.superClass && nameSet.has(sub.superClass)) {
      edges.add(sub.superClass);
    }

    // Don't self-reference
    edges.delete(key);
    graph.set(key, edges);
  }

  // Kahn's algorithm for topological sort
  const inDegree = new Map<string, number>();
  for (const name of nameSet) inDegree.set(name, 0);
  for (const [, edges] of graph) {
    for (const dep of edges) {
      inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [name, deg] of inDegree) {
    if (deg === 0) queue.push(name);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    const edges = graph.get(node) ?? new Set();
    for (const dep of edges) {
      const newDeg = (inDegree.get(dep) ?? 1) - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) queue.push(dep);
    }
  }

  // Cycle detected
  if (sorted.length !== nameSet.size) return null;

  // Dependencies should come first: reverse sorted order gives us
  // "things with no dependents first" which is wrong. Actually in Kahn's,
  // nodes with 0 in-degree come first. But in-degree here counts how many
  // other nodes point TO this node. If A depends on B (A -> B), B has in-degree 1.
  // So B comes later... that's backwards.
  //
  // Let me reconsider: the graph edges are "A depends on B" meaning A -> B.
  // In-degree of B is 1 (A points to it). So B is NOT in the initial queue.
  // A has in-degree 0, so A comes first. But A depends on B, so B should
  // come first. We need to reverse the edges: "B must come before A".

  // Rebuild with reversed edges for correct ordering
  const revInDegree = new Map<string, number>();
  for (const name of nameSet) revInDegree.set(name, 0);
  for (const [source, edges] of graph) {
    for (const _dep of edges) {
      // source depends on _dep, so _dep must come before source
      // reversed: _dep -> source, in-degree of source increases
      revInDegree.set(source, (revInDegree.get(source) ?? 0) + 1);
    }
  }

  const revQueue: string[] = [];
  for (const [name, deg] of revInDegree) {
    if (deg === 0) revQueue.push(name);
  }

  const revSorted: string[] = [];
  while (revQueue.length > 0) {
    const node = revQueue.shift()!;
    revSorted.push(node);
    // Find all nodes that depend on `node`
    for (const [source, edges] of graph) {
      if (edges.has(node)) {
        const newDeg = (revInDegree.get(source) ?? 1) - 1;
        revInDegree.set(source, newDeg);
        if (newDeg === 0) revQueue.push(source);
      }
    }
  }

  if (revSorted.length !== nameSet.size) return null;

  return revSorted.map((name, i) => ({
    name,
    order: i,
    dependsOn: [...(graph.get(name) ?? [])],
  }));
}
