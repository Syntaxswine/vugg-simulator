import { beforeEach, describe, expect, it, vi } from 'vitest';

declare function buildCrystalRecord(c: any, meta: any, schema?: string | null): any;
declare function reconstructCrystalFromRecord(r: any): any;
declare function assertCrystalCollectionRecord(r: any): boolean;
declare function collectionRecordProducerSchema(r: any): string | null;
declare function fortressBeginFromScenario(name: string, seed: number): void;
declare function fortressStep(action: string): void;
declare function fortressFinish(): void;
declare function fortressReset(): void;
declare function setFortressInstantLines(v: boolean): void;
declare function _liveFortressSim(): any;
declare function _liveSaveActiveRecord(): any;
declare function _saveCommitCreativeCollection(entries: any[]): any;
declare function _saveAuthenticateCollectionReceiptAgainstLive(receipt: any, run: string): any;
declare function _saveCollectionReceiptId(run: string, index: number, cursor: number, record: any): string;
declare function _saveCollectionRecordId(id: string): string;
declare function _saveCollectionReceiptDigest(receipt: any): string;
declare function _saveFinishTransactionDigest(tx: any): string;
declare function _saveRecipeDigest(r: any): string;
declare function _saveEnvelopeDigest(e: any): string;
declare function _saveSpecimenScienceDigest(r: any): string;
declare function _saveLibraryRecordDigest(r: any): string;
declare function _saveBuildFinishTransaction(): any;
declare function _saveAuthenticateFinishTransactionAgainstLive(tx: any, id: string, library: any[]): any;
declare function loadCrystals(): any[];
declare function loadSaves(): any[];
declare function loadLifetimeStats(): any;
declare function loadSaveById(id: string): boolean;
declare function deleteCollectedCrystal(id: string): void;
declare function classifySurfaceGrowth(sim: any): void;
declare function applyDifferentialStressPulse(sim: any, sigma: number): any;
declare function findPseudomorphRoute(parent: string, child: string): any;
declare function cdrReplacementEvidence(host: any, route: any, child: string): any;

const clone = (value: any) => JSON.parse(JSON.stringify(value));

function richCrystal(): any {
  return {
    crystal_id: 7, mineral: 'barite', nucleation_step: 2, nucleation_temp: 82.123,
    c_length_mm: 1.234567, a_width_mm: 2.987654, total_growth_um: 1234.567,
    _volume_mm3: 5.41234, habit: 'tabular', dominant_forms: ['{001}', '{210}'],
    twinned: false, position: 'vug wall', growth_environment: 'fluid',
    _nucTilt: { theta: 0.14, azim: 2.7 }, _occlusion: { attachedFraction: 0.3 },
    _peak_differential_stress_mpa: 12, _resolved_shear_mpa: 4.1,
    _twin_density_per_mm: 3, _mechanical_twin_type: 'e-twin',
    _split: { index: 0.1, rung: 'split', route: 'A', dominant: 'A', sumA: 0.1, sumB: 0,
      driver: { sigma: 1.2, impurity: 0.02 } },
    wall_anchor: { phi: 1.2, theta: 0.5, ringIdx: 3, cellIdx: 4 },
    enclosed_by: 3, enclosed_crystals: [], enclosed_at_step: [], coats_front: true,
    cdr_replaces_crystal_id: 2, perimorph_eligible: true,
    etch_history: [{ schema: 'physical-dissolution-v1', step: 4, accepted: true, axialLossUm: 3 }],
    phase_transition_history: [{ schema: 'test-record', from: 'barite', to: 'barite', step: 5 }],
    dehydration_history: [], _film: { mineral: 'hematite', phi_term: 0.3, phi_prism: 0.1, step: 6,
      operations: [{ kind: 'dust-max', source_id: 'event-dusting:6:7:hematite', mineral: 'hematite',
        phi_term: 0.3, phi_prism: 0.1, step: 6 }] },
    zones: [{ step: 2, temperature: 82.123, thickness_um: 1234.567, growth_rate: 0.031,
      trace_Fe: 1.5, trace_Mn: 0, trace_Al: 0, trace_Ti: 0, trace_Au: 0.0003,
      trace_Sr: 24.5, trace_Co: 0.125, aspect_ratio: 1.5,
      formula_stoichiometry: { Ba: 0.8, Sr: 0.2, S: 1 }, trace_stoichiometry: { Co: 0.0001 },
      solid_solution: { componentMoleFractions: { barite: 0.8, celestine: 0.2 },
        activityCoefficients: { barite: 1.05, celestine: 1.4 },
        componentActivities: { barite: 0.84, celestine: 0.28 },
        guggenheimKJMol: [4.2], guggenheimDimensionless: [1.42] },
      _remaining_solid_um: 1234.567, _budget_inventory_per_um: { Ba: 0.1, S: 0.02 },
      fluid_inclusion: true, inclusion_type: 'fluid', is_phantom: false,
      masked_horizon: true, film_mineral: 'hematite', masked_phi_term: 0.3,
      masked_phi_prism: 0.1, originating_film_step: 1 }],
  };
}

function actualRun() {
  fortressBeginFromScenario('tutorial_first_crystal', 42);
  fortressStep('wait');
  const sim = _liveFortressSim();
  const index = sim.crystals.findIndex((c: any) => c.total_growth_um > 0.1);
  expect(index).toBeGreaterThanOrEqual(0);
  const active = _liveSaveActiveRecord();
  return { sim, index, crystal: sim.crystals[index], active,
    meta: { mode: 'creative', run_id: active.run_id, crystal_index: index } };
}

function receiptFor(record: any, run: string, index: number, cursor: number) {
  const receipt: any = { schema: 1, run_id: run, crystal_index: index, action_cursor: cursor, record };
  receipt.id = _saveCollectionReceiptId(run, index, cursor, record);
  receipt.record.id = _saveCollectionRecordId(receipt.id);
  receipt.digest = _saveCollectionReceiptDigest(receipt);
  return receipt;
}

beforeEach(() => {
  localStorage.clear();
  setFortressInstantLines(true);
  fortressReset();
});

describe('R7 collection history — preserved testimony and legacy authentication', () => {
  it('deep-copies chemistry, masking, precise size and descriptors, keeping old cavity relationships inert', () => {
    const c = richCrystal();
    const e = { schema: 'enclosure-receipt-v1', event: 'enclosed', host_crystal_id: 3, guest_crystal_id: 7,
      host_mineral: 'calcite', guest_mineral: 'barite', step: 6, route: 'guest-on-host' };
    const lifecycle = [
      { ...e, host_crystal_id: 9, step: 3 },
      { ...e, schema: 'liberation-receipt-v1', event: 'liberated', host_crystal_id: 9, step: 4, enclosure_step: 3 },
      e,
    ];
    const record = buildCrystalRecord(c, { mode: 'simulation', scenario: 'fixture', seed: 42,
      sim: { crystals: [c], _enclosureReceipts: [...lifecycle, { ...e, guest_crystal_id: 11 }] } });
    expect(record.history_schema).toBe('crystal-history-v1');
    expect(record.zones).toEqual(clone(c.zones));
    expect(record.history.source).toMatchObject({ crystal_id: 7, enclosed_by: 3, cdr_replaces_crystal_id: 2 });
    expect(record.history.enclosure_lifecycle).toEqual(lifecycle);
    const stand = reconstructCrystalFromRecord(record);
    expect(stand.c_length_mm).toBe(1.234567);
    expect(stand.nucleation_step).toBe(2);
    expect(stand.nucleation_temp).toBe(82.123);
    expect(stand._nucTilt).toEqual(c._nucTilt);
    expect(stand._peak_differential_stress_mpa).toBe(12);
    expect(stand._resolved_shear_mpa).toBe(4.1);
    expect(stand._twin_density_per_mm).toBe(3);
    expect(stand._mechanical_twin_type).toBe('e-twin');
    expect(stand._film.operations).toEqual(c._film.operations);
    expect(stand.etch_history).toEqual(c.etch_history);
    expect(stand._collectionEnclosureHistory).toEqual(lifecycle);
    expect(stand.enclosed_by).toBeUndefined();
    expect(stand.wall_anchor).toBeUndefined();
    expect(stand.cdr_replaces_crystal_id).toBeUndefined();
    expect(stand.enclosed_crystals).toEqual([]);
    expect(stand.crystal_id).not.toBe(c.crystal_id);
    stand.zones[0].solid_solution.componentActivities.barite = 999;
    stand._film.operations[0].phi_term = 1;
    record.zones[0].formula_stoichiometry.Ba = 0;
    expect(c.zones[0].solid_solution.componentActivities.barite).toBe(0.84);
    expect(record._film).toBeUndefined();
    expect(record.history.crystal._film.operations[0].phi_term).toBe(0.3);
    expect(c.zones[0].formula_stoichiometry.Ba).toBe(0.8);
  });

  it('retains missing trace testimony, and never invents zones from legacy counts', () => {
    const c = richCrystal();
    delete c.zones[0].trace_Fe;
    c.phase_transition_history[0].step = null;
    const record = buildCrystalRecord(c, { mode: 'simulation' });
    expect(record.zones[0]).not.toHaveProperty('trace_Fe');
    expect(reconstructCrystalFromRecord(record).zones[0]).not.toHaveProperty('trace_Fe');
    expect(reconstructCrystalFromRecord(record).phase_transition_history[0].step).toBeNull();
    const legacy = buildCrystalRecord(c, { mode: 'simulation' }, null);
    expect(legacy.history_schema).toBeUndefined();
    expect(legacy.zones[0]).not.toHaveProperty('aspect_ratio');
    legacy.zones = 11;
    legacy.zone_count = 11;
    expect(reconstructCrystalFromRecord(legacy).zones).toEqual([]);
    expect(reconstructCrystalFromRecord(legacy).dissolved).toBe(true);
  });

  it('round-trips production surface stratigraphy, mechanical twins and inert accepted CDR evidence', () => {
    const fabricA = { ...richCrystal(), crystal_id: 21, mineral: 'chalcedony', habit: 'banded', nucleation_step: 1 };
    const fabricB = { ...richCrystal(), crystal_id: 22, mineral: 'chalcedony', habit: 'banded', nucleation_step: 2 };
    const sim = { crystals: [fabricA, fabricB], step: 8, wall_state: {
      surfaceAreaForCrystal: () => 100, meanDiameterMm: () => 50,
      surfaceNormalForCrystal: () => [0, 1, 0],
    } };
    classifySurfaceGrowth(sim);
    expect((fabricA as any)._surfaceGrowth.underlying_surface_crystal_ids).toEqual([]);
    expect((fabricB as any)._surfaceGrowth.underlying_surface_crystal_ids).toEqual([21]);
    expect((fabricB as any)._surfaceGrowth.stratigraphy_basis).toBe('spherical-cap fallback');
    for (const fabric of sim.crystals) {
      const record = buildCrystalRecord(fabric, { mode: 'simulation', sim });
      expect(reconstructCrystalFromRecord(record)._surfaceGrowth).toEqual((fabric as any)._surfaceGrowth);
      record.history.crystal._surfaceGrowth.underlying_surface_crystal_ids = ['21'];
      expect(() => assertCrystalCollectionRecord(record)).toThrow(/underlying surface/);
    }

    const calcite = { ...richCrystal(), mineral: 'calcite', _stress_orientation_unit: 1 };
    applyDifferentialStressPulse({ crystals: [calcite], step: 9, conditions: { temperature: 180 } }, 40);
    expect((calcite as any)._mechanical_twinned).toBe(true);
    const stressStand = reconstructCrystalFromRecord(buildCrystalRecord(calcite, { mode: 'simulation' }));
    expect(stressStand._mechanical_twinned).toBe(true);
    expect(stressStand._mechanical_twin_law).toBe('mechanical e-twin {01-12}');
    expect(stressStand._deformation).toEqual((calcite as any)._deformation);
    expect(stressStand._resolved_shear_mpa).toBe(20);

    const host = { crystal_id: 33, mineral: 'azurite',
      zones: [{ step: 4, thickness_um: -12, dissolutionMode: 'low_co3' }] };
    const evidence = cdrReplacementEvidence(host, findPseudomorphRoute('azurite', 'malachite'), 'malachite');
    expect(evidence.parent_loss_um).toBe(12);
    const child = { ...richCrystal(), mineral: 'malachite', cdr_replaces_crystal_id: 33,
      cdr_replacement_evidence: evidence };
    const record = buildCrystalRecord(child, { mode: 'simulation' });
    const stand = reconstructCrystalFromRecord(record);
    expect(stand._collectionSourceHistory.cdr_replacement_evidence).toEqual(evidence);
    expect(stand.cdr_replacement_evidence).toBeUndefined();
    stand._collectionSourceHistory.cdr_replacement_evidence.matching_zone_steps[0] = 99;
    expect(record.history.source.cdr_replacement_evidence.matching_zone_steps).toEqual([4]);
    expect(evidence.matching_zone_steps).toEqual([4]);
    record.history.source.cdr_replacement_evidence.matching_zone_steps[0] = '4';
    expect(() => assertCrystalCollectionRecord(record)).toThrow(/CDR replacement/);
  });

  it('rejects unsupported schemas and malformed bounded nested values before reconstruction', () => {
    const base = buildCrystalRecord(richCrystal(), { mode: 'simulation' });
    const mutations = [
      (r: any) => r.history_schema = 'crystal-history-v99',
      (r: any) => delete r.history_schema,
      (r: any) => r.history.crystal = true,
      (r: any) => r.history.source = 7,
      (r: any) => r.history.crystal._nucTilt.theta = '0.1',
      (r: any) => r.history.crystal._split.driver.sigma = { value: 1 },
      (r: any) => r.zones[0].solid_solution.componentActivities.barite = '0.84',
      (r: any) => r.zones[0].trace_Co = { ppm: 1 },
      (r: any) => r.history.crystal._film.operations = 'not a list',
      (r: any) => r.history.source.enclosed_by = '7',
      (r: any) => r.history.crystal.etch_history = [new Array(10_001).fill(0)],
      (r: any) => r.zones[0].formula_stoichiometry = JSON.parse('{"__proto__":1}'),
      (r: any) => r.history.crystal._volume_mm3 = Infinity,
    ];
    for (const mutate of mutations) {
      const r = clone(base); mutate(r);
      expect(() => assertCrystalCollectionRecord(r)).toThrow();
      expect(() => reconstructCrystalFromRecord(r)).toThrow();
    }
    const legacy = buildCrystalRecord(richCrystal(), { mode: 'simulation' }, null);
    let nested = legacy.zones[0];
    for (let i = 0; i < 20; i++) nested = nested.unrecognized = {};
    expect(() => assertCrystalCollectionRecord(legacy)).toThrow(/bounds/);
  });

  it('authenticates both producer generations and rejects self-rehashed false geometry or chemistry', () => {
    const { crystal, index, active, meta } = actualRun();
    for (const schema of [null, 'crystal-history-v1']) {
      const receipt = receiptFor(buildCrystalRecord(crystal, meta, schema), active.run_id, index, active.actions.length);
      expect(_saveAuthenticateCollectionReceiptAgainstLive(receipt, active.run_id)).toBe(crystal);
      expect(collectionRecordProducerSchema(receipt.record)).toBe(schema);
    }
    const authentic = buildCrystalRecord(crystal, meta);
    for (const mutate of [
      (r: any) => r.history.crystal._nucTilt.theta += 0.2,
      (r: any) => r.zones[0].trace_Au = 71,
      (r: any) => r.zones[0].aspect_ratio = 8,
    ]) {
      const forged = clone(authentic); mutate(forged);
      expect(_saveSpecimenScienceDigest(forged)).not.toBe(_saveSpecimenScienceDigest(authentic));
      const receipt = receiptFor(forged, active.run_id, index, active.actions.length);
      expect(() => _saveAuthenticateCollectionReceiptAgainstLive(receipt, active.run_id)).toThrow(/match replayed/);
    }
  });

  it('loads an old collection event without upgrading its bytes, including deliberate deletion and finish replay', () => {
    const { crystal, active, meta } = actualRun();
    const old = buildCrystalRecord(crystal, meta, null);
    expect(_saveCommitCreativeCollection([{ crystal, record: old }]).ok).toBe(true);
    const savedOld = clone(loadCrystals()[0]);
    const saveId = active.id;
    fortressReset();
    expect(loadSaveById(saveId)).toBe(true);
    expect(loadCrystals()[0]).toEqual(savedOld);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    try { deleteCollectedCrystal(savedOld.id); } finally { confirm.mockRestore(); }
    fortressFinish();
    expect(loadCrystals()).toEqual([]);
    expect(loadLifetimeStats()).toEqual({ crystals_collected: 1, runs_finished: 1 });
    expect(loadSaveById(saveId)).toBe(true);
    expect(loadSaveById(saveId)).toBe(true);
    expect(loadCrystals()).toEqual([]);
    expect(loadLifetimeStats()).toEqual({ crystals_collected: 1, runs_finished: 1 });
  });

  it('rejects self-rehashed replacement of an authenticated earlier specimen during finish', () => {
    const { crystal, active, meta } = actualRun();
    expect(_saveCommitCreativeCollection([{ crystal, record: buildCrystalRecord(crystal, meta) }]).ok).toBe(true);
    fortressStep('wait'); // Collection is an earlier snapshot, legitimately unlike today's size.
    const library = loadCrystals();
    const tx = _saveBuildFinishTransaction();
    expect(_saveAuthenticateFinishTransactionAgainstLive(tx, active.id, library)).toBe(true);
    const falseTilt = clone(library[0]);
    falseTilt.history.crystal._nucTilt.theta += 0.2;
    for (const replacement of [falseTilt, buildCrystalRecord(crystal, meta)]) {
      replacement.id = library[0].id;
      const forgedLibrary = [replacement, ...library.slice(1)];
      const forged = clone(tx);
      const baseline = forged.library_baseline.find((e: any) => e.id === replacement.id);
      baseline.science_digest = _saveSpecimenScienceDigest(replacement);
      baseline.record_digest = _saveLibraryRecordDigest(replacement);
      forged.digest = _saveFinishTransactionDigest(forged);
      expect(() => _saveAuthenticateFinishTransactionAgainstLive(forged, active.id, forgedLibrary))
        .toThrow(/bound to its baseline/);
    }
    expect(loadCrystals()).toEqual(library);
  });

  it('resumes an already-issued legacy finish journal byte-for-byte and only counts it once', () => {
    const { sim, active } = actualRun();
    const saveId = active.id;
    const native = Storage.prototype.setItem;
    const denial = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'vugg-crystals-v1') throw new DOMException('interrupted Library write', 'QuotaExceededError');
      return native.call(this, key, value);
    });
    try { fortressFinish(); } finally { denial.mockRestore(); }
    const envelope = JSON.parse(localStorage.getItem('vugg-saves-v1')!);
    const saved = envelope.records.find((r: any) => r.id === saveId);
    expect(saved.status).toBe('finishing');
    const tx = saved.finish_transaction;
    tx.library_records = tx.library_records.map((r: any) => {
      const old = buildCrystalRecord(sim.crystals[r.source.crystal_index], {
        mode: 'creative', run_id: saved.run_id, crystal_index: r.source.crystal_index,
      }, null);
      old.id = r.id; old.collected_at = r.collected_at; old.name = r.name;
      return old;
    });
    tx.digest = _saveFinishTransactionDigest(tx);
    saved.recipe_digest = _saveRecipeDigest(saved);
    envelope.storage_digest = _saveEnvelopeDigest(envelope);
    localStorage.setItem('vugg-saves-v1', JSON.stringify(envelope));
    localStorage.removeItem('vugg-saves-v1.pending');
    localStorage.removeItem('vugg-saves-v1.backup');
    const originalRecords = clone(tx.library_records);
    fortressReset();
    expect(loadSaveById(saveId)).toBe(true);
    expect(loadCrystals()).toEqual(originalRecords);
    expect(loadSaves().find((r: any) => r.id === saveId).status).toBe('finished');
    expect(loadSaveById(saveId)).toBe(true);
    expect(loadCrystals()).toEqual(originalRecords);
    expect(loadLifetimeStats()).toEqual({ crystals_collected: originalRecords.length, runs_finished: 1 });
  });
});
