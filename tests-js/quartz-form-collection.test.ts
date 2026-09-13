import { beforeEach, describe, expect, it } from 'vitest';

declare const Crystal: any, GrowthZone: any;
declare function recordQuartzFormObservations(sim: any): void;
declare function quartzFormObservationAtStep(crystal: any, step: number): any;
declare function buildCrystalRecord(c: any, meta: any, schema?: string | null): any;
declare function reconstructCrystalFromRecord(record: any): any;
declare function assertCrystalCollectionRecord(record: any): boolean;
declare function collectionRecordProducerSchema(record: any): string | null;
declare function applyFilmDusting(crystals: any[], mineral: string, term: number, prism: number, step: number): number;
declare function fortressBeginFromScenario(name: string, seed: number): void;
declare function fortressStep(action: string, payload?: any): void;
declare function fortressReset(): void;
declare function setFortressInstantLines(value: boolean): void;
declare function _liveFortressSim(): any;
declare function _liveSaveActiveRecord(): any;
declare function loadSaveById(id: string): boolean;
declare function loadCrystals(): any[];
declare function _saveCommitCreativeCollection(entries: any[]): any;
declare function _saveCollectionReceiptId(run: string, index: number, cursor: number, record: any): string;
declare function _saveCollectionRecordId(receiptId: string): string;
declare function _saveCollectionReceiptDigest(receipt: any): string;
declare function _saveAuthenticateCollectionReceiptAgainstLive(receipt: any, run: string): any;
declare function _saveSpecimenScienceDigest(record: any): string;
declare function _saveLibraryRecordDigest(record: any): string;
declare function _saveBuildFinishTransaction(): any;
declare function _saveFinishTransactionDigest(tx: any): string;
declare function _saveAuthenticateFinishTransactionAgainstLive(tx: any, id: string, library: any[]): boolean;

const copy = (value: any) => JSON.parse(JSON.stringify(value));
const meta = { mode: 'simulation', scenario: 'controlled-quartz-observation', seed: 42 };
function addZone(c: any, step: number, thickness = 100) {
  const z = new GrowthZone({ step, temperature: 100, thickness_um: thickness, growth_rate: 1 });
  z._time_scaled = true; c.add_zone(z);
}
function specimen(id: number | string = 41) {
  const c = new Crystal({ crystal_id: id, mineral: 'quartz', habit: 'prismatic', nucleation_step: 0, nucleation_temp: 100 });
  addZone(c, 1);
  return c;
}
function observe(c: any, step = 1, sim: any = { crystals: [c] }) {
  sim.step = step; recordQuartzFormObservations(sim); return sim;
}
function scienceBytes(record: any) {
  const r = copy(record); delete r.id; delete r.collected_at; return JSON.stringify(r);
}
function receiptFor(record: any, active: any, index: number) {
  const r: any = { schema: 1, run_id: active.run_id, crystal_index: index, action_cursor: active.actions.length, record };
  r.id = _saveCollectionReceiptId(r.run_id, index, r.action_cursor, record);
  record.id = _saveCollectionRecordId(r.id); r.digest = _saveCollectionReceiptDigest(r);
  return r;
}

describe('collection v3 — recorded quartz form observations', () => {
  it('freezes the exact non-enumerable ledger and source identity without running a new observation', () => {
    const c = specimen(), sim = observe(c);
    observe(c, 2, sim); // quiet interval extends coverage, not the snapshot list
    c.twinned = true; c.twin_law = 'Dauphiné'; c._polymorph = 'beta'; c.mineral_display = 'model label';
    c._gwindel = { twistDeg: 60, lengthUm: 100, span: 1 }; c._split = null;
    observe(c, 3, sim);
    c._polymorph = null; delete c.mineral_display; delete c._gwindel;
    c.dominant_forms = ['{101}']; observe(c, 4, sim);
    const original = c._quartzFormHistory, before = JSON.stringify(original);
    expect(Object.keys(c)).not.toContain('_quartzFormHistory');
    const record = buildCrystalRecord(c, { ...meta, sim });
    expect(record.history_schema).toBe('crystal-history-v3');
    expect(record.history.crystal._quartzFormHistory).toEqual(original);
    expect(record.history.crystal._quartzFormHistory).not.toBe(original);
    expect(record.history.crystal).toMatchObject({ twinned: true, twin_law: 'Dauphiné', _polymorph: null });
    expect(record.history.crystal).not.toHaveProperty('mineral_display');
    const stand = reconstructCrystalFromRecord(record);
    expect(stand.crystal_id).not.toBe(c.crystal_id);
    expect(stand._collectionSourceHistory.crystal_id).toBe(c.crystal_id);
    expect(stand._quartzFormHistory.source_crystal_id).toBe(c.crystal_id);
    for (const step of [0, 1, 2, 3, 4, 5]) {
      expect(quartzFormObservationAtStep(stand, step)).toEqual(quartzFormObservationAtStep(c, step));
    }
    expect(Object.isFrozen(stand._quartzFormHistory)).toBe(true);
    expect(Object.isFrozen(stand._quartzFormHistory.changes[0].snapshot)).toBe(true);
    expect(() => stand._quartzFormHistory.changes.push({})).toThrow();
    expect(() => { stand._quartzFormHistory = {}; }).toThrow();
    record.history.crystal._quartzFormHistory.initial.snapshot.habit = 'edited';
    expect(JSON.stringify(original)).toBe(before);
    expect(stand._quartzFormHistory.initial.snapshot.habit).toBe('prismatic');
    expect(c._quartzFormHistory).toBe(original);
  });

  it('reproduces exact prior producers and retains v2 surface history when quartz observations appear', () => {
    const c = specimen(); applyFilmDusting([c], 'chlorite', 0.3, 0.6, 1);
    const schemas = [null, 'crystal-history-v1', 'crystal-history-v2'];
    const old = schemas.map(schema => buildCrystalRecord(c, meta, schema));
    observe(c);
    schemas.forEach((schema, i) => {
      const current = buildCrystalRecord(c, meta, schema);
      expect(scienceBytes(current)).toBe(scienceBytes(old[i]));
      expect(current.history?.crystal?._quartzFormHistory).toBeUndefined();
    });
    const v2 = buildCrystalRecord(c, meta, 'crystal-history-v2'), v3 = buildCrystalRecord(c, meta);
    expect(v2.history.crystal._surfaceHistory).toEqual(c._surfaceHistory);
    expect(v3.history.crystal._surfaceHistory).toEqual(v2.history.crystal._surfaceHistory);
    expect(v2.zones).toEqual(v3.zones);
    const withoutQuartz = copy(v3); delete withoutQuartz.history.crystal._quartzFormHistory;
    expect(_saveSpecimenScienceDigest(withoutQuartz)).not.toBe(_saveSpecimenScienceDigest(v3));
    for (const schema of ['crystal-history-v1', 'crystal-history-v2']) {
      const wrong = copy(v3); wrong.history_schema = schema;
      expect(() => assertCrystalCollectionRecord(wrong)).toThrow(/crystal history/);
    }
    const unknown = copy(v3); unknown.history_schema = 'crystal-history-v4';
    expect(() => collectionRecordProducerSchema(unknown)).toThrow(/Unsupported/);
  });

  it('retains absent chronology and explicit unavailable prefixes without inventing a final state', () => {
    const c = specimen();
    for (const schema of [null, 'crystal-history-v1', 'crystal-history-v2', 'crystal-history-v3']) {
      expect(reconstructCrystalFromRecord(buildCrystalRecord(c, meta, schema))).not.toHaveProperty('_quartzFormHistory');
    }
    const sim = observe(c, 2); c.habit = 'late current form'; observe(c, 4, sim);
    const closed = copy(c._quartzFormHistory);
    expect(closed.unavailable).toEqual({ reason: 'observation-gap', step: 3 });
    const stand = reconstructCrystalFromRecord(buildCrystalRecord(c, meta));
    expect(stand._quartzFormHistory).toEqual(closed);
    expect(stand.habit).toBe('late current form');
    expect(quartzFormObservationAtStep(stand, 2).snapshot.habit).toBe('prismatic');
    expect(quartzFormObservationAtStep(stand, 3).status).toBe('unavailable');
    const failed = specimen(42); failed._gwindel = { bad: true }; const failedSim = observe(failed);
    delete failed._gwindel;
    const failure = reconstructCrystalFromRecord(buildCrystalRecord(failed, { ...meta, sim: failedSim }));
    expect(failure._quartzFormHistory.initial).toBeNull();
    expect(failure._quartzFormHistory.observed_through_step).toBeNull();
    expect(failure._quartzFormHistory.unavailable.reason).toBe('invalid-descriptor');
  });

  it('rejects malformed, wrong-source, contradictory and uncovered observations at import', () => {
    const c = specimen(), sim = observe(c);
    addZone(c, 2); observe(c, 2, sim);
    const base = buildCrystalRecord(c, meta);
    const mutations = [
      (r: any) => r.history.crystal._quartzFormHistory = null,
      (r: any) => r.history.crystal._quartzFormHistory = true,
      (r: any) => r.history.crystal._quartzFormHistory.schema = 'quartz-form-observations-v2',
      (r: any) => r.history.crystal._quartzFormHistory.source_crystal_id = 99,
      (r: any) => r.history.source.crystal_id = 99,
      (r: any) => r.history.crystal._quartzFormHistory.initial.zone_count = 2,
      (r: any) => r.history.crystal._quartzFormHistory.observed_zone_count = 1,
      (r: any) => r.history.crystal._quartzFormHistory.observed_through_step = 0,
      (r: any) => r.history.crystal._quartzFormHistory.initial.snapshot.split_presence = 'guessed',
      (r: any) => r.history.crystal._quartzFormHistory.initial.snapshot.habit = 'false form',
      (r: any) => r.history.crystal.habit = 'contradictory form',
      (r: any) => r.history.crystal.twinned = true,
      (r: any) => r.history.crystal.dominant_forms = ['changed'],
      (r: any) => r.history.crystal._polymorph = 'invented',
      (r: any) => r.history.crystal.nucleation_step = 8,
      (r: any) => r.mineral = 'chalcedony',
      (r: any) => r.zones[0].step = 3,
    ];
    for (const mutate of mutations) {
      const changed = copy(base); mutate(changed);
      expect(() => assertCrystalCollectionRecord(changed)).toThrow();
      expect(() => reconstructCrystalFromRecord(changed)).toThrow();
    }
  });

  it('rejects current contradictions and private attachment failures without modifying the observer', () => {
    const c = specimen(); observe(c);
    const accepted = c._quartzFormHistory;
    c.habit = 'changed after finalized observation';
    expect(() => buildCrystalRecord(c, meta)).toThrow(/quartz/i);
    expect(c._quartzFormHistory).toBe(accepted);
    const blocked = specimen(42);
    Object.defineProperty(blocked, '_quartzFormHistory', { value: undefined, configurable: true });
    observe(blocked); delete blocked._quartzFormHistory;
    expect(() => buildCrystalRecord(blocked, meta)).toThrow(/quartz/i);
    expect(buildCrystalRecord(blocked, meta, 'crystal-history-v2').history.crystal).not.toHaveProperty('_quartzFormHistory');
  });

  it('rejects observations before known birth even in closed histories while preserving unknown birth', () => {
    for (const closed of [false, true]) {
      const c = specimen(), sim = observe(c);
      if (closed) observe(c, 3, sim);
      const valid = buildCrystalRecord(c, meta);
      const bad = copy(valid); bad.history.crystal.nucleation_step = 8; bad.source.nucleation_step = 8;
      expect(() => assertCrystalCollectionRecord(bad)).toThrow(/nucleation/);
      c.nucleation_step = 8;
      expect(() => buildCrystalRecord(c, meta)).toThrow(/nucleation/);
      for (const birth of [null, undefined]) {
        c.nucleation_step = birth;
        expect(assertCrystalCollectionRecord(buildCrystalRecord(c, meta))).toBe(true);
      }
    }
  });

  it('rejects conflicting duplicate birth metadata and removes legacy defaults for absent v3 fields', () => {
    const c = specimen();
    for (const key of ['nucleation_step', 'habit', 'dominant_forms', 'twinned', 'twin_law']) delete c[key];
    observe(c);
    const record = buildCrystalRecord(c, meta), stand = reconstructCrystalFromRecord(record);
    for (const key of ['nucleation_step', 'habit', 'dominant_forms', 'twinned', 'twin_law']) expect(stand).not.toHaveProperty(key);
    expect(quartzFormObservationAtStep(stand, 1)).toEqual(quartzFormObservationAtStep(c, 1));
    for (const field of ['source', 'history']) {
      const changed = copy(record);
      if (field === 'source') changed.source.nucleation_step = 8;
      else changed.history.crystal.nucleation_step = 8;
      expect(() => reconstructCrystalFromRecord(changed)).toThrow(/nucleation/);
    }
  });

  it('preserves valid string source identities but refuses to relabel an identity-change closure', () => {
    const c = specimen('source-quartz-41'); observe(c);
    const record = buildCrystalRecord(c, meta), stand = reconstructCrystalFromRecord(record);
    expect(record.history.source.crystal_id).toBe('source-quartz-41');
    expect(stand._quartzFormHistory.source_crystal_id).toBe('source-quartz-41');
    const changed = specimen(), sim = observe(changed); changed.crystal_id = 99; observe(changed, 2, sim);
    expect(changed._quartzFormHistory.unavailable.reason).toBe('identity-change');
    expect(() => buildCrystalRecord(changed, meta)).toThrow(/quartz/i);
  });
});

describe('collection v3 — authenticated command replay', () => {
  beforeEach(() => { localStorage.clear(); setFortressInstantLines(true); fortressReset(); });
  it('rejects modified or removed quartz observations after rehashing receipts and earlier-specimen finish baselines', () => {
    fortressBeginFromScenario('tutorial_first_crystal', 42); fortressStep('wait');
    const activeBefore = _liveSaveActiveRecord(), simBefore = _liveFortressSim();
    const index = simBefore.crystals.findIndex((c: any) => c._quartzFormHistory?.initial && c.total_growth_um > 0.1);
    expect(index).toBeGreaterThanOrEqual(0);
    const observed = copy(simBefore.crystals[index]._quartzFormHistory), saveId = activeBefore.id;
    fortressReset(); expect(loadSaveById(saveId)).toBe(true);
    const active = _liveSaveActiveRecord(), crystal = _liveFortressSim().crystals[index];
    expect(crystal._quartzFormHistory).toEqual(observed);
    const original = buildCrystalRecord(crystal, { mode: 'creative', run_id: active.run_id, crystal_index: index });
    expect(_saveAuthenticateCollectionReceiptAgainstLive(receiptFor(copy(original), active, index), active.run_id)).toBe(crystal);
    const falseObservation = copy(original), h = falseObservation.history.crystal._quartzFormHistory;
    const last = h.changes.length ? h.changes[h.changes.length - 1] : h.initial;
    last.snapshot.twinned = !last.snapshot.twinned;
    falseObservation.history.crystal.twinned = last.snapshot.twinned;
    falseObservation.twinned = last.snapshot.twinned;
    const falseCoverage = copy(original); falseCoverage.history.crystal._quartzFormHistory.observed_through_step++;
    const removed = copy(original); delete removed.history.crystal._quartzFormHistory;
    for (const forged of [falseObservation, falseCoverage, removed]) {
      expect(assertCrystalCollectionRecord(forged)).toBe(true);
      expect(() => _saveAuthenticateCollectionReceiptAgainstLive(receiptFor(copy(forged), active, index), active.run_id)).toThrow(/match replayed/);
    }
    expect(_saveCommitCreativeCollection([{ crystal, record: original }]).ok).toBe(true);
    fortressStep('wait'); // The authenticated collection is now an earlier snapshot.
    const library = loadCrystals(), tx = _saveBuildFinishTransaction();
    expect(_saveAuthenticateFinishTransactionAgainstLive(tx, active.id, library)).toBe(true);
    for (const replacement of [falseObservation, falseCoverage, removed]) {
      replacement.id = library[0].id;
      const forged = copy(tx), baseline = forged.library_baseline.find((e: any) => e.id === replacement.id);
      baseline.science_digest = _saveSpecimenScienceDigest(replacement);
      baseline.record_digest = _saveLibraryRecordDigest(replacement);
      forged.digest = _saveFinishTransactionDigest(forged);
      expect(() => _saveAuthenticateFinishTransactionAgainstLive(forged, active.id, [replacement, ...library.slice(1)]))
        .toThrow(/bound to its baseline/);
    }
    expect(loadCrystals()).toEqual(library);
  });
});
