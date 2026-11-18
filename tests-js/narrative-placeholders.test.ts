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
// {total_count} growth zones record the irradiation" for a morion. The
// tyuyamunite narrator printed "a carnotite #{}" the same way.
//
// Three layers, cheapest first:
//   1. the static rule in tools/narrative-workflow.mjs (run by every build and by
//      `npm test`'s pretest): a call supplies every variable its template names;
//   2. the narrators' own output for a crystal in each state the quartz sentence
//      distinguishes, and the two facts that make its two certain sentences true;
//   3. the two shipped runs that showed the fault, seed 42, each stepped under a
//      ledger that holds every crystal's damage to those two facts as it changes.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditIndirectNarrativeUses,
  auditTemplateVariableSupply,
  narrativeCallOutsideNarrators,
  strayBraces,
  templateBodyComplaints,
  templateVariables,
  unrenderedSectionComplaints,
} from '../tools/narrative-workflow.mjs';

declare const VugSimulator: any;
declare const SCENARIOS: any;
declare const setSeed: any;
declare const grow_quartz: any;
declare const buildRandomScenario: any;
declare const QUARTZ_HOST_DOSE_CEILING: number;
declare const narrative_variant: (species: string, variant: string, context?: Record<string, unknown>) => string;
declare const _narrative_interp: (template: string, context?: Record<string, unknown>) => string;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Braces left in printed text that are not crystal-form notation: an unfilled
// "{word}", an empty "{}", a positional "{0}", a formatted "{dose:.2f}". A crystal
// form ({100}, {0001}, {10-10}, {40-41}, {h0-il}: three or more places of digits,
// the index letters h k i l, hyphens or overbars, with a digit) is meant to print.
// Spelled out here rather than read from the audit; a test below holds the two equal.
const UNFILLED = /\{(?!(?=[^{}\d]*\d)[0-9hkil̄̅-]{3,}\})[^{}]*\}/;

// The two sentences as SIM 286 printed them (seed 42; grimsel_alpine_cleft quartz
// #21 and radioactive_pegmatite quartz #2). They keep the detector honest.
const SHIPPED_SMOKY = 'Alpha-damage from nearby uraninite activated Al-hole color centers in {dosed_pct}% of the growth zones — this crystal reads as smoky quartz.';
const SHIPPED_MORION = 'Sustained α-bombardment from a uraninite neighbor darkened the lattice to dark smoky — morion in the deepest zones. {rad_count} of {total_count} growth zones record the irradiation.';
const SHIPPED_TEMPLATES = { quartz: { 'variant: smoky': SHIPPED_SMOKY, 'variant: morion': SHIPPED_MORION } };

describe('the detector can fail', () => {
  it('flags what SIM 286 printed, and the runtime really prints it', () => {
    expect(SHIPPED_SMOKY).toMatch(UNFILLED);
    expect(SHIPPED_MORION).toMatch(UNFILLED);
    expect('a carnotite #{} growing in the same pocket').toMatch(UNFILLED);
    // The shipped call passed `dose` and nothing the templates name.
    expect(_narrative_interp(SHIPPED_SMOKY, { dose: '0.43' })).toBe(SHIPPED_SMOKY);
    expect(_narrative_interp(SHIPPED_MORION, { dose: '1.10' })).toContain('{rad_count} of {total_count}');
  });

  it('leaves crystal-form notation alone', () => {
    const tessin = narrative_variant('quartz', 'tessin');
    expect(tessin).toContain('{h0-il}');
    expect(tessin).toContain('{40-41}');
    expect(tessin).not.toMatch(UNFILLED);
    expect('flattened on {001}, prism {10-10}, {0001} pinacoid, {10̄10}, {01-12}').not.toMatch(UNFILLED);
  });

  it('flags what is neither a crystal form nor filled, as the audit does', () => {
    const neither = ['{}', '{ }', '{0}', '{12}', '{dose:.2f}', '{c.crystal_id}', '{ spaced }', '{max-rate}', '{1a}', '{rad_count}', '{hkl}'];
    const forms = ['{100}', '{0001}', '{1011}', '{104}', '{10-10}', '{10̄10}', '{01-12}', '{40-41}', '{30-31}', '{h0-il}'];
    for (const braces of neither) {
      expect(`a carnotite #${braces} growing`, braces).toMatch(UNFILLED);
      expect(strayBraces(`a carnotite #${braces} growing`), braces).toEqual([braces]);
    }
    for (const braces of forms) {
      expect(`flattened on ${braces}`, braces).not.toMatch(UNFILLED);
      expect(strayBraces(`flattened on ${braces}`), braces).toEqual([]);
    }
  });
});

describe('narrative audit: a call supplies every variable its template names', () => {
  it('reads a section the way the runtime does', () => {
    // The audit and the runtime each carry the pattern. Rather than compare their
    // source, render each sample through the runtime with a context that owns
    // EVERY key, and see which braces it replaced: those are the keys a call can
    // supply. The audit must ask for exactly the ones that start with a letter or
    // an underscore, and for nothing the runtime would leave alone.
    const ownsEveryKey = new Proxy({}, {
      getOwnPropertyDescriptor: (_target, key) => ({ value: `<<${String(key)}>>`, writable: true, enumerable: true, configurable: true }),
      get: (_target, key) => `<<${String(key)}>>`,
    });
    const samples = [
      SHIPPED_SMOKY,
      SHIPPED_MORION,
      'Quartz #{crystal_id} nucleated at {nucleation_temp}°C; {crystal_id} again.',
      'plates on {001} and {10-10}; {0001}; m{100}; {habit_pretty}, {_x1}, {A}',
      'steep {h0-il} rhombohedra such as {40-41} and {30-31}',
      'odd ones: {1a} { spaced } {} {a.b} {a-b} {é} {$x} {a b} {{nested}} {trailing',
    ];
    let replacedSomething = 0, leftSomething = 0;
    for (const sample of samples) {
      const rendered = _narrative_interp(sample, ownsEveryKey);
      const replaced = [...new Set(Array.from(rendered.matchAll(/<<(.*?)>>/g), match => match[1]))];
      expect(templateVariables(sample), sample).toEqual(replaced.filter(key => /^[A-Za-z_]/.test(key)));
      replacedSomething += replaced.length;
      if (/\{[^{}]*\}/.test(rendered)) leftSomething += 1;
    }
    // The battery exercises both halves: keys the runtime fills, and braces it leaves.
    expect(replacedSomething).toBeGreaterThan(10);
    expect(leftSomething).toBeGreaterThan(2);

    expect(templateVariables(SHIPPED_MORION)).toEqual(['rad_count', 'total_count']);
    expect(templateVariables('plates on {001} and {10-10}; {habit_pretty}, {habit_pretty}, {_x1}')).toEqual(['habit_pretty', '_x1']);
    expect(templateVariables('steep {h0-il} rhombohedra such as {40-41} and {30-31}')).toEqual([]);
    // A key that starts with a digit is one the runtime WOULD fill; the audit leaves
    // it to the prose on purpose, because no call supplies a crystal form.
    expect(_narrative_interp('prism {100}', ownsEveryKey)).toBe('prism <<100>>');
    expect(templateVariables('prism {100}')).toEqual([]);
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

  it('follows a shared const context only where nothing else can touch it', () => {
    const templates = { quartz: { 'variant: smoky': SHIPPED_SMOKY } };
    const smoky = `parts.push(narrative_variant('quartz', 'smoky', ctx));`;
    const followed = [
      `function narrate(c) { const ctx = { dosed_pct: 40 }; ${smoky} ${smoky} }`,
      `function narrate(c) { const ctx = { dosed_pct: 40 }; if (c.a) { ${smoky} } return other.ctx + { ctx: 1 }.ctx; }`,
      `function narrate(c) { parts.push(narrative_variant('quartz', 'smoky', ({ dosed_pct: 40 }))); }`,
      `function narrate(c) { parts.push(narrative_variant('quartz', 'smoky', c.a ? { dosed_pct: 1, x: 2 } : { dosed_pct: 3 })); }`,
    ];
    for (const source of followed) expect(auditTemplateVariableSupply(source, templates), source).toEqual([]);

    // Each of these leaves the braces printed while a looser reading of `ctx` would pass.
    const refused = [
      `function narrate(c) { const ctx = { dosed_pct: 40 }; for (const ctx of c.list) { ${smoky} } }`,
      `function narrate(c, { ctx }) { const other = { dosed_pct: 40 }; ${smoky} }`,
      `function narrate(c) { const ctx = { dosed_pct: 40 }; try { go(); } catch (ctx) { ${smoky} } }`,
      `function narrate(c) { const ctx = { dosed_pct: 40 }; function inner(ctx) { ${smoky} } inner({}); }`,
      `function narrate(c) { const ctx = { dosed_pct: 40 }; for (let ctx = {}; ; ) { ${smoky} break; } }`,
      `function narrate(c) { const ctx = { dosed_pct: 40 }; delete ctx.dosed_pct; ${smoky} }`,
      `function narrate(c) { const ctx = { dosed_pct: 40 }; strip(ctx); ${smoky} }`,
      `function narrate(c) { const ctx = { dosed_pct: 40 }; const held = { ctx }; ${smoky} }`,
      `function narrate(c) { const ctx = { other: 1 }; ctx.dosed_pct = 40; ${smoky} }`,
      `function narrate(c) { parts.push(narrative_variant('quartz', 'smoky', c.a ? { dosed_pct: 1 } : { other: 2 })); }`,
    ];
    for (const source of refused) {
      const complaints = auditTemplateVariableSupply(source, templates);
      expect(complaints.length, source).toBeGreaterThan(0);
      expect(complaints.join(' '), source).toMatch(/not an object literal|does not supply \{dosed_pct\}/);
    }
  });

  it('wants the three functions called directly, and in a narrator file', () => {
    expect(auditIndirectNarrativeUses(`
      parts.push(narrative_variant('quartz', 'smoky'));
      parts.push(narrative_blurb('quartz'), narrative_closing('quartz'));
      const text = holder.narrative_variant;
    `)).toEqual([]);
    const indirect = auditIndirectNarrativeUses(`
      const say = narrative_variant;
      parts.push(say('quartz', 'smoky'));
      parts.push(narrative_blurb.call(null, 'quartz'));
      parts.push([1].map(narrative_closing));
    `);
    expect(indirect).toHaveLength(3);
    for (const complaint of indirect) expect(complaint).toContain('must be called directly');

    const call = `  parts.push(narrative_variant('quartz', 'smoky'));`;
    expect(narrativeCallOutsideNarrators('92i-narrators-silicate.ts', call)).toBeNull();
    expect(narrativeCallOutsideNarrators('05-narratives.ts', 'function narrative_variant(species, variant, ctx?) {')).toBeNull();
    expect(narrativeCallOutsideNarrators('85-simulator.ts', `  // see narrative_variant('quartz', 'smoky')`)).toBeNull();
    expect(narrativeCallOutsideNarrators('85-simulator.ts', `const a = 1;\n${call}`)).toContain('js/85-simulator.ts:2');
  });

  it('refuses a section no call renders', () => {
    const rendered = new Set(['quartz\nvariant: smoky', 'quartz\nvariant: morion', 'calcite\nvariant: amethyst_tint']);
    expect(unrenderedSectionComplaints('quartz', ['variant: smoky', 'variant: morion'], rendered)).toEqual([]);
    // narratives/quartz.md held these two, unreached, until this branch.
    const dead = unrenderedSectionComplaints('quartz', ['variant: smoky', 'variant: amethyst_tint', 'variant: mild_smoky'], rendered);
    expect(dead).toHaveLength(2);
    expect(dead[0]).toContain('"variant: amethyst_tint" is rendered by no narrator call');
    // The shipped tree holds none: every section of narratives/quartz.md is one the narrator dispatches.
    const quartz = fs.readFileSync(path.join(ROOT, 'narratives', 'quartz.md'), 'utf8');
    const narrator = fs.readFileSync(path.join(ROOT, 'js', '92i-narrators-silicate.ts'), 'utf8');
    const sections = Array.from(quartz.matchAll(/^## variant: (\w+)\s*$/gm), match => match[1]);
    expect(sections.length).toBeGreaterThan(10);
    for (const section of sections) expect(narrator, section).toContain(`narrative_variant('quartz', '${section}'`);
  });

  it('rejects an empty placeholder in a section, which no call can fill', () => {
    // narratives/tyuyamunite.md as SIM 286 shipped it; the runtime's pattern needs a key.
    const shipped = 'This tyuyamunite is the calcium twin to a carnotite #{} growing in the same pocket.';
    expect(_narrative_interp(shipped, { carnotite_id: 12 })).toBe(shipped);
    expect(templateBodyComplaints(shipped)).toHaveLength(1);
    expect(templateBodyComplaints('a carnotite #{ } growing')).toHaveLength(1);
    expect(templateBodyComplaints('plates on {001}; {habit_pretty}; steep {h0-il} rhombohedra')).toEqual([]);
  });

  it('refuses whatever else in braces is neither a variable nor a crystal form', () => {
    // The same family as "{}": the runtime prints each as written under any context of
    // named keys (the only kind the audit reads), so a call cannot be held to it.
    for (const braces of ['{0}', '{12}', '{dose:.2f}', '{c.crystal_id}', '{ spaced }', '{max-rate}', '{1a}']) {
      const body = `a carnotite #${braces} growing in the same pocket`;
      expect(_narrative_interp(body, { dose: 1, c: {}, crystal_id: 7, spaced: 2, max: 3, rate: 4, a: 5 }), braces).toBe(body);
      expect(templateBodyComplaints(body), braces).toHaveLength(1);
      expect(templateBodyComplaints(body)[0], braces).toContain(braces);
    }
    // What the 94 files do hold: variables, and forms of three or more places.
    const held = 'Quartz #{crystal_id}: {100} {0001} {1011} {104} {10̄10} {01-12} {30-31} {40-41} {h0-il}, {habit_pretty}';
    expect(templateBodyComplaints(held)).toEqual([]);
    for (const name of fs.readdirSync(path.join(ROOT, 'narratives')).filter(file => file.endsWith('.md'))) {
      const text = fs.readFileSync(path.join(ROOT, 'narratives', name), 'utf8');
      expect(templateBodyComplaints(text), name).toEqual([]);
    }
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
    // (A simulator with no dose on record cannot hold such a crystal; the order of the
    // narrator's two tests is held all the same.)
    for (const narrator of [run({ radiation_dose: 11.676 }), run(), null, { crystals: [] }]) {
      const text = narrateQuartz(narrator, quartz(1.103));
      expect(text).toContain(narrative_variant('quartz', 'morion_uraninite'));
      expect(text).toContain('uraninite in this pocket');
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

    // The value grow_quartz carried as a bare literal before it had a name (SIM 206):
    // past morion (0.6), under the metamict threshold (0.8). Naming it changed nothing.
    expect(QUARTZ_HOST_DOSE_CEILING).toBe(0.7);

    const heavilyDosed: any = { mineral: 'quartz', radiation_damage: 5, zones: [], total_growth_um: 0, twinned: false };
    grow_quartz(heavilyDosed, conditions, 1);
    expect(heavilyDosed.radiation_damage).toBe(0.7);

    // Not a vacuous clamp: the same call adds the host rock's dose under the ceiling.
    const lightlyDosed: any = { mineral: 'quartz', radiation_damage: 0.1, zones: [], total_growth_um: 0, twinned: false };
    grow_quartz(lightlyDosed, conditions, 1);
    expect(lightlyDosed.radiation_damage).toBeGreaterThan(0.1);
    expect(lightlyDosed.radiation_damage).toBeLessThan(QUARTZ_HOST_DOSE_CEILING);
  });

  it('js/ spells two writers of a crystal\'s radiation_damage, the ones the narrator tells apart', () => {
    // "Host rock" and "uraninite" are said by elimination between these two. A third
    // writer makes both sentences unsound until the narrator is taught the new source.
    // This reads the source for ONE spelling, `.radiation_damage =` (and `+=` and the
    // like): a write through a computed key or Object.assign passes it. The ledger
    // below watches the same thing in execution, in the runs it makes. (The engine's
    // own write reaches the crystal by key through the accepted-zone transaction,
    // js/85b _applyAcceptedCrystalMutations.)
    const writes: Record<string, number> = {};
    const jsDir = path.join(ROOT, 'js');
    for (const name of fs.readdirSync(jsDir).filter(file => file.endsWith('.ts')).sort()) {
      const code = fs.readFileSync(path.join(jsDir, name), 'utf8')
        .split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
      const count = (code.match(/\.radiation_damage\s*(?:[-+*/]|\|\||\?\?)?=(?!=)/g) || []).length;
      if (count) writes[name] = count;
    }
    expect(writes).toEqual({ '59-engines-silicate.ts': 1, '85-simulator.ts': 2 });
  });
});

// The host rock's largest dose in one step, as grow_quartz computes it (js/59):
// 0.006 x the wall's intensity (pegmatite 1, phonolite 0.5, otherwise wall.gamma_host)
// x min(fluid Al / 10, 1.2), once per engine call. Spelled out here, not read back.
function largestHostDose(wall: any): number {
  const intensity = wall.composition === 'pegmatite' ? 1 : wall.composition === 'phonolite' ? 0.5 : (wall.gamma_host || 0);
  return 0.006 * intensity * 1.2;
}

// Steps a run and holds every crystal's damage to what the narrator assumes of its
// two writers, as the damage changes:
//   - a crystal that is not a quartz gains damage only in a step where the run's
//     radiation_dose rises, and then by twice the rise (0.02 x size against 0.01 x
//     size, js/85); otherwise it gains nothing (it was not active, or nothing dosed);
//   - a quartz, in a step where the dose does not rise, gains no more than the host
//     rock's largest dose (nothing at all on a wall that gives none) and is not left
//     past the ceiling.
// A uraninite is dosed by the other uraninites alone and is left out. What this cannot
// see: a third writer that adds to a quartz less than the host rock may, on a wall
// that doses. The control runs on walls that give nothing close that from one side.
function runWithDoseLedger(start: () => { conditions: any; events: any[]; defaultSteps?: number }) {
  const { conditions, events, defaultSteps } = start();
  const sim = new VugSimulator(conditions, events);
  const hostLimit = largestHostDose(conditions.wall);
  const ledger = {
    stepsWithDose: 0, stepsWithoutDose: 0, gainsInLockStep: 0, quartzGainsWithoutDose: 0,
    violations: [] as string[], damageBeforeFirstDose: new Map<any, number>(),
  };
  for (let step = 0; step < (defaultSteps ?? 100); step++) {
    const doseBefore = sim.radiation_dose || 0;
    const damageBefore = new Map<any, number>(sim.crystals.map((c: any) => [c, c.radiation_damage || 0]));
    sim.run_step();
    const rise = (sim.radiation_dose || 0) - doseBefore;
    if (rise > 0) ledger.stepsWithDose += 1; else ledger.stepsWithoutDose += 1;
    for (const c of sim.crystals) {
      if (c.mineral === 'uraninite') continue;
      const before = damageBefore.get(c) || 0;
      const gain = (c.radiation_damage || 0) - before;
      if (rise > 0 && c.active && !ledger.damageBeforeFirstDose.has(c)) ledger.damageBeforeFirstDose.set(c, before);
      if (c.mineral === 'quartz') {
        if (rise > 0 || !(gain > 1e-12)) continue;
        ledger.quartzGainsWithoutDose += 1;
        if (gain > hostLimit + 1e-12) {
          ledger.violations.push(`step ${step}: quartz #${c.crystal_id} gained ${gain} with no uraninite dose; the host rock gives at most ${hostLimit}`);
        }
        if (c.radiation_damage > 0.7) {
          ledger.violations.push(`step ${step}: quartz #${c.crystal_id} rose to ${c.radiation_damage} with no uraninite dose`);
        }
      } else if (Math.abs(gain) > 1e-12) {
        if (rise > 0 && Math.abs(gain - 2 * rise) < 1e-9) ledger.gainsInLockStep += 1;
        else ledger.violations.push(`step ${step}: ${c.mineral} #${c.crystal_id} gained ${gain} against a dose rise of ${rise}`);
      }
    }
  }
  return { sim, ledger };
}
const scenarioAtSeed42 = (name: string) => () => { setSeed(42); return SCENARIOS[name](); };
const smokySentenceOfTheRun = (sim: any): string => (sim.narrate().match(/[^.]*turned smoky[^.]*\./) || [''])[0];

describe('the two shipped runs, seed 42', { timeout: 600_000 }, () => {
  it('grimsel_alpine_cleft: smoky quartz, no uraninite, and none named', () => {
    const { sim, ledger } = runWithDoseLedger(scenarioAtSeed42('grimsel_alpine_cleft'));
    expect(sim.crystals.some((c: any) => c.mineral === 'uraninite')).toBe(false);
    expect(sim.radiation_dose || 0).toBe(0);
    // No uraninite dose in the run, so the host rock is the only writer left: it
    // touches quartz alone, by no more than its own dose, and never past its ceiling.
    expect(ledger.violations).toEqual([]);
    expect(ledger.stepsWithDose).toBe(0);
    expect(ledger.quartzGainsWithoutDose).toBeGreaterThan(0);
    expect(sim.crystals.filter((c: any) => c.mineral !== 'quartz' && (c.radiation_damage || 0) > 0).length).toBe(0);
    expect(Math.max(...sim.crystals.map((c: any) => c.radiation_damage || 0))).toBeLessThanOrEqual(0.7);

    const smoky = sim.crystals.filter((c: any) => c.mineral === 'quartz' && c.zones.length && (c.radiation_damage || 0) > 0.3);
    expect(smoky.length).toBeGreaterThan(0);
    for (const crystal of smoky) {
      const text = sim._narrate_quartz(crystal);
      expect(text).toContain('host rock');
      expect(text).not.toMatch(/uraninite/i);
      expect(text).not.toMatch(UNFILLED);
    }
    const narrative = sim.narrate();
    expect(narrative).not.toMatch(UNFILLED);
    // No uraninite in the run: nothing in its narrative should name one.
    expect(narrative).not.toMatch(/uraninite/i);
  });

  it('radioactive_pegmatite: quartz past the ceiling, and the uraninite named', () => {
    const { sim, ledger } = runWithDoseLedger(scenarioAtSeed42('radioactive_pegmatite'));
    expect(sim.crystals.some((c: any) => c.mineral === 'uraninite')).toBe(true);
    expect(sim.radiation_dose).toBeGreaterThan(0);
    // The run's dose and every other crystal's damage rise together, by one factor:
    // that is what lets "no dose on record in this run" stand for "no uraninite dosed it".
    expect(ledger.violations).toEqual([]);
    expect(ledger.stepsWithDose).toBeGreaterThan(0);
    expect(ledger.gainsInLockStep).toBeGreaterThan(0);

    const dosed = sim.crystals.filter((c: any) => c.mineral === 'quartz' && c.zones.length && (c.radiation_damage || 0) > 0.7);
    expect(dosed.length).toBeGreaterThan(0);
    for (const crystal of dosed) {
      const text = sim._narrate_quartz(crystal);
      expect(text).toContain(narrative_variant('quartz', 'morion_uraninite'));
      expect(text).toContain('uraninite in this pocket');
      expect(text).not.toMatch(UNFILLED);
    }
    expect(sim.narrate()).not.toMatch(UNFILLED);
    expect(smokySentenceOfTheRun(sim)).toContain('knocked loose by radiation');
  });
});

describe('a wall that gives no dose', { timeout: 600_000 }, () => {
  // The control for the ledger's blind side. On limestone or dolomite the host rock
  // writes nothing, so with no uraninite ANY damage on ANY crystal is a third writer:
  // one that stayed under the host rock's dose on a pegmatite wall shows here.
  it.each(['tutorial_first_crystal', 'cooling', 'mvt'])('%s: quartz grows and nothing carries damage', (name) => {
    const { sim, ledger } = runWithDoseLedger(scenarioAtSeed42(name));
    expect(largestHostDose(sim.conditions.wall)).toBe(0);
    expect(sim.radiation_dose || 0).toBe(0);
    const quartz = sim.crystals.filter((c: any) => c.mineral === 'quartz' && c.zones.some((z: any) => z.thickness_um > 0));
    expect(quartz.length).toBeGreaterThan(0);
    expect(ledger.violations).toEqual([]);
    expect(ledger.quartzGainsWithoutDose).toBe(0);
    expect(sim.crystals.filter((c: any) => (c.radiation_damage || 0) !== 0).length).toBe(0);
    expect(sim.narrate()).not.toMatch(/smoky|morion|irradiat/i);
  });
});

describe('a pocket the review built: host-rock morion, then a late uraninite', { timeout: 600_000 }, () => {
  // Not a shipped scenario. Random Vugg's pegmatite broth with the host set to
  // pegmatite, and uranium arriving at step 100 under reducing conditions: what a
  // Creative-mode player does with the host select and the U and O2 sliders. The
  // quartz are morion on the host rock's dose alone long before a uraninite exists.
  function lateUranium() {
    setSeed(2);
    const scenario = buildRandomScenario('pegmatite', 'any');
    scenario.conditions.wall.composition = 'pegmatite';
    const pulse = { step: 100, name: 'Late uranium-bearing reducing pulse', description: 'constructed',
      apply_fn: (c: any) => { c.fluid.U += 150; c.fluid.O2 = 0; return 'U +150 ppm, O2 -> 0'; } };
    return { conditions: scenario.conditions, events: [...scenario.events, pulse], defaultSteps: scenario.defaultSteps };
  }

  it('says what the damage settles and no more', () => {
    const { sim, ledger } = runWithDoseLedger(lateUranium);
    expect(ledger.violations).toEqual([]);
    const uraninites = sim.crystals.filter((c: any) => c.mineral === 'uraninite');
    expect(uraninites.length).toBeGreaterThan(0);
    expect(Math.min(...uraninites.map((c: any) => c.nucleation_step))).toBeGreaterThanOrEqual(100);

    // The state under test: morion before the first uraninite dose, past the ceiling after it.
    const hostMorionThenDosed = sim.crystals.filter((c: any) => c.mineral === 'quartz' && c.zones.length
      && (ledger.damageBeforeFirstDose.get(c) || 0) > 0.6 && c.radiation_damage > 0.7);
    expect(hostMorionThenDosed.length).toBeGreaterThan(0);
    for (const crystal of hostMorionThenDosed) {
      const text = sim._narrate_quartz(crystal);
      const sentence = narrative_variant('quartz', 'morion_uraninite');
      expect(text).toContain(sentence);
      // Two facts side by side. The uraninite did not do the darkening here, and
      // the sentence must not say it did, nor that the host rock alone did.
      expect(sentence).toMatch(/is morion/);
      expect(sentence).toMatch(/dose includes that of uraninite/);
      expect(sentence).not.toMatch(/darkened|turned|activated|host rock/i);
      expect(text).not.toMatch(UNFILLED);
    }
    // The run's own sentence counts every quartz past 0.3 and credits no source.
    const ofTheRun = smokySentenceOfTheRun(sim);
    expect(ofTheRun).toContain('knocked loose by radiation');
    expect(ofTheRun).not.toMatch(/uraninite|alpha/i);
  });
});

describe('tyuyamunite narrator: the carnotite it nucleated beside', () => {
  function tyuyamunite(position: string) {
    return { crystal_id: 31, mineral: 'tyuyamunite', habit: 'earthy_crust', c_length_mm: 0.4, position, dissolved: false, zones: [{}] };
  }
  const narrate = (position: string): string => VugSimulator.prototype._narrate_tyuyamunite.call(null, tyuyamunite(position));

  it('fills the carnotite\'s number from the position js/88 writes', () => {
    const text = narrate('adjacent to carnotite #12');
    expect(text).toContain('the calcium twin to a carnotite #12 growing in the same pocket');
    expect(text).not.toMatch(UNFILLED);
  });

  it('prints no number, and no braces, when the position carries none', () => {
    const text = narrate('beside a carnotite crust');
    expect(text).toContain('the calcium twin to a carnotite growing in the same pocket');
    expect(text).not.toMatch(UNFILLED);
  });

  it('does not print the sentence for a crystal on the wall', () => {
    expect(narrate('vug wall')).not.toContain('calcium twin to a carnotite');
  });
});
