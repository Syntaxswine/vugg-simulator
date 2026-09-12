import { describe, expect, it } from 'vitest';

declare const Crystal: any;
declare const GrowthZone: any;
declare const StripRecorder: any;
declare function applyFilmDusting(crystals: any[], mineral: string, term: number, prism: number, step: number): number;
declare function _applyAcceptedCrystalMutations(crystal: any, zone: any): void;
declare function validateSurfaceHistory(history: any, zones: any[]): boolean;
declare function surfaceHistoryAtStep(crystal: any, step?: number | null): any;
declare function stripValidateDatasetShape(ds: any): void;
declare function stripSerialize(ds: any, gzip?: boolean): Promise<Uint8Array>;
declare function stripDeserialize(bytes: Uint8Array): Promise<any>;
declare function stripStoredRecordFromDataset(ds: any): any;
declare function stripDatasetFromStoredRecord(record: any): any;
declare function stripDatasetFromAuthenticatedStoredRecord(record: any): Promise<any>;
declare function stripDurableDatasetDigest(ds: any): Promise<string>;

const copy = (value: any) => JSON.parse(JSON.stringify(value));
function addZone(c: any, step: number, thickness: number, burial = false) {
  const z = new GrowthZone({ step, temperature: 100, thickness_um: thickness, growth_rate: 1 });
  z._time_scaled = true;
  if (burial) {
    z.masked_horizon = true; z.film_mineral = c._film.mineral; z._clear_film_on_accept = true;
    z.masked_phi_term = c._film.phi_term; z.masked_phi_prism = c._film.phi_prism;
    z.originating_film_step = c._film.step;
  }
  _applyAcceptedCrystalMutations(c, z);
  c.add_zone(z);
}
function filmCrystal() {
  const c = new Crystal({ crystal_id: 41, mineral: 'quartz', habit: 'prismatic', nucleation_step: 0 });
  addZone(c, 1, 100);
  expect(applyFilmDusting([c], 'chlorite', 0.3, 0.6, 2)).toBe(1);
  return c;
}
function simulator(c: any, step = 2) {
  return { step, crystals: [c], wall_state: { ring_count: 1, cells_per_ring: 1 },
    conditions: { temperature: 100, pressure: 0.001,
      _scenario: { id: 'surface-history-control', duration_steps: 1 } } };
}
function capture(c: any, step = 2) {
  const sim = simulator(c, step);
  const recorder = new StripRecorder(sim, { angular_indices: 1, duration_steps: 1 });
  recorder.captureStep(sim);
  return recorder.finalize();
}
function testimonyBounds(bytes: Uint8Array) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 0;
  at += 4 + dv.getUint32(at, true); // manifest
  at += 4 + dv.getUint32(at, true); // nucleation events
  at += 4 + dv.getUint32(at, true); // floor channel (v4+ fixture)
  return { at, length: dv.getUint32(at, true) };
}
function changeBinaryTestimony(bytes: Uint8Array, mutate: (testimony: any) => void) {
  const { at, length } = testimonyBounds(bytes);
  const testimony = JSON.parse(new TextDecoder().decode(bytes.subarray(at + 4, at + 4 + length)));
  mutate(testimony);
  const section = new TextEncoder().encode(JSON.stringify(testimony));
  const changed = new Uint8Array(bytes.length - length + section.length);
  changed.set(bytes.subarray(0, at));
  new DataView(changed.buffer).setUint32(at, section.length, true);
  changed.set(section, at + 4);
  changed.set(bytes.subarray(at + 4 + length), at + 4 + section.length);
  return changed;
}

describe('Strip View dated surface testimony', () => {
  it('captures real dusting, accepted burial and retreat with an independent deep snapshot', () => {
    const c = filmCrystal();
    addZone(c, 3, 40, true);
    addZone(c, 4, -50);
    expect(validateSurfaceHistory(c._surfaceHistory, c.zones)).toBe(true);
    const before = JSON.stringify(c);
    const ds = capture(c, 4);
    expect(JSON.stringify(c)).toBe(before);
    expect(ds.surface_history_testimony).toHaveLength(1);
    const row = ds.surface_history_testimony[0];
    expect(row).toMatchObject({ schema: 'strip-surface-history-v1', crystal_id: 41,
      mineral: 'quartz', captured_step: 4, sample_index: 0 });
    expect(row.history).toEqual(c._surfaceHistory);
    expect(row.history.events.map((e: any) => e.event)).toEqual(['dusting', 'buried', 'boundary-crossed']);
    expect(row.zones.map((z: any) => [z.zone_index, z.step, z.thickness_um])).toEqual([[0, 1, 100], [1, 3, 40], [2, 4, -50]]);
    expect(row.zones[1].masked_horizon).toBe(true);
    expect(validateSurfaceHistory(row.history, row.zones)).toBe(true);
    c._surfaceHistory.initial.surface_um = 900;
    c._surfaceHistory.events[0].operation.mineral = 'rewritten';
    c.zones[0].thickness_um = 900;
    expect(row.history.initial.surface_um).toBe(100);
    expect(row.history.events[0].operation.mineral).toBe('chlorite');
    expect(row.zones[0].thickness_um).toBe(100);
  });

  it('retains the optional channel through binary and authenticated storage round trips', async () => {
    const ds = capture(filmCrystal());
    const binary = await stripSerialize(ds, false);
    const decoded = await stripDeserialize(binary);
    expect(decoded.surface_history_testimony).toEqual(ds.surface_history_testimony);
    expect(decoded.chip_data).toEqual(ds.chip_data);
    expect(decoded.floor_data).toEqual(ds.floor_data);
    expect(decoded.layer_growth_testimony).toEqual(ds.layer_growth_testimony);
    expect(decoded.habit_morphology_testimony).toEqual(ds.habit_morphology_testimony);
    const stored = stripStoredRecordFromDataset(decoded);
    stored.dataset_digest_sha256 = await stripDurableDatasetDigest(decoded);
    expect((await stripDatasetFromAuthenticatedStoredRecord(stored)).surface_history_testimony).toEqual(ds.surface_history_testimony);
    const erased = { ...stored }; delete erased.surface_history_testimony;
    await expect(stripDatasetFromAuthenticatedStoredRecord(erased)).rejects.toThrow(/digest mismatch/);
    const rewritten = copy(stored.surface_history_testimony);
    rewritten[0].mineral = 'calcite'; // well-formed testimony, different authenticated bytes
    await expect(stripDatasetFromAuthenticatedStoredRecord({ ...stored, surface_history_testimony: rewritten })).rejects.toThrow(/digest mismatch/);
  });

  it('rejects malformed or self-rehashed false history at both import boundaries', async () => {
    const ds = capture(filmCrystal());
    const bytes = await stripSerialize(ds, false);
    const mutations = [
      (t: any) => t.surface_history_testimony = null,
      (t: any) => t.surface_history_testimony[0].schema = 'strip-surface-history-v2',
      (t: any) => t.surface_history_testimony.push(copy(t.surface_history_testimony[0])),
      (t: any) => t.surface_history_testimony[0].history = true,
      (t: any) => t.surface_history_testimony[0].history.events[0].coverage_change.term = 0.8,
      (t: any) => t.surface_history_testimony[0].history.events[0].operation.step = 1,
      (t: any) => t.surface_history_testimony[0].zones[0].zone_index = 1,
      (t: any) => t.surface_history_testimony[0].zones[0].thickness_um = 200,
      (t: any) => t.surface_history_testimony[0].zones[0].masked_horizon = 'yes',
      (t: any) => t.surface_history_testimony[0].captured_step = 1,
      (t: any) => t.surface_history_testimony[0].sample_index = 1,
    ];
    for (const mutate of mutations) {
      // Construct hostile input independently of the checked export writer.
      await expect(stripDeserialize(changeBinaryTestimony(bytes, mutate))).rejects.toThrow(/surface history/);
      const testimony = { surface_history_testimony: copy(ds.surface_history_testimony) };
      mutate(testimony);
      const bad = { ...ds, ...testimony };
      expect(() => stripValidateDatasetShape(bad)).toThrow(/surface history/);
      await expect(stripDurableDatasetDigest(bad)).rejects.toThrow(/surface history/);
      const stored = stripStoredRecordFromDataset(bad);
      stored.dataset_digest_sha256 = '0'.repeat(64);
      await expect(stripDatasetFromAuthenticatedStoredRecord(stored)).rejects.toThrow(/surface history/);
    }
  });

  it('preserves a declared unavailable prefix without inventing a historical view', async () => {
    const c = filmCrystal();
    c._surfaceHistory.unavailable = { reason: 'observation-gap', step: 3, zone_count: 1 };
    expect(validateSurfaceHistory(c._surfaceHistory, c.zones)).toBe(true);
    const ds = await stripDeserialize(await stripSerialize(capture(c, 3), false));
    const row = ds.surface_history_testimony[0];
    expect(row.history).toEqual(c._surfaceHistory);
    expect(row.history.events).toHaveLength(1);
    for (const step of [0, 2, 3, null]) {
      expect(surfaceHistoryAtStep({ _surfaceHistory: row.history, zones: row.zones }, step)).toBeNull();
    }
    const roundTrip = stripDatasetFromStoredRecord(stripStoredRecordFromDataset(ds));
    expect(roundTrip.surface_history_testimony[0].history.unavailable).toEqual(c._surfaceHistory.unavailable);
  });

  it('rejects future initial testimony and disagreement with the accepted burial zone', async () => {
    const c = filmCrystal();
    // Resume observation around an existing, explicitly recorded film snapshot.
    delete c._surfaceHistory;
    applyFilmDusting([c], 'chlorite', 0.4, 0.7, 3);
    addZone(c, 4, 40, true);
    const ds = capture(c, 4);
    const raw = await stripSerialize(ds, false);
    for (const mutate of [
      (r: any) => r.history.initial.film.step = 5,
      (r: any) => r.history.initial.film.operations[0].step = 5,
      (r: any) => r.zones[1].film_mineral = 'hematite',
      (r: any) => r.zones[1].masked_phi_term = 0.9,
      (r: any) => r.zones[1].masked_phi_prism = 0.1,
      (r: any) => r.zones[1].originating_film_step = 2,
    ]) {
      const changed = changeBinaryTestimony(raw, t => mutate(t.surface_history_testimony[0]));
      await expect(stripDeserialize(changed)).rejects.toThrow(/surface history/);
    }
  });

  it('latches a failed capture so an earlier valid observation cannot be finalized', () => {
    for (const corrupt of [
      (c: any) => c._surfaceHistory.events[0].coverage_change.term = 0.9,
      (c: any) => c._film.phi_term = 0.8,
    ]) {
      const c = filmCrystal(), sim = simulator(c);
      const recorder = new StripRecorder(sim, { angular_indices: 1, duration_steps: 2 });
      recorder.captureStep(sim);
      const before = copy(c._surfaceHistory), film = copy(c._film);
      corrupt(c); sim.step = 3;
      expect(() => recorder.captureStep(sim)).toThrow(/surface history/);
      c._surfaceHistory = before; c._film = film;
      expect(() => recorder.finalize()).toThrow(/surface history capture failed/);
    }
  });

  it('keeps legacy film snapshots as snapshots and reproduces prior testimony bytes when absent', async () => {
    const c = filmCrystal(); delete c._surfaceHistory;
    const ds = capture(c);
    expect(ds).not.toHaveProperty('surface_history_testimony');
    expect(ds.habit_morphology_testimony[0].surface_film).toEqual(c._film);
    const raw = await stripSerialize(ds, false);
    const { at, length } = testimonyBounds(raw);
    const priorProducerTestimony = JSON.stringify({
      pressure_phase_testimony: ds.pressure_phase_testimony || [],
      stress_event_testimony: ds.stress_event_testimony || [],
      transformation_event_testimony: ds.transformation_event_testimony || [],
      carbonate_boundary_testimony: ds.carbonate_boundary_testimony || [],
      sulfur_ledger_testimony: ds.sulfur_ledger_testimony || [],
      fluid_boundary_testimony: ds.fluid_boundary_testimony || [],
      enclosure_testimony: ds.enclosure_testimony || [],
      player_action_testimony: ds.player_action_testimony || [],
      layer_growth_testimony: ds.layer_growth_testimony || [],
      habit_morphology_testimony: ds.habit_morphology_testimony || [],
    });
    expect(new TextDecoder().decode(raw.subarray(at + 4, at + 4 + length))).toBe(priorProducerTestimony);
    expect(await stripSerialize(await stripDeserialize(raw), false)).toEqual(raw);
    expect(stripDatasetFromStoredRecord(stripStoredRecordFromDataset(ds))).not.toHaveProperty('surface_history_testimony');
    for (const version of [1, 2, 3, 4, 5]) {
      const old = { ...ds, manifest: { ...ds.manifest, format_version: version } };
      expect(await stripDeserialize(await stripSerialize(old, false))).not.toHaveProperty('surface_history_testimony');
    }
    const incompatible = capture(filmCrystal()); incompatible.manifest.format_version = 3;
    await expect(stripSerialize(incompatible, false)).rejects.toThrow(/testimony section/);
  });
});
