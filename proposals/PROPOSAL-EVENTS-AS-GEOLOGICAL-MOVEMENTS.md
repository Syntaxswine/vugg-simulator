# PROPOSAL — events as geological *movements*, not instantaneous shocks

**Status:** design / discussion — NOT yet greenlit to build. Raised by the
boss 2026-06-01. This is a simulation-physics change that touches every
event-driven scenario's seed-42 output, so it gets a proposal + a pilot
probe + the boss's eye on the approach BEFORE any baseline regen.

---

## 0. The ask (boss's words, 2026-06-01)

> "right now a cooling event is one single moment, but imagine if a cooling
> event should be more like a period of cooling where maybe 10 slices of time
> have the option of no change or cooling where cooling is weighted with a
> higher probability. this sounds more geologically accurate than having it
> be truly random where you are just as likely to have a heating event follow
> a cooling event. as always this should follow the science, but i think the
> earth tends to move in longer slower movements."

The boss has the diagnosis exactly right. What he's describing has a name.

---

## 1. The science — persistence (red noise), not white noise

A process where each step is independent — where a heating step is as likely
to follow a cooling step as another cooling step — is **white noise**: no
memory, no trend, equal power at all timescales. The boss's intuition that
this is *unphysical* for geology is correct.

Real geological state variables (temperature, pH, salinity, fluid
composition) are **persistent / autocorrelated** — "**red noise**." Once a
system starts cooling, it tends to *keep* cooling; the probability of
continuing a movement is much higher than the probability of reversing it.
The canonical model is **AR(1) / Ornstein–Uhlenbeck**: the next state is the
current state plus a small increment biased in the direction of travel.

- **Hasselmann (1976), "Stochastic climate models, Part I: Theory"**
  (*Tellus* 28). The foundational result: slow variables (ocean, ice — or
  here, a cooling pluton / an evaporating brine) *integrate* fast random
  forcing, which turns white-noise input into red-noise output with strong
  persistence. This is the physics of "the earth moves in long slow
  movements." *(Bibliographic details to be re-verified before any citation
  lands in a data file or commit message — project anti-fabrication rule.)*
- **Paragenetic sequences are staged.** Mineralogy textbooks describe
  deposits as a sequence of *stages* — sustained condition regimes (a
  cooling stage, an oxidation stage) separated by *transitions*. A stage is
  a movement that persists; the scenario `events` list is really a list of
  *transitions between regimes*. Modeling each transition as an instantaneous
  jump throws away the regime that the transition opens.

So "follow the science" here = give events **persistence**: a movement, once
begun, continues with high probability and reverses with low probability,
playing out over a window of steps rather than one.

This also pays a musical dividend (where the thread started): a sustained sim
movement produces a sustained *musical* movement for free — a slow swell
instead of a single spike. The geology and the aesthetic want the same thing.

---

## 2. Current architecture (observed, `js/85d` + `js/70-events.ts`)

- **`apply_events()`** (`85d:60`): each step, for every event whose
  `event.step === this.step`, call `event.apply_fn(conditions)` **once**.
  That's the "single moment."
- **`apply_fn`s** (`70-events.ts`) are heterogeneous deltas on `conditions`:
  - additive — `temperature -= 50`, `pH -= 2.0`
  - multiplicative — `SiO2 *= 1.8`, `Fe *= 3.0`
  - absolute set — `Cu = 120.0`, `fluid_surface_ring = 1e6`
- **`ambient_cooling()`** (`85d:108`) is ALREADY a per-step continuous
  movement: `temperature -= rate · rng.uniform(0.8,1.2)` every step, plus the
  v162 **thermal-pulse** mechanic (stochastic episodic reheats gated on
  `wall.thermal_pulses`). So the *engine already knows how to do a persistent
  stochastic movement* — it just isn't applied to the discrete events.

That last point is the lever: #4 is "generalize the ambient-cooling movement
pattern to the discrete event system," not "invent a new mechanic."

---

## 3. Design options

The hard part is that `apply_fn`s are black boxes mixing additive /
multiplicative / absolute deltas, so "apply 1/N of the delta per step" isn't
uniformly definable. Three ways to handle that:

### A. Deterministic ramp (no new RNG)
Give each event `duration_steps` (default 1). Snapshot `conditions` at the
start step, run `apply_fn` to compute the TARGET state, then **ease the
touched fields from snapshot→target over `duration_steps`** (interpolate the
numeric diff). No `rng` draw → the RNG cascade is untouched; only the
interpolated field *values* differ. A ramp never reverses, so it sidesteps
the over/undershoot problem entirely.
- ✅ Simplest, calibration-safe (events left at `duration_steps:1` stay
  byte-identical). ✅ Works for additive/multiplicative/absolute uniformly
  (it interpolates the resulting numbers, treating `apply_fn` as a black box).
- ⚠️ Not *stochastic* — it's a smooth ramp, not the boss's "10 slices with
  weighted probability." Captures the *movement* goal but not the texture.

### B. Stochastic persistent drift (AR(1), the literal ask)
Same snapshot→target, but ease with a **biased random walk**: per step, high
probability of an increment toward target, low probability of pause, very low
probability of a small reversal — clamped so it lands on target by the end of
the window. This is literally "10 slices weighted toward cooling, rarely
reversing."
- ✅ Faithful to the boss's description; organic texture; reuses the
  `ambient_cooling` stochastic pattern.
- ⚠️ Introduces `rng` draws into event application → shifts seed-42 for
  **every** scenario UNLESS the draw is gated behind `duration_steps>1`
  (the same `&&`-ordering trick v162 used for thermal pulses, so
  un-migrated scenarios draw no extra rng and stay byte-identical).
- ⚠️ Needs careful end-of-window clamping so the net delta still equals what
  the scenario author intended (calibration depends on the totals).

### C. Recommended: a `movement` descriptor (A and B as profiles)
Add an optional per-event field in `scenarios.json5`:
```json5
{ type: 'cooling_pulse', step: 20, duration_steps: 10, movement: 'drift' }
```
- `duration_steps` absent / `1` and `movement` absent → **exactly today's
  instantaneous behavior, byte-identical** (the default).
- `movement: 'ramp'` → Option A (deterministic).
- `movement: 'drift'` → Option B (stochastic, rng gated on the descriptor).

Implementation sketch (engine side, `apply_events`):
1. On the event's start step, snapshot the numeric fields of `conditions`
   (`temperature`, `pressure`, `flow_rate`, every `fluid.*`).
2. Run `apply_fn` once into a scratch copy to get the TARGET; diff vs
   snapshot → the set of fields the event moves and their deltas.
3. Register an *active movement* {fields, from, to, startStep, duration,
   profile}. Each subsequent step until `startStep+duration`, advance each
   field toward its target (ramp = linear; drift = biased walk), and apply
   the *increment* to `conditions`.
4. Movements compose with `ambient_cooling` and with each other additively
   (just like the engine already layers cooling + depletion + pulses).

This keeps every existing scenario bit-for-bit until an author opts a
specific event into a movement — so we can migrate one scenario, regenerate
*one* baseline, and listen/look before touching the rest.

---

## 4. Cost & discipline (why this is a proposal, not a commit)

- **Baseline blast radius.** Any event migrated to a movement shifts that
  scenario's seed-42 trajectory — likely a large, intended drift across most
  chips. That's a `seed42_v<N+1>` regen + a SIM_VERSION bump + strip-digest
  regen for every migrated scenario. If we ever migrate broadly, that's most
  of the 30 scenarios. This is the opposite of a sim-neutral change.
- **RNG cascade.** Option B's `rng` draws must be gated behind the movement
  descriptor or they shift *every* scenario. Verify with the seed-42 diff
  that un-migrated scenarios are byte-identical (the v162 thermal-pulse
  commit is the template for proving this).
- **Calibration meaning.** Several scenarios are tuned so a mineral *just*
  crosses its σ gate at an event. Spreading the delta over 10 steps changes
  *when* (and whether) the gate is crossed — migrating an event may require
  re-tuning that scenario's `expects_species`. Pilot first.

## 5. Recommended next step (for the boss to confirm)

1. Build Option C's engine scaffold **dark** (default-off; zero behavior
   change; full suite stays byte-identical — provable, sim-neutral commit).
2. Write `tools/event-movement-probe.mjs`: run ONE scenario (candidate:
   `cooling`/`pulse`, a simple JSON5 scenario) with an event as instantaneous
   vs `ramp` vs `drift`, and dump the temperature/pH trajectories so we can
   *see* the movement before committing to it. (Build-the-tool-to-verify.)
3. Migrate that ONE pilot event, regen its baseline, look at the strip chart
   AND listen to the sonified result, and decide ramp-vs-drift by ear+eye.
4. Only then decide the broader rollout (which scenarios, ramp vs drift per
   event) — likely incremental, scenario by scenario, each its own dense
   commit.

## 6. Open questions

- **Ramp or drift as the default movement?** Ramp is calibration-friendlier
  and never reverses; drift is the literal ask and more organic. We may want
  drift for temperature (real reheats happen) and ramp for monotonic things
  (evaporative concentration). Decide per field-type?
- **Window length.** Boss said "~10 slices." Fixed, or scaled to the
  scenario `duration_steps` (a movement is, say, 10% of the run)?
- **Should some events stay instantaneous?** A tectonic shock or a fracture
  breach IS geologically fast — those *should* stay a single step. Movements
  are for thermal/chemical regimes, not mechanical ruptures. (This argues for
  opt-in, not a global flip.)
