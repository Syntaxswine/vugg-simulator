// tests-js/narrative-placeholders.test.ts — a narrator must not print a template
// variable it never filled, and the quartz narrator must not name a radiation
// source the simulator did not record.
//
// The shipped fault (SIM 286, origin/main da1d0b9e): js/92i called
//   narrative_variant('quartz', 'smoky', { dose })
// against a template that named {dosed_pct}; the runtime leaves an unsupplied
// "{key}" as written (js/05-narratives.ts, _narrative_interp), so the game printed
//   "Alpha-damage from nearby uraninite activated Al-hole color centers in
//    {dosed_pct}% of the growth zones"
// for a Grimsel quartz in a run with no uraninite, and "{rad_count} of
// {total_count} growth zones record the irradiation" for a morion.
//
// Three layers, cheapest first:
//   1. the static rule in tools/narrative-workflow.mjs (run by every build and by
//      `npm test`'s pretest): a call supplies every variable its template names;
//   2. the narrators' own output for a crystal in each state the quartz sentence
//      distinguishes, and the two facts that make its two certain sentences true;
//   3. the two shipped runs that showed the fault, seed 42.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditTemplateVariableSupply, templateVariables } from '../tools/narrative-workflow.mjs';
import { runScenario } from './helpers';

declare const VugSimulator: any;
declare const SCENARIOS: any;
declare const setSeed: any;
declare const grow_quartz: any;
declare const QUARTZ_HOST_DOSE_CEILING: number;
declare const narrative_variant: (species: string, variant: string, context?: Record<string, unknown>) => string;
declare const _narrative_interp: (template: string, context?: Record<string, unknown>) => string;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// A template variable left in printed text: "{word}" starting with a letter or an
// underscore. Crystal-form notation ({100}, {0001}, {40-41}, {h0-il}) is not one,
// and is meant to print.
const UNFILLED = /\{[A-Za-z_]\w*\}/;

// The two sentences as SIM 286 printed them (seed 42; grimsel_alpine_cleft quartz
// #21 and radioactive_pegmatite quartz #2). They keep the detector honest.
const SHIPPED_SMOKY = 'Alpha-damage from nearby uraninite activated Al-hole color centers in {dosed_pct}% of the growth zones — this crystal reads as smoky quartz.';
const SHIPPED_MORION = 'Sustained α-bombardment from a uraninite neighbor darkened the lattice to dark smoky — morion in the deepest zones. {rad_count} of {total_count} growth zones record the irradiation.';
const SHIPPED_TEMPLATES = { quartz: { 'variant: smoky': SHIPPED_SMOKY, 'variant: morion': SHIPPED_MORION } };

describe('the detector can fail', () => {
  it('flags what SIM 286 printed, and the runtime really prints it', () => {
    expect(SHIPPED_SMOKY).toMatch(UNFILLED);
    expect(SHIPPED_MORION).toMatch(UNFILLED);
    // The shipped call passed `dose` and nothing the templates name.
    expect(_narrative_interp(SHIPPED_SMOKY, { dose: '0.43' })).toBe(SHIPPED_SMOKY);
    expect(_narrative_interp(SHIPPED_MORION, { dose: '1.10' })).toContain('{rad_count} of {total_count}');
  });

  it('leaves crystal-form notation alone', () => {
    const tessin = narrative_variant('quartz', 'tessin');
    expect(tessin).toContain('{h0-il}');
    expect(tessin).toContain('{40-41}');
    expect(tessin).not.toMatch(UNFILLED);
    expect('flattened on {001}, prism {10-10}, {0001} pinacoid').not.toMatch(UNFILLED);
  });
});

describe('narrative audit: a call supplies every variable its template names', () => {
  it('reads variables with the runtime\'s own pattern', () => {
    const runtime = fs.readFileSync(path.join(ROOT, 'js', '05-narratives.ts'), 'utf8');
    const tool = fs.readFileSync(path.join(ROOT, 'tools', 'narrative-workflow.mjs'), 'utf8');
    const pattern = String.raw`/\{(\w+)\}/g`;
    expect(runtime).toContain(`template.replace(${pattern}`);
    expect(tool).toContain(`const TEMPLATE_KEY_PATTERN = ${pattern};`);
    expect(templateVariables(SHIPPED_MORION)).toEqual(['rad_count', 'total_count']);
    expect(templateVariables('plates on {001} and {10-10}; {habit_pretty}, {habit_pretty}, {_x1}')).toEqual(['habit_pretty', '_x1']);
    expect(templateVariables('steep {h0-il} rhombohedra such as {40-41} and {30-31}')).toEqual([]);
  });

  it('rejects the calls SIM 286 shipped', () => {
    const complaints = auditTemplateVariableSupply(`
      if (rd > 0.6) parts.push(narrative_variant('quartz', 'morion', { dose: rd.toFixed(2) }));
      else parts.push(narrative_variant('quartz', 'smoky', { dose: rd.toFixed(2) }));
    `, SHIPPED_TEMPLATES);

    expect(complaints).toHaveLength(2);
    expect(complaints[0]).toContain('"variant: morion"');
    expect(complaints[0]).toContain('does not supply {rad_count}, {total_count}');
    expect(complaints[1]).toContain('"variant: smoky"');
    expect(complaints[1]).toContain('does not supply {dosed_pct}');
  });

  it('accepts a context that supplies them, as a literal or as a const bound to one', () => {
    const templates = {
      quartz: { blurb: 'Quartz #{crystal_id}.', closing: 'Done at {mm} mm.', ...SHIPPED_TEMPLATES.quartz },
      dolomite: { 'variant: kim_ordered': '{cycle_count} cycles, f_ord {f_ord}.' },
    };
    expect(auditTemplateVariableSupply(`
      function narrate(c) {
        parts.push(narrative_blurb('quartz', { crystal_id: c.crystal_id }));
        parts.push(narrative_closing('quartz', { 'mm': c.mm }));
        parts.push(narrative_variant('quartz', 'smoky', { dosed_pct, extra: 1 }));
        const cycle_count = 3;
        if (cycle_count > 0) {
          const ctx = { cycle_count, f_ord: '0.35' };
          if (c.ordered) parts.push(narrative_variant('dolomite', 'kim_ordered', ctx));
        }
      }
    `, templates)).toEqual([]);
  });

  it('rejects a missing context, a partial one, and one whose keys the source does not state', () => {
    const templates = { quartz: { blurb: 'Quartz #{crystal_id}.', ...SHIPPED_TEMPLATES.quartz } };
    const complaints = auditTemplateVariableSupply(`
      function narrate(c, ctx) {
        parts.push(narrative_blurb('quartz'));
        parts.push(narrative_variant('quartz', 'morion', { rad_count: 3 }));
        parts.push(narrative_variant('quartz', 'smoky', { ...shared }));
        parts.push(narrative_variant('quartz', 'smoky', { [key]: 12 }));
        parts.push(narrative_variant('quartz', 'smoky', buildContext(c)));
        parts.push(narrative_variant('quartz', 'smoky', ctx));
        let loose = { dosed_pct: 40 };
        parts.push(narrative_variant('quartz', 'smoky', loose));
      }
    `, templates);

    expect(complaints).toHaveLength(7);
    expect(complaints[0]).toContain('does not supply {crystal_id}');
    expect(complaints[1]).toContain('does not supply {total_count}');
    expect(complaints[1]).not.toContain('does not supply {rad_count}');
    for (const complaint of complaints.slice(2)) expect(complaint).toContain('not an object literal');
  });

  it('asks nothing of a section without variables, crystal forms included', () => {
    const templates = { quartz: { 'variant: tessin': 'steep {h0-il} rhombohedra such as {40-41}; prism {100}.' } };
    expect(auditTemplateVariableSupply(`
      parts.push(narrative_variant('quartz', 'tessin'));
      parts.push(narrative_variant('quartz', 'tessin', anything));
    `, templates)).toEqual([]);
  });
});

// ---- the quartz narrator ----

function quartz(radiationDamage: number, extra: Record<string, unknown> = {}) {
  return {
    crystal_id: 21, mineral: 'quartz', habit: 'prismatic', nucleation_temp: 380,
    c_length_mm: 6.7, a_width_mm: 2.1, total_growth_um: 6700,
    twinned: false, twin_law: '', dominant_forms: ['m{100} prism', 'r{101}'],
    zones: [{ trace_Ti: 0, growth_rate: 5, fluid_inclusion: false, thickness_um: 6700 }],
    radiation_damage: radiationDamage,
    ...extra,
  };
}
// The narrator reads one thing from the run: whether a uraninite has dosed anything in
// it. A run is a simulator; run_step leaves radiation_dose unset until one does.
function run(fields: Record<string, unknown> = {}) {
  return Object.assign(Object.create(VugSimulator.prototype), { crystals: [] }, fields);
}
function narrateQuartz(narrator: unknown, crystal: unknown): string {
  return VugSimulator.prototype._narrate_quartz.call(narrator, crystal);
}

const QUARTZ_RADIATION_VARIANTS = ['smoky', 'smoky_host_rock', 'morion', 'morion_host_rock', 'morion_uraninite'];

describe('quartz narrator: the smoky and morion sentences', () => {
  it('their templates name no variable and no per-zone count', () => {
    for (const variant of QUARTZ_RADIATION_VARIANTS) {
      const text = narrative_variant('quartz', variant);
      expect(text.length, variant).toBeGreaterThan(40);
      expect(text, variant).not.toMatch(UNFILLED);
      // The simulator records one damage number per crystal; no zone carries a dose.
      expect(text, variant).not.toMatch(/growth zones|deepest zones|% of/);
    }
    expect(narrative_variant('quartz', 'smoky')).not.toMatch(/uraninite|host rock/i);
    expect(narrative_variant('quartz', 'morion')).not.toMatch(/uraninite|host rock/i);
    expect(narrative_variant('quartz', 'smoky_host_rock')).not.toMatch(/uraninite/i);
    expect(narrative_variant('quartz', 'morion_host_rock')).not.toMatch(/uraninite/i);
  });

  it('names the host rock when no uraninite has dosed anything in the run', () => {
    for (const noDose of [run(), run({ radiation_dose: 0 })]) {
      const smoky = narrateQuartz(noDose, quartz(0.432));
      expect(smoky).toContain(narrative_variant('quartz', 'smoky_host_rock'));
      expect(smoky).toContain('host rock');
      expect(smoky).not.toMatch(/uraninite/i);
      expect(smoky).not.toMatch(UNFILLED);

      const morion = narrateQuartz(noDose, quartz(0.612));
      expect(morion).toContain(narrative_variant('quartz', 'morion_host_rock'));
      expect(morion).not.toMatch(/uraninite/i);
      expect(morion).not.toMatch(UNFILLED);

      // The game's own thresholds (js/12-mineral-art.ts): smoky past 0.3, morion past 0.6.
      expect(narrateQuartz(noDose, quartz(0.6))).toContain(narrative_variant('quartz', 'smoky_host_rock'));
      expect(narrateQuartz(noDose, quartz(0.6000001))).toContain(narrative_variant('quartz', 'morion_host_rock'));

      // The ceiling itself is still the host rock's: grow_quartz writes exactly it.
      const atCeiling = narrateQuartz(noDose, quartz(QUARTZ_HOST_DOSE_CEILING));
      expect(atCeiling).toContain(narrative_variant('quartz', 'morion_host_rock'));
    }
  });

  it('names the uraninite only past the ceiling the host rock cannot pass', () => {
    // The damage settles it alone, so it holds with or without a run to ask.
    for (const narrator of [run({ radiation_dose: 11.676 }), null, { crystals: [] }]) {
      const text = narrateQuartz(narrator, quartz(1.103));
      expect(text).toContain(narrative_variant('quartz', 'morion_uraninite'));
      expect(text).toContain('Uraninite in this pocket');
      expect(text).not.toContain('host rock');
      expect(text).not.toMatch(UNFILLED);
    }
    const justPast = narrateQuartz(run({ radiation_dose: 0.02 }), quartz(QUARTZ_HOST_DOSE_CEILING + 1e-9));
    expect(justPast).toContain(narrative_variant('quartz', 'morion_uraninite'));
  });

  it('names no source where the simulator did not keep the two apart', () => {
    // A run a uraninite has dosed, and damage the host rock could have given alone.
    for (const [damage, variant] of [[0.45, 'smoky'], [0.65, 'morion'], [QUARTZ_HOST_DOSE_CEILING, 'morion']] as const) {
      const text = narrateQuartz(run({ radiation_dose: 11.676 }), quartz(damage));
      expect(text, String(damage)).toContain(narrative_variant('quartz', variant));
      expect(text, String(damage)).not.toMatch(/uraninite|host rock/i);
      expect(text, String(damage)).not.toMatch(UNFILLED);
    }
  });

  it('names no source when it is not a simulator that asks', () => {
    // Called bare (how tests-js/narrators-evaporite.test.ts calls narrators), `this`
    // is the global object: nothing on it says whether a uraninite dosed the crystal.
    for (const narrator of [null, undefined, {}, { crystals: [] }, { crystals: [], radiation_dose: 0 }]) {
      const smoky = narrateQuartz(narrator, quartz(0.45));
      expect(smoky).toContain(narrative_variant('quartz', 'smoky'));
      expect(smoky).not.toMatch(/uraninite|host rock/i);
      const morion = narrateQuartz(narrator, quartz(0.65));
      expect(morion).toContain(narrative_variant('quartz', 'morion'));
      expect(morion).not.toMatch(/uraninite|host rock/i);
    }
  });

  it('says nothing of radiation at or under the smoky threshold', () => {
    for (const damage of [0, 0.2, 0.3]) {
      const text = narrateQuartz(run(), quartz(damage));
      expect(text, String(damage)).not.toMatch(/smoky|morion|irradiat|γ-dose/i);
      expect(text, String(damage)).toContain('Final size');
    }
  });
});

describe('what makes the two certain sentences true', () => {
  it('grow_quartz clamps a quartz\'s damage at the ceiling the narrator reads', () => {
    const { conditions } = SCENARIOS.grimsel_alpine_cleft();
    expect(conditions.wall.composition).toBe('pegmatite');
    expect(conditions.fluid.Al).toBeGreaterThan(1);
    setSeed(42);

    const heavilyDosed: any = { mineral: 'quartz', radiation_damage: 5, zones: [], total_growth_um: 0, twinned: false };
    grow_quartz(heavilyDosed, conditions, 1);
    expect(heavilyDosed.radiation_damage).toBe(QUARTZ_HOST_DOSE_CEILING);

    // Not a vacuous clamp: the same call adds the host rock's dose under the ceiling.
    const lightlyDosed: any = { mineral: 'quartz', radiation_damage: 0.1, zones: [], total_growth_um: 0, twinned: false };
    grow_quartz(lightlyDosed, conditions, 1);
    expect(lightlyDosed.radiation_damage).toBeGreaterThan(0.1);
    expect(lightlyDosed.radiation_damage).toBeLessThan(QUARTZ_HOST_DOSE_CEILING);
  });

  it('a crystal\'s radiation_damage has two writers, the ones the narrator tells apart', () => {
    // "Host rock" and "uraninite" are said by elimination between these two. A third
    // writer makes both sentences unsound until the narrator is taught the new source.
    // (The engine's write reaches the crystal through the accepted-zone transaction,
    // js/85b _applyAcceptedCrystalMutations, which copies staged fields by key.)
    const writes: Record<string, number> = {};
    const jsDir = path.join(ROOT, 'js');
    for (const name of fs.readdirSync(jsDir).filter(file => file.endsWith('.ts')).sort()) {
      const code = fs.readFileSync(path.join(jsDir, name), 'utf8')
        .split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
      const count = (code.match(/\.radiation_damage\s*(?:[-+*/]|\|\||\?\?)?=(?!=)/g) || []).length;
      if (count) writes[name] = count;
    }
    expect(writes).toEqual({ '59-engines-silicate.ts': 1, '85-simulator.ts': 2 });

    const simulator = fs.readFileSync(path.join(jsDir, '85-simulator.ts'), 'utf8');
    // The uraninite block moves the run's dose and each crystal's damage by the same factor.
    expect(simulator).toContain('this.radiation_dose += 0.01 * u_size;');
    expect(simulator).toContain('other.radiation_damage += 0.02 * u_size;');
  });
});

describe('the two shipped runs, seed 42', { timeout: 600_000 }, () => {
  it('grimsel_alpine_cleft: smoky quartz, no uraninite, and none named', () => {
    const sim = runScenario('grimsel_alpine_cleft', { seed: 42 });
    expect(sim.crystals.some((c: any) => c.mineral === 'uraninite')).toBe(false);
    expect(sim.radiation_dose || 0).toBe(0);
    const smoky = sim.crystals.filter((c: any) => c.mineral === 'quartz' && c.zones.length && (c.radiation_damage || 0) > 0.3);
    expect(smoky.length).toBeGreaterThan(0);
    for (const crystal of smoky) {
      const text = sim._narrate_quartz(crystal);
      expect(text).toContain('host rock');
      expect(text).not.toMatch(/uraninite/i);
      expect(text).not.toMatch(UNFILLED);
    }
    expect(sim.narrate()).not.toMatch(UNFILLED);
  });

  it('radioactive_pegmatite: quartz past the ceiling, and the uraninite named', () => {
    const sim = runScenario('radioactive_pegmatite', { seed: 42 });
    expect(sim.crystals.some((c: any) => c.mineral === 'uraninite')).toBe(true);
    expect(sim.radiation_dose).toBeGreaterThan(0);
    const dosed = sim.crystals.filter((c: any) => c.mineral === 'quartz' && c.zones.length && (c.radiation_damage || 0) > QUARTZ_HOST_DOSE_CEILING);
    expect(dosed.length).toBeGreaterThan(0);
    for (const crystal of dosed) {
      const text = sim._narrate_quartz(crystal);
      expect(text).toContain('Uraninite in this pocket');
      expect(text).not.toMatch(UNFILLED);
    }
    expect(sim.narrate()).not.toMatch(UNFILLED);
  });
});
