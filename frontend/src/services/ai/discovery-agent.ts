import { generateText } from "ai";
import { prisma } from "@/lib/db";
import { mcpClientManager } from "../mcp-client";
import { activityService } from "../activity-service";
import { getModel } from "./model";
import { buildDiscoverySystemPrompt } from "./prompts";
import type { EventBus } from "../migration-orchestrator";
import type { ParsedDependencies } from "./abap-parser";

interface DiscoveredSub {
  name: string;
  objtype: string;
  sourceUrl: string;
  objectUrl: string;
}

interface DiscoveredObject {
  name: string;
  objtype: string;
  objectUrl: string;
  subObjects: DiscoveredSub[];
  sources: Record<string, string>;
  parsedDeps: ParsedDependencies | null;
  externalCustomDeps: string[];
}

type LogFn = (type: string, content: string) => Promise<void>;

function isCustomObject(name: string): boolean {
  const upper = name.toUpperCase();
  return upper.startsWith("Z") || upper.startsWith("Y");
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runDiscovery(
  projectId: string,
  sourceSystemId: string,
  targetSystemId: string,
  eventBus: EventBus,
  signal?: AbortSignal,
): Promise<void> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
  });

  const log: LogFn = async (type, content) => {
    const entry = await activityService.create(projectId, type, content);
    eventBus.emit(projectId, "activity", entry);
  };

  await log("discovery", `Starting recursive discovery for ${project.name} (${project.objtype})`);

  // ---- Phase 1: BFS crawl ----
  const queue: Array<{ name: string; objtype: string }> = [
    { name: project.name, objtype: project.objtype },
  ];
  const visited = new Set<string>();
  const discoveredObjects: DiscoveredObject[] = [];

  while (queue.length > 0) {
    signal?.throwIfAborted();
    const current = queue.shift()!;
    const key = current.name.toUpperCase();

    if (visited.has(key)) continue;
    visited.add(key);

    await log("discovery", `Discovering ${current.name} (${current.objtype})...`);

    try {
      const discovered = await discoverSingleObject(
        sourceSystemId,
        current.name,
        current.objtype,
        log,
        signal,
      );
      discoveredObjects.push(discovered);

      // Enqueue new Z/Y external deps not yet visited
      for (const depName of discovered.externalCustomDeps) {
        if (!visited.has(depName.toUpperCase())) {
          const guessedType = await guessObjectType(sourceSystemId, depName);
          if (guessedType) {
            queue.push({ name: depName, objtype: guessedType });
          } else {
            await log("discovery", `Could not find ${depName} in source system, skipping`);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await log("discovery", `Failed to discover ${current.name}: ${msg}`);
      // Continue with remaining queue items
    }
  }

  await log(
    "discovery",
    `Discovered ${discoveredObjects.length} ABAP object(s) with ${discoveredObjects.reduce((s, o) => s + o.subObjects.length, 0)} sub-objects total`,
  );

  signal?.throwIfAborted();

  // ---- Phase 2: Inter-object topological sort ----
  const objectOrder = computeObjectOrder(discoveredObjects);

  // ---- Phase 2.5: Target system existence check ----
  const existsInTarget = await checkTargetSystemExistence(
    targetSystemId,
    discoveredObjects,
    project.name,
    log,
    signal,
  );

  // ---- Phase 3 & 4: Intra-object ordering + persist ----
  for (const obj of discoveredObjects) {
    signal?.throwIfAborted();
    const objOrd = objectOrder.get(obj.name.toUpperCase()) ?? 0;

    const intraOrdering = await computeIntraObjectOrdering(obj, log, signal);

    for (const sub of obj.subObjects) {
      const orderData = intraOrdering.find(
        (o) => o.name.toUpperCase() === sub.name.toUpperCase(),
      );

      const isExcluded = existsInTarget.has(obj.name.toUpperCase());

      await prisma.subObject.create({
        data: {
          projectId,
          name: sub.name,
          objtype: sub.objtype,
          sourceUrl: sub.sourceUrl,
          objectUrl: sub.objectUrl,
          originalSource: obj.sources[sub.name] ?? "",
          status: "pending",
          order: orderData?.order ?? 0,
          dependsOn: orderData?.dependsOn?.length
            ? JSON.stringify(orderData.dependsOn)
            : null,
          parentObjectName: obj.name,
          parentObjectType: obj.objtype,
          objectOrder: objOrd,
          excluded: isExcluded,
        },
      });

      if (isExcluded) {
        await log("discovery", `Auto-excluded ${sub.name}: ${obj.name} already exists in target system`);
      }
    }
  }

  const totalSubs = discoveredObjects.reduce((s, o) => s + o.subObjects.length, 0);
  await log(
    "discovery",
    `Discovery complete. ${discoveredObjects.length} objects, ${totalSubs} sub-objects ready for migration.`,
  );
  eventBus.emit(projectId, "discovery_complete", {
    count: totalSubs,
    objectCount: discoveredObjects.length,
  });
}

// ---------------------------------------------------------------------------
// Discover a single ABAP object (no persistence)
// ---------------------------------------------------------------------------

async function discoverSingleObject(
  sourceSystemId: string,
  name: string,
  objtype: string,
  log: LogFn,
  signal?: AbortSignal,
): Promise<DiscoveredObject> {
  // 1. Resolve object URL
  const objectUrl = await resolveObjectUrl(sourceSystemId, name, objtype);
  signal?.throwIfAborted();

  // 2. Get object structure → enumerate sub-objects
  const structureJson = await mcpClientManager.callTool(
    sourceSystemId,
    "sap_object_structure",
    { objectUrl },
  );
  signal?.throwIfAborted();

  const structure = safeParse(structureJson);
  const subObjects = extractSubObjects(structure, name, objtype, objectUrl);

  await log("discovery", `${name}: found ${subObjects.length} sub-object(s)`);

  // 3. Fetch source code for each sub-object
  const sources: Record<string, string> = {};
  for (const sub of subObjects) {
    signal?.throwIfAborted();
    if (sub.sourceUrl) {
      try {
        const source = await mcpClientManager.callTool(
          sourceSystemId,
          "sap_get_source",
          { objectSourceUrl: sub.sourceUrl },
        );
        sources[sub.name] = source;
        await log("discovery", `Fetched source for ${sub.name} (${source.length} chars)`);
      } catch {
        await log("discovery", `Could not fetch source for ${sub.name}, skipping`);
      }
    }
  }

  // 4. Parse with abaplint/core for dependency extraction
  let parsedDeps: ParsedDependencies | null = null;
  try {
    const { parseAbapDependencies } = await import("./abap-parser");
    parsedDeps = await parseAbapDependencies(sources, subObjects);
    const parsedCount = parsedDeps.subObjects.filter((s) => s.parsed).length;
    await log("discovery", `${name}: parsed ${parsedCount}/${subObjects.length} sub-objects with abaplint`);
  } catch {
    await log("discovery", `${name}: abaplint parsing failed`);
  }

  // 5. Filter external deps to Z/Y custom objects only
  const externalCustomDeps = (parsedDeps?.externalDependencies ?? []).filter(isCustomObject);
  if (externalCustomDeps.length > 0) {
    await log("discovery", `${name}: custom dependencies: ${externalCustomDeps.join(", ")}`);
  }

  return { name, objtype, objectUrl, subObjects, sources, parsedDeps, externalCustomDeps };
}

// ---------------------------------------------------------------------------
// Guess object type by searching SAP without type filter
// ---------------------------------------------------------------------------

async function guessObjectType(
  systemId: string,
  name: string,
): Promise<string | null> {
  try {
    const searchResult = await mcpClientManager.callTool(
      systemId,
      "sap_search_object",
      { query: name, max: 5 },
    );
    const parsed = safeParse(searchResult);
    const results = (parsed?.results ?? []) as Array<Record<string, string>>;
    const match = results.find(
      (r) => (r["adtcore:name"] ?? "").toUpperCase() === name.toUpperCase(),
    );
    return match?.["adtcore:type"] ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Inter-object topological sort (dependencies first)
// ---------------------------------------------------------------------------

function computeObjectOrder(objects: DiscoveredObject[]): Map<string, number> {
  const names = new Set(objects.map((o) => o.name.toUpperCase()));

  // Build graph: A -> B means A depends on B
  const graph = new Map<string, Set<string>>();
  for (const obj of objects) {
    const deps = new Set<string>();
    for (const dep of obj.externalCustomDeps) {
      const key = dep.toUpperCase();
      if (names.has(key) && key !== obj.name.toUpperCase()) {
        deps.add(key);
      }
    }
    graph.set(obj.name.toUpperCase(), deps);
  }

  // Kahn's algorithm with reversed edges so dependencies come first
  const revInDegree = new Map<string, number>();
  for (const name of names) revInDegree.set(name, 0);
  for (const [source, edges] of graph) {
    // source depends on each edge target → source should come after target
    // reversed: target should come first → source gets higher in-degree
    for (const _dep of edges) {
      revInDegree.set(source, (revInDegree.get(source) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [name, deg] of revInDegree) {
    if (deg === 0) queue.push(name);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    // Find nodes that depend on `node` and decrement their in-degree
    for (const [source, edges] of graph) {
      if (edges.has(node)) {
        const newDeg = (revInDegree.get(source) ?? 1) - 1;
        revInDegree.set(source, newDeg);
        if (newDeg === 0) queue.push(source);
      }
    }
  }

  const result = new Map<string, number>();
  for (const [i, name] of sorted.entries()) {
    result.set(name, i);
  }
  // Cycle nodes get max order
  for (const name of names) {
    if (!result.has(name)) {
      result.set(name, sorted.length);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Intra-object ordering (deterministic or LLM fallback)
// ---------------------------------------------------------------------------

async function computeIntraObjectOrdering(
  obj: DiscoveredObject,
  log: LogFn,
  signal?: AbortSignal,
): Promise<Array<{ name: string; order: number; dependsOn: string[] }>> {
  // Try deterministic ordering first
  if (obj.parsedDeps && obj.parsedDeps.subObjects.every((s) => s.parsed)) {
    try {
      const { tryDeterministicOrdering } = await import("./abap-parser");
      const result = tryDeterministicOrdering(obj.parsedDeps, obj.subObjects);
      if (result) {
        return result;
      }
    } catch {
      // Fall through to LLM
    }
  }

  // LLM fallback
  try {
    const model = await getModel();
    const systemPrompt = await buildDiscoverySystemPrompt();

    const summary = obj.subObjects.map((s) => {
      const depInfo = obj.parsedDeps?.subObjects.find(
        (d) => d.subObjectName.toUpperCase() === s.name.toUpperCase(),
      );
      return {
        name: s.name,
        type: s.objtype,
        sourcePreview: (obj.sources[s.name] ?? "(no source)").substring(0, 500),
        ...(depInfo?.parsed
          ? {
              detectedDependencies: {
                implementedInterfaces: depInfo.implementedInterfaces,
                classReferences: depInfo.classReferences,
                includeReferences: depInfo.includeReferences,
                superClass: depInfo.superClass,
                typeReferences: depInfo.typeReferences.slice(0, 20),
              },
            }
          : {}),
      };
    });

    await log("discovery", `${obj.name}: analyzing intra-object dependencies with AI...`);

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: `Analyze these sub-objects of ${obj.name} (${obj.objtype}) and determine migration order:\n\n${JSON.stringify(summary, null, 2)}`,
      maxOutputTokens: 4000,
      abortSignal: signal,
    });

    const parsed = safeParse(text);
    if (Array.isArray(parsed?.subObjects)) {
      return parsed.subObjects as Array<{ name: string; order: number; dependsOn: string[] }>;
    }
  } catch (err) {
    if (signal?.aborted) throw err;
    await log("discovery", `${obj.name}: AI analysis failed, using sequential ordering`);
  }

  // Final fallback: sequential ordering
  return obj.subObjects.map((s, i) => ({
    name: s.name,
    order: i,
    dependsOn: [],
  }));
}

// ---------------------------------------------------------------------------
// Target system existence check
// ---------------------------------------------------------------------------

async function checkTargetSystemExistence(
  targetSystemId: string,
  discoveredObjects: DiscoveredObject[],
  rootObjectName: string,
  log: LogFn,
  signal?: AbortSignal,
): Promise<Set<string>> {
  const existsInTarget = new Set<string>();

  for (const obj of discoveredObjects) {
    signal?.throwIfAborted();

    // Skip the root project object — user explicitly wants to migrate it
    if (obj.name.toUpperCase() === rootObjectName.toUpperCase()) continue;

    try {
      const searchResult = await mcpClientManager.callTool(
        targetSystemId,
        "sap_search_object",
        { query: obj.name, objType: obj.objtype.split("/")[0], max: 5 },
      );
      const parsed = safeParse(searchResult);
      const results = (parsed?.results ?? []) as Array<Record<string, string>>;
      const match = results.find(
        (r) => (r["adtcore:name"] ?? "").toUpperCase() === obj.name.toUpperCase(),
      );
      if (match) {
        existsInTarget.add(obj.name.toUpperCase());
        await log(
          "discovery",
          `${obj.name} found in target system — will be auto-excluded`,
        );
      }
    } catch {
      await log("discovery", `Could not check ${obj.name} in target system, keeping included`);
    }
  }

  if (existsInTarget.size > 0) {
    await log(
      "discovery",
      `Auto-excluded ${existsInTarget.size} object(s) already present in target system`,
    );
  }

  return existsInTarget;
}

// ---------------------------------------------------------------------------
// Helpers (unchanged from original)
// ---------------------------------------------------------------------------

async function resolveObjectUrl(
  systemId: string,
  name: string,
  objtype: string,
): Promise<string> {
  const searchResult = await mcpClientManager.callTool(
    systemId,
    "sap_search_object",
    {
      query: name,
      objType: objtype.split("/")[0],
      max: 10,
    },
  );

  const parsed = safeParse(searchResult);
  const results = (parsed?.results ?? []) as Array<Record<string, string>>;

  const match = results.find(
    (r) => (r["adtcore:name"] ?? "").toUpperCase() === name.toUpperCase(),
  );

  if (!match) {
    throw new Error(`Object ${name} (${objtype}) not found in source system`);
  }

  return match["adtcore:uri"] ?? "";
}

function extractSubObjects(
  structure: Record<string, unknown>,
  parentName: string,
  parentType: string,
  objectUrl: string,
): DiscoveredSub[] {
  const subs: DiscoveredSub[] = [];

  const links = (structure as Record<string, unknown>)?.links as
    | Array<Record<string, string>>
    | undefined;
  const includes = (structure as Record<string, unknown>)?.includes as
    | Array<Record<string, string>>
    | undefined;

  if (includes && Array.isArray(includes)) {
    for (const inc of includes) {
      subs.push({
        name: inc["adtcore:name"] || inc.name || parentName,
        objtype: inc["adtcore:type"] || inc.type || parentType,
        sourceUrl: inc["source:uri"] || inc.sourceUri || "",
        objectUrl: inc["adtcore:uri"] || inc.uri || objectUrl,
      });
    }
  }

  if (subs.length === 0) {
    const mainSourceUri =
      ((structure as Record<string, unknown>)?.sourceUri as string) ??
      links?.find((l) => l.rel === "source")?.href ??
      `${objectUrl}/source/main`;

    subs.push({
      name: parentName,
      objtype: parentType,
      sourceUrl: mainSourceUri,
      objectUrl,
    });
  }

  return subs;
}

function safeParse(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        // give up
      }
    }
    return {};
  }
}
