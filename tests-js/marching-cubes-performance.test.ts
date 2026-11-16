import { describe, expect, it } from 'vitest';

declare const SCENARIOS: any;
declare const VugSimulator: any;
declare const WallState: any;
declare const setSeed: any;
declare const CavitySurfaceAnchors: any;
declare const CavityScalarField: any;

const CASES = [
  'amethyst_geode',
  'mvt',
  'reactivated_fluorite_vein',
  'great_salt_plains',
  'tormiq_alpine_cleft',
  'zoned_dripstone_cave',
  'reactive_wall',
];

const EXPECTED_TRIANGLES: Record<string, Record<number, number>> = {
  amethyst_geode: { 48: 35504, 64: 63788 },
  mvt: { 48: 44368, 64: 80196 },
  reactivated_fluorite_vein: { 48: 12640, 64: 23100 },
  great_salt_plains: { 48: 11144, 64: 20204 },
  tormiq_alpine_cleft: { 48: 7404, 64: 13536 },
  zoned_dripstone_cave: { 48: 41648, 64: 74960 },
  reactive_wall: { 48: 33352, 64: 60408 },
};

// Every current authored benchmark case must extract; this exact set makes any
// newly rejected topology a deliberate, reviewed receipt change.
const EXPECTED_REJECTIONS = new Set<string>();

// Transaction work happens only when a scenario starts or an erosion step is
// committed; cached renderer work has its own frame budget below. These broad
// local-CI ceilings are intentionally enforceable, unlike the former finite-
// number assertion, while retaining headroom for a cold JIT and loaded laptop.
const TRANSACTION_BUDGET_MS = { 48: 150, 64: 250 } as const;
// The warm-frame target is tight on purpose and keeps no headroom for a busy
// host: with other work holding the box at about 65 % or more, all eight mvt
// 48^3 observations can land over it. Kept at 70 ms (decided 2026-10-28): run
// the cold CI on a quiet box, and re-run a failure there before loosening it.
const STEADY_48_TRANSACTION_BUDGET_MS = 70;
const CACHED_PATCH_FRAME_BUDGET_MS = 5;
const EVOLVING_PATCH_STEP_BUDGET_MS = 100;
const INDEXED_REMAP_STEP_BUDGET_MS = 120;
const COLD_PATCH_BUILD_BUDGET_MS = 800;
const COMPLETE_DISSOLUTION_BUDGET_MS = 4000;
// Every budget above is judged on the best of at most this many fresh,
// identical observations; see bestOfFresh. Consecutive fresh 48^3 builds were
// measured getting cheaper through about the sixth (the process is still
// warming up), so the earlier cap of four judged the warm-frame target early.
const BUDGET_MAX_OBSERVATIONS = 8;

function diagnosticWallFor(conditions: any) {
  const authored = conditions.wall;
  const wall = new WallState({
    vug_diameter_mm: authored.vug_diameter_mm,
    initial_radius_mm: authored.vug_diameter_mm / 2,
    primary_bubbles: authored.primary_bubbles,
    secondary_bubbles: authored.secondary_bubbles,
    shape_seed: authored.shape_seed,
    architecture: authored.architecture,
    genesis: authored.genesis,
    cavity_render: authored.cavity_render,
    composition: authored.composition,
    matrix: authored.matrix,
    per_vertex_nucleation: authored.per_vertex_nucleation,
    per_cell_local_fill: authored.per_cell_local_fill,
    is_lit: authored.is_lit,
    size_class: authored.size_class,
  });
  wall.initializeCavityEvolutionLedger();
  return wall;
}

// Wall-clock observations may contain a host GC or scheduler pause, which
// slows one observation; a code regression slows every observation. So each
// budget is judged on the best of a small bounded series: `first` is the
// observation the test already took, and while any budgeted key's best still
// exceeds its budget, `fresh` repeats the identical work on new objects.
// Callers assert that every retry rebuilt the same bytes and, where the timed
// stage builds a cache, that it built its own rather than reading another's.
// Host contention stays visible in the receipts' observation series without
// turning one unlucky pause into a product regression.
function bestOfFresh<T extends Record<string, any>>(
  budgets: Record<string, number>, first: T, fresh: () => T,
) {
  const observations = [first];
  const best = () => Object.fromEntries(Object.keys(budgets).map(key =>
    [key, Math.min(...observations.map(observation => observation[key]))]));
  while (observations.length < BUDGET_MAX_OBSERVATIONS
    && Object.entries(budgets).some(([key, budget]) => best()[key] > budget)) {
    observations.push(fresh());
  }
  return { observations, best: best() as Record<string, number> };
}

function seriesMs(observations: any[], key: string) {
  return observations.map(observation => Number(observation[key].toFixed(2)));
}

describe('Marching Cubes cavity measured budgets', () => {
  it('records 48^3 and 64^3 costs on authored shape seeds', () => {
    const characterize = process.env.MC_BENCHMARK_CHARACTERIZE === '1';
    const receipt: any[] = [];
    const observedRejections = new Set<string>();
    for (const scenarioName of CASES) {
      setSeed(42); // simulation test seed; each scenario retains its authored shape_seed
      const { conditions } = SCENARIOS[scenarioName]();
      const wall = diagnosticWallFor(conditions);
      for (const resolution of [48, 64]) {
        const field = wall.cavityFieldFor({ resolution });
        let surface;
        try {
          surface = wall.cavitySurfaceFor({ resolution, throwOnFailure: true });
        } catch (error: any) {
          const key = `${scenarioName}@${resolution}`;
          expect(EXPECTED_REJECTIONS.has(key)).toBe(true);
          expect(error.message).toMatch(/non-manifold/i);
          observedRejections.add(key);
          receipt.push({
            scenario: scenarioName,
            architecture: wall.architecture,
            shape_seed: wall.shape_seed,
            resolution,
            rejected: error.message,
          });
          continue;
        }
        expect(EXPECTED_REJECTIONS.has(`${scenarioName}@${resolution}`)).toBe(false);
        const row = {
          scenario: scenarioName,
          architecture: wall.architecture,
          shape_seed: wall.shape_seed,
          resolution,
          field_ms: Number(surface.metrics.field_build_ms.toFixed(2)),
          extract_ms: Number(surface.metrics.extraction_ms.toFixed(2)),
          polygonize_ms: Number(surface.metrics.polygonize_ms.toFixed(2)),
          manifold_ms: Number(surface.metrics.manifold_ms.toFixed(2)),
          normal_material_ms: Number(surface.metrics.normal_material_ms.toFixed(2)),
          packing_authentication_ms: Number(
            surface.metrics.packing_authentication_ms.toFixed(2),
          ),
          packing_ms: Number(surface.metrics.packing_ms.toFixed(2)),
          buffer_authentication_ms: Number(
            surface.metrics.buffer_authentication_ms.toFixed(2),
          ),
          transaction_ms: Number(
            (surface.metrics.field_build_ms + surface.metrics.extraction_ms).toFixed(2),
          ),
          transaction_budget_ms: TRANSACTION_BUDGET_MS[resolution as 48 | 64],
          vertices: surface.metrics.vertex_count,
          triangles: surface.metrics.triangle_count,
          field_kib: Math.round(surface.metrics.field_bytes / 1024),
          surface_kib: Math.round(surface.metrics.surface_bytes / 1024),
        };
        // After the first case has paid the cold JIT, 48^3 must also meet the
        // warm-frame target, which then binds before the transaction ceiling.
        const steady = resolution === 48 && scenarioName !== CASES[0];
        const transaction = bestOfFresh(
          {
            transaction_ms: steady
              ? STEADY_48_TRANSACTION_BUDGET_MS : row.transaction_budget_ms,
          },
          { transaction_ms: row.transaction_ms, buffer_digest: surface.buffer_digest },
          () => {
            const freshSurface = diagnosticWallFor(conditions).cavitySurfaceFor({
              resolution, throwOnFailure: true,
            });
            return {
              transaction_ms: Number((freshSurface.metrics.field_build_ms
                + freshSurface.metrics.extraction_ms).toFixed(2)),
              buffer_digest: freshSurface.buffer_digest,
            };
          },
        );
        (row as any).transaction_observations_ms =
          seriesMs(transaction.observations, 'transaction_ms');
        receipt.push(row);
        console.log(`[mc-case] ${JSON.stringify(row)}`);
        expect(row.shape_seed).toBe(conditions.wall.shape_seed);
        expect(row.triangles).toBeGreaterThan(0);
        if (!characterize) {
          expect(row.triangles).toBe(EXPECTED_TRIANGLES[scenarioName][resolution]);
        }
        expect(row.vertices).toBeGreaterThan(0);
        expect(row.field_kib).toBe(Math.round(resolution ** 3 * 4 / 1024));
        expect(row.surface_kib).toBeLessThan(4096);
        expect(Number.isFinite(row.field_ms + row.extract_ms)).toBe(true);
        for (const observation of transaction.observations) {
          expect(observation.buffer_digest, `${scenarioName}@${resolution} observed bytes`)
            .toBe(surface.buffer_digest);
        }
        expect(transaction.best.transaction_ms, `${scenarioName}@${resolution} transaction budget`)
          .toBeLessThanOrEqual(row.transaction_budget_ms);
        if (steady) {
          expect(transaction.best.transaction_ms, `${scenarioName}@48 steady-state budget`)
            .toBeLessThanOrEqual(STEADY_48_TRANSACTION_BUDGET_MS);
        }
      }
    }
    expect(observedRejections).toEqual(EXPECTED_REJECTIONS);
    console.log(`[mc-benchmark] ${JSON.stringify(receipt)}`);
  });

  it('measures the active surface-patch and remap consumers', () => {
    const observeConsumers = () => {
      setSeed(42);
      const { conditions } = SCENARIOS.amethyst_geode();
      const wall = diagnosticWallFor(conditions);
      const field = wall.cavityFieldFor({ resolution: 48 });
      const surface = wall.cavitySurfaceFor({ resolution: 48, throwOnFailure: true });
      const mesh = wall.meshFor();
      const triangleCount = surface.indices.length / 3;
      const anchors = Array.from({ length: 8 }, (_, index) =>
        CavitySurfaceAnchors.fromMarchingCubes(
          field, surface, mesh, Math.floor(index * triangleCount / 8), [1 / 3, 1 / 3, 1 / 3],
        ));
      const coldStarted = performance.now();
      const coldPatches = anchors.map(anchor =>
        CavitySurfaceAnchors.surfacePatch(anchor, surface, 0.12));
      const coldPatchMs = performance.now() - coldStarted;
      const cachedStarted = performance.now();
      const cachedPatches = anchors.map(anchor =>
        CavitySurfaceAnchors.surfacePatch(anchor, surface, 0.12));
      const cachedPatchMs = performance.now() - cachedStarted;
      expect(cachedPatches).toEqual(coldPatches);
      for (let index = 0; index < anchors.length; index++) {
        expect(cachedPatches[index]).toBe(coldPatches[index]);
      }
      const evolvingStarted = performance.now();
      const evolvingPatches = anchors.map(anchor =>
        CavitySurfaceAnchors.surfacePatch(anchor, surface, 0.121));
      const evolvingPatchMs = performance.now() - evolvingStarted;
      expect(evolvingPatches.every((patch: any, index: number) =>
        patch.triangles.length >= coldPatches[index].triangles.length)).toBe(true);

      const wallAnchors = [[1, 3], [4, 11], [7, 23], [10, 31]]
        .map(([ringIdx, cellIdx]) => wall._anchorFromRingCell(ringIdx, cellIdx));
      const remapStarted = performance.now();
      const remapped = wallAnchors.map(anchor =>
        CavitySurfaceAnchors.remapToMarchingCubes(anchor, field, surface, mesh));
      const indexedRemapMs = performance.now() - remapStarted;
      expect(remapped.every(anchor => anchor.source.signature === surface.sig)).toBe(true);
      const topology = CavitySurfaceAnchors._surfaceTopology(surface);
      return {
        shape_seed: conditions.wall.shape_seed,
        anchors: anchors.length,
        buffer_digest: surface.buffer_digest,
        cold_patch: coldPatches[0],
        selected_triangles: coldPatches.reduce(
          (sum: number, patch: any) => sum + patch.triangles.length, 0),
        cold_patch_ms: coldPatchMs,
        cached_patch_ms: cachedPatchMs,
        evolving_patch_ms: evolvingPatchMs,
        indexed_remap_ms: indexedRemapMs,
        cached_patch_triangle_weight: topology.patchCacheTriangleWeight,
        cached_paths: topology.pathCache.size,
        cached_field_frames: topology.fieldSpatialIndices.size,
      };
    };
    const consumers = bestOfFresh({
      cold_patch_ms: COLD_PATCH_BUILD_BUDGET_MS,
      cached_patch_ms: CACHED_PATCH_FRAME_BUDGET_MS,
      evolving_patch_ms: EVOLVING_PATCH_STEP_BUDGET_MS,
      indexed_remap_ms: INDEXED_REMAP_STEP_BUDGET_MS,
    }, observeConsumers(), observeConsumers);
    const [first] = consumers.observations;
    const receipt = {
      scenario: 'amethyst_geode', shape_seed: first.shape_seed,
      resolution: 48, anchors: first.anchors,
      patch_coverage: 0.12,
      selected_triangles: first.selected_triangles,
      cold_patch_ms: Number(first.cold_patch_ms.toFixed(2)),
      cached_patch_ms: Number(first.cached_patch_ms.toFixed(2)),
      evolving_patch_ms: Number(first.evolving_patch_ms.toFixed(2)),
      indexed_remap_ms: Number(first.indexed_remap_ms.toFixed(2)),
      cold_patch_observations_ms: seriesMs(consumers.observations, 'cold_patch_ms'),
      cached_patch_observations_ms: seriesMs(consumers.observations, 'cached_patch_ms'),
      evolving_patch_observations_ms: seriesMs(consumers.observations, 'evolving_patch_ms'),
      indexed_remap_observations_ms: seriesMs(consumers.observations, 'indexed_remap_ms'),
      cold_patch_budget_ms: COLD_PATCH_BUILD_BUDGET_MS,
      cached_patch_frame_budget_ms: CACHED_PATCH_FRAME_BUDGET_MS,
      evolving_patch_step_budget_ms: EVOLVING_PATCH_STEP_BUDGET_MS,
      indexed_remap_step_budget_ms: INDEXED_REMAP_STEP_BUDGET_MS,
      cached_patch_triangle_weight: first.cached_patch_triangle_weight,
      cached_paths: first.cached_paths,
      cached_field_frames: first.cached_field_frames,
    };
    console.log(`[mc-consumer-benchmark] ${JSON.stringify(receipt)}`);
    for (const observation of consumers.observations) {
      expect(observation.buffer_digest, 'consumer observed bytes').toBe(first.buffer_digest);
      expect(observation.selected_triangles).toBe(first.selected_triangles);
      if (observation !== first) {
        expect(observation.cold_patch, 'retry built its own cold patches')
          .not.toBe(first.cold_patch);
      }
      expect(Number.isFinite(observation.cold_patch_ms + observation.cached_patch_ms
        + observation.evolving_patch_ms + observation.indexed_remap_ms)).toBe(true);
      expect(observation.cached_patch_triangle_weight)
        .toBeLessThanOrEqual(CavitySurfaceAnchors.PATCH_CACHE_TRIANGLE_BUDGET);
      expect(observation.cached_paths)
        .toBeLessThanOrEqual(CavitySurfaceAnchors.SURFACE_PATH_CACHE_LIMIT);
      expect(observation.cached_field_frames).toBeLessThanOrEqual(3);
    }
    expect(consumers.best.cold_patch_ms, 'cold patch build budget')
      .toBeLessThanOrEqual(COLD_PATCH_BUILD_BUDGET_MS);
    expect(consumers.best.cached_patch_ms, 'cached patch frame budget')
      .toBeLessThanOrEqual(CACHED_PATCH_FRAME_BUDGET_MS);
    expect(consumers.best.evolving_patch_ms, 'evolving patch step budget')
      .toBeLessThanOrEqual(EVOLVING_PATCH_STEP_BUDGET_MS);
    expect(consumers.best.indexed_remap_ms, 'indexed remap step budget')
      .toBeLessThanOrEqual(INDEXED_REMAP_STEP_BUDGET_MS);
  });

  it('bounds a nonzero authenticated erosion-prefix rebuild', () => {
    const observeErosion = () => {
      setSeed(42);
      const { conditions, events } = SCENARIOS.reactive_wall();
      conditions.fluid.pH = 4;
      conditions.flow_rate = 0.4;
      const sim = new VugSimulator(conditions, events);
      const originalExtract = CavityScalarField.prototype.extract;
      const extracted: number[] = [];
      CavityScalarField.prototype.extract = function(...args: any[]) {
        extracted.push(this.sizeX);
        return originalExtract.apply(this, args);
      };
      const started = performance.now();
      try {
        sim.dissolve_wall();
      } finally {
        CavityScalarField.prototype.extract = originalExtract;
      }
      const completeDissolutionMs = performance.now() - started;
      expect(sim.wall_state.cavityEvolutionLedger().cursor).toBe(1);
      const field = sim.wall_state.cavityFieldFor({ resolution: 48 });
      const surface = sim.wall_state.cavitySurfaceFor({ resolution: 48, throwOnFailure: true });
      expect(extracted).toEqual([48, 64]);
      expect(surface.source_field_snapshot_digest).toBe(field.snapshotDigest);
      return {
        shape_seed: conditions.wall.shape_seed,
        field_ms: field.metrics.field_build_ms,
        extract_ms: surface.metrics.extraction_ms,
        transaction_ms: field.metrics.field_build_ms + surface.metrics.extraction_ms,
        complete_dissolution_ms: completeDissolutionMs,
        full_surface_resolutions: extracted,
        triangles: surface.metrics.triangle_count,
        buffer_digest: surface.buffer_digest,
      };
    };
    const erosion = bestOfFresh({
      transaction_ms: TRANSACTION_BUDGET_MS[48],
      complete_dissolution_ms: COMPLETE_DISSOLUTION_BUDGET_MS,
    }, observeErosion(), observeErosion);
    const [first] = erosion.observations;
    const receipt = {
      scenario: 'reactive_wall', shape_seed: first.shape_seed,
      resolution: 48, evolution_cursor: 1,
      field_ms: Number(first.field_ms.toFixed(2)),
      extract_ms: Number(first.extract_ms.toFixed(2)),
      transaction_ms: Number(first.transaction_ms.toFixed(2)),
      transaction_observations_ms: seriesMs(erosion.observations, 'transaction_ms'),
      transaction_budget_ms: TRANSACTION_BUDGET_MS[48],
      complete_dissolution_ms: Number(first.complete_dissolution_ms.toFixed(2)),
      complete_dissolution_observations_ms:
        seriesMs(erosion.observations, 'complete_dissolution_ms'),
      complete_dissolution_budget_ms: COMPLETE_DISSOLUTION_BUDGET_MS,
      full_surface_resolutions: first.full_surface_resolutions,
      triangles: first.triangles,
    };
    console.log(`[mc-evolution-benchmark] ${JSON.stringify(receipt)}`);
    for (const observation of erosion.observations) {
      expect(observation.buffer_digest, 'erosion observed bytes').toBe(first.buffer_digest);
    }
    expect(erosion.best.transaction_ms, 'erosion-prefix transaction budget')
      .toBeLessThanOrEqual(TRANSACTION_BUDGET_MS[48]);
    expect(erosion.best.complete_dissolution_ms, 'complete dissolution budget')
      .toBeLessThanOrEqual(COMPLETE_DISSOLUTION_BUDGET_MS);
  });
});
