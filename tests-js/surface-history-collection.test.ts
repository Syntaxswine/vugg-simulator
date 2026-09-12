import { describe, expect, it } from 'vitest';

declare function buildCrystalRecord(crystal: any, meta: any, schema?: string | null): any;
declare function assertCrystalCollectionRecord(record: any): boolean;
declare function reconstructCrystalFromRecord(record: any): any;
declare function collectionRecordProducerSchema(record: any): string | null;
declare function _saveSpecimenScienceDigest(record: any): string;
declare function validateSurfaceHistory(history: any, zones: any[]): boolean;
declare const Crystal: any;
declare const GrowthZone: any;
declare function applyFilmDusting(crystals: any[], mineral: string, term: number, prism: number, step: number): number;
declare function _collectionHistoryCopy(value: any, label?: string, budget?: any): any;
declare function _collectionHistoryCopyBudget(schema: string | null, history: any): any;
declare function _applyAcceptedCrystalMutations(crystal: any, zone: any): void;

const clone = (value: any) => JSON.parse(JSON.stringify(value));
const meta = { mode: 'simulation', scenario: 'surface-history-fixture', seed: 42 };

function surfaceCrystal(): any {
  return {
    crystal_id: 41, mineral: 'quartz', nucleation_step: 1, nucleation_temp: 100.123,
    c_length_mm: 0.6, a_width_mm: 0.24, total_growth_um: 600, _volume_mm3: 0.012,
    habit: 'prismatic', dominant_forms: ['prism'], position: 'vug wall',
    _film: { mineral: 'hematite', phi_term: 0.3, phi_prism: 0.1, step: 2 },
    zones: [{ step: 1, temperature: 100.123, thickness_um: 600, growth_rate: 600,
      trace_Fe: 1, trace_Mn: 0, trace_Al: 0, trace_Ti: 0,
      fluid_inclusion: false, inclusion_type: '', note: '', is_phantom: false }],
  };
}

function exactScientificRecord(record: any) {
  const copy = clone(record);
  delete copy.id;
  delete copy.collected_at;
  return JSON.stringify(copy);
}

function recordedFilmCrystal(): any {
  const crystal = new Crystal({ crystal_id: 41, mineral: 'quartz', habit: 'prismatic',
    nucleation_step: 0, nucleation_temp: 100 });
  const zone = new GrowthZone({ step: 1, temperature: 100, thickness_um: 100, growth_rate: 1 });
  zone._time_scaled = true;
  crystal.add_zone(zone);
  const before = JSON.stringify(crystal.zones);
  expect(applyFilmDusting([crystal], 'chlorite', 0.3, 0.6, 2)).toBe(1);
  expect(JSON.stringify(crystal.zones)).toBe(before);
  expect(validateSurfaceHistory(crystal._surfaceHistory, crystal.zones)).toBe(true);
  return crystal;
}

describe('collection surface history — explicit v2, frozen prior producers', () => {
  it('reproduces legacy and v1 bytes when the live crystal gains a new observer ledger', () => {
    const c = surfaceCrystal();
    const legacy = buildCrystalRecord(c, meta, null);
    const v1 = buildCrystalRecord(c, meta, 'crystal-history-v1');
    expect(v1.history_schema).toBe('crystal-history-v1');
    expect(JSON.stringify(v1.history)).toBe(JSON.stringify({
      crystal: {
        nucleation_step: 1, nucleation_temp: 100.123, c_length_mm: 0.6, a_width_mm: 0.24,
        total_growth_um: 600, _volume_mm3: 0.012,
        _film: { mineral: 'hematite', phi_term: 0.3, phi_prism: 0.1, step: 2 },
      },
      source: { crystal_id: 41 },
    }));
    // Unsupported modern testimony cannot widen, sanitize or invalidate an
    // old producer whose already-issued receipt never contained that field.
    c._surfaceHistory = { schema: 'future-ledger', events: [{ unknown: true }] };
    expect(exactScientificRecord(buildCrystalRecord(c, meta, null))).toBe(exactScientificRecord(legacy));
    expect(exactScientificRecord(buildCrystalRecord(c, meta, 'crystal-history-v1'))).toBe(exactScientificRecord(v1));
    expect(buildCrystalRecord(c, meta, 'crystal-history-v1').zones).toEqual(c.zones);
    expect(reconstructCrystalFromRecord(v1)).not.toHaveProperty('_surfaceHistory');
    expect(() => buildCrystalRecord(c, meta)).toThrow(/surface history/);
  });

  it('does not admit a modern ledger under the v1 schema or a guessed schema', () => {
    const v1 = buildCrystalRecord(surfaceCrystal(), meta, 'crystal-history-v1');
    v1.history.crystal._surfaceHistory = { schema: 'surface-history-v1', events: [] };
    expect(() => assertCrystalCollectionRecord(v1)).toThrow(/crystal history/);
    expect(() => reconstructCrystalFromRecord(v1)).toThrow(/crystal history/);
    v1.history_schema = 'crystal-history-v3';
    expect(() => collectionRecordProducerSchema(v1)).toThrow(/Unsupported/);
  });

  it('retains unavailable chronology across all three schema generations', () => {
    const c = surfaceCrystal();
    for (const schema of [null, 'crystal-history-v1', 'crystal-history-v2']) {
      const record = buildCrystalRecord(c, meta, schema);
      const stand = reconstructCrystalFromRecord(record);
      expect(stand).not.toHaveProperty('_surfaceHistory');
      if (schema) expect(record.history.crystal).not.toHaveProperty('_surfaceHistory');
    }
    expect(buildCrystalRecord(c, meta).history_schema).toBe('crystal-history-v2');
  });

  it('rejects malformed v2 ledger containers before reconstruction', () => {
    const base = buildCrystalRecord(surfaceCrystal(), meta);
    for (const history of [null, true, 42, 'unknown', [], { schema: 'unknown', events: [] }]) {
      const record = clone(base);
      record.history.crystal._surfaceHistory = history;
      expect(() => assertCrystalCollectionRecord(record)).toThrow(/surface history/);
      expect(() => reconstructCrystalFromRecord(record)).toThrow(/surface history/);
    }
  });

  it('deeply retains a real writer ledger only in v2 and includes it in the scientific digest', () => {
    const c = recordedFilmCrystal();
    expect(c._surfaceHistory.initial).toEqual({ step: 2, zone_count: 1, surface_um: 100, film: null });
    expect(c._surfaceHistory.events[0]).toMatchObject({ event: 'dusting', step: 2,
      coverage_change: { term: 0.3, prism: 0.6 } });
    const record = buildCrystalRecord(c, meta);
    expect(record.history_schema).toBe('crystal-history-v2');
    expect(record.history.crystal._surfaceHistory).toEqual(c._surfaceHistory);
    expect(record.history.crystal._surfaceHistory).not.toBe(c._surfaceHistory);
    const stand = reconstructCrystalFromRecord(record);
    expect(stand._surfaceHistory).toEqual(c._surfaceHistory);
    expect(validateSurfaceHistory(stand._surfaceHistory, stand.zones)).toBe(true);
    stand._surfaceHistory.events[0].operation.phi_term = 0.9;
    expect(record.history.crystal._surfaceHistory.events[0].operation.phi_term).toBe(0.3);
    expect(c._surfaceHistory.events[0].operation.phi_term).toBe(0.3);

    const without = clone(record);
    delete without.history.crystal._surfaceHistory;
    // Missing history is valid unknown testimony, but it is different science
    // and cannot be substituted for the recorded ledger in an authenticated receipt.
    expect(assertCrystalCollectionRecord(without)).toBe(true);
    expect(_saveSpecimenScienceDigest(without)).not.toBe(_saveSpecimenScienceDigest(record));
    expect(buildCrystalRecord(c, meta, 'crystal-history-v1').history.crystal).not.toHaveProperty('_surfaceHistory');
    expect(buildCrystalRecord(c, meta, null)).not.toHaveProperty('history');
    record.history.crystal._surfaceHistory.initial.surface_um = 999;
    expect(c._surfaceHistory.initial.surface_um).toBe(100);
  });

  it('rejects coverage, chronology and accepted-zone tampering through the shared ledger validator', () => {
    const base = buildCrystalRecord(recordedFilmCrystal(), meta);
    for (const mutate of [
      (r: any) => r.history.crystal._surfaceHistory.events[0].coverage_change.term = 0.9,
      (r: any) => r.history.crystal._surfaceHistory.events[0].operation.step = 1,
      (r: any) => r.history.crystal._surfaceHistory.events[0].seq = 2,
      (r: any) => r.history.crystal._surfaceHistory.initial.zone_count = 99,
      (r: any) => r.zones[0].thickness_um = 200,
    ]) {
      const r = clone(base); mutate(r);
      expect(validateSurfaceHistory(r.history.crystal._surfaceHistory, r.zones)).toBe(false);
      expect(() => assertCrystalCollectionRecord(r)).toThrow(/surface history/);
      expect(() => reconstructCrystalFromRecord(r)).toThrow(/surface history/);
    }
  });

  it('grants the 20,000-copy bound only to v2 ledger events, retaining legacy and zone limits', () => {
    // Isolate allocation policy from event physics: the smaller writer tests
    // above exercise the ledger validator. This boundary should not require
    // replaying twenty thousand coating operations just to bound a copy.
    const events = Array.from({ length: 20_000 }, (_, i) => ({ seq: i + 1 }));
    const history: any = { crystal: { _surfaceHistory: { events } }, source: {} };
    expect(_collectionHistoryCopy(history, 'history', _collectionHistoryCopyBudget('crystal-history-v2', history))
      .crystal._surfaceHistory.events).toHaveLength(20_000);
    expect(() => _collectionHistoryCopy(history, 'history', _collectionHistoryCopyBudget('crystal-history-v1', history)))
      .toThrow(/bounds/);
    expect(() => _collectionHistoryCopy(Array(10_001).fill(0), 'zones', _collectionHistoryCopyBudget('crystal-history-v2', history)))
      .toThrow(/bounds/);
    history.source.unrelated = Array(10_001).fill(0);
    expect(() => _collectionHistoryCopy(history, 'history', _collectionHistoryCopyBudget('crystal-history-v2', history)))
      .toThrow(/bounds/);
    delete history.source.unrelated;
    events.push({ seq: 20_001 });
    expect(() => _collectionHistoryCopy(history, 'history', _collectionHistoryCopyBudget('crystal-history-v2', history)))
      .toThrow(/bounds/);
  });

  it('rejects future initial testimony and a ledger that contradicts its accepted burial zone', () => {
    const c = recordedFilmCrystal();
    delete c._surfaceHistory;
    applyFilmDusting([c], 'chlorite', 0.4, 0.7, 3);
    const zone = new GrowthZone({ step: 4, temperature: 100, thickness_um: 40, growth_rate: 1 });
    zone._time_scaled = true;
    zone.masked_horizon = true; zone.film_mineral = c._film.mineral;
    zone.masked_phi_term = c._film.phi_term; zone.masked_phi_prism = c._film.phi_prism;
    zone.originating_film_step = c._film.step; zone._clear_film_on_accept = true;
    _applyAcceptedCrystalMutations(c, zone); c.add_zone(zone);
    const base = buildCrystalRecord(c, meta);
    expect(assertCrystalCollectionRecord(base)).toBe(true);
    for (const mutate of [
      (r: any) => r.history.crystal._surfaceHistory.initial.film.step = 5,
      (r: any) => r.history.crystal._surfaceHistory.initial.film.operations[0].step = 5,
      (r: any) => r.zones[1].film_mineral = 'hematite',
      (r: any) => r.zones[1].masked_phi_term = 0.9,
      (r: any) => r.zones[1].masked_phi_prism = 0.1,
      (r: any) => r.zones[1].originating_film_step = 2,
    ]) {
      const changed = clone(base); mutate(changed);
      expect(() => assertCrystalCollectionRecord(changed)).toThrow(/surface history/);
      expect(() => reconstructCrystalFromRecord(changed)).toThrow(/surface history/);
    }
  });

  it('requires complete projected history to agree with an explicitly recorded final film', () => {
    const base = buildCrystalRecord(recordedFilmCrystal(), meta);
    for (const finalFilm of [null, { ...clone(base.history.crystal._film), mineral: 'hematite' },
      { ...clone(base.history.crystal._film), phi_term: 0.8 }]) {
      const changed = clone(base); changed.history.crystal._film = finalFilm;
      expect(() => assertCrystalCollectionRecord(changed)).toThrow(/surface history/);
    }
    const absent = clone(base); delete absent.history.crystal._film;
    expect(assertCrystalCollectionRecord(absent)).toBe(true);
    const unavailable = clone(base);
    unavailable.history.crystal._surfaceHistory.unavailable = { reason: 'observation-gap', step: 3, zone_count: 1 };
    unavailable.history.crystal._film = null;
    expect(assertCrystalCollectionRecord(unavailable)).toBe(true);
  });
});
