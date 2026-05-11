# PROPOSAL: Narrative-Tempo Live Play

> **Status:** Active. Phase 1 in progress as of 2026-05-09.
> **Authored:** 2026-05-09 by Claude (Sonnet 4.5), at boss's direction: *"the vugg should grow at the speed that the text scrolls"* — initial play (not just replay) should pace the cavity's evolution against the narrator's voice, so reading and watching are the same activity.
> **Living doc:** Append observations to §8, decisions to §9.

---

## 1. Phase tracker

| phase | name                                       | status      | shipped commits      | notes |
|-------|--------------------------------------------|-------------|----------------------|-------|
| 0     | This proposal                              | landed      | `e3d2127`-era         | Plan + design vocabulary. |
| 1     | Legends/Simulation mode: cavity tracks log | landed      | `fad78f2`             | `runSimulation` builds `lineToStep` map, `displayLines` calls `topoRender(snap)` on each step-header line. |
| 1.5   | Click-to-continue at prologue + epilogue   | landed      | `19e5064`             | Pulsing pill at story boundaries. Click / Enter / Space all advance. Capture-phase keydown so it doesn't fight the replay shortcuts. |
| 2     | Quick Play (random) mode                   | landed      | `a5a0e41`             | `displayLines` parameterised on outputEl + onDone; random mode now uses the same pattern. PREAMBLE→main→CRYSTALS/DISCOVERY/narrative scroll with both pills. |
| 2.5   | Reverse-flow layout + replay-speed couples | landed      | `414a3e8`             | `.narrative-flow-reverse` CSS (flex column-reverse). `_topoPlaybackSpeed` drives setTimeout delays. Floating speed cluster surfaces during play. Random's full-narrative wrapped in GEOLOGICAL HISTORY box so internal prose flows top-down. Boss directive 2026-05-11: "thats the key to getting the tempo to match." |
| 3     | Fortress (Creative): paced action results  | landed      | `6398bdd`             | `_fortressPaceLines()` mirror of `displayLines` adapted for accumulating log + action-lock semantics. `wait`/`wait_10` actions now tick out at tempo; non-time actions stay synchronous. Action grid disabled during playback; speed cluster mounted. 4× = effectively the old "all at once" feel without losing the grammar. |
| 3.5   | Per-step pacing (2s / 1s / 0.2s presets)   | landed      | `6110d6d`             | Time unit shifts from "ms per line" to "seconds per step." A step's allotted duration is divided evenly across its line count, so step cadence is consistent regardless of line density. Speed cluster rebuilt as three duration-labeled buttons: `2s` (speed 1, default reading pace), `1s` (speed 2, fast/watching), `0.2s` (speed 10, quick/skim). All three modes (Simulation/Quick Play/Fortress) consume the same `stepLineCounts` map. |
| 4     | Tempo module unification (live-play only)  | landed      | `9f1e6cd`             | The three live-play timers now share a single engine: `displayLines` in `js/91-ui-legends.ts` extended with `clearOutput` / `appendLine` / `onStart` hooks. `_fortressPaceLines` collapsed from ~90 lines to a 30-line delegating wrapper. The replay timer in `js/99g` stays separate (iterates snapshots, not lines; has its own scrub-bar UI). Replay unification is intentionally deferred — uncertain payoff for the vocabulary expansion the engine would need. |
| 5+    | Replay timer unification (deferred)        | open        | —                    | Optional follow-on: extract a yet-more-general `_topoTempoTimer` that drives both line-iteration (live play) and snapshot-iteration (replay). Would bring replay's scrub bar to initial play. Hasn't been demanded by use; consider only if the live-play surfaces grow scrub controls organically. |

Each phase ships independently. Phase 1's value (a single mode reading honestly) doesn't depend on Phase 2-4 ever landing.

---

## 2. Why this matters

The boss's framing: *"reading and watching are the same activity."* Today they aren't. The user clicks **Grow** or picks a scenario, the simulator burns CPU for ~200ms running 100-300 steps synchronously, then the narrator text scrolls into the output box at ~18ms/line while the topo panel sits frozen on the *final* cavity. The cavity is the answer; the narrator is the story; they're decoupled.

When they're paced together:
- Step-3 nucleation prose appears as the cavity shows the step-3 cavity wall (still pristine, one tiny crystal seed).
- Step-50 dissolution event prose appears as the cavity visibly shrinks back from a wall promontory.
- Step-200 paramorph transition prose appears as the crystal color/identity in the rendered scene shifts.

Reading becomes watching. The narrator's pace becomes the simulator's clock.

This is also the foundation for §11.3 of `PROPOSAL-CAVITY-MESH.md`'s "Replay + narrator pairing" — the replay path already shipped (v65-v67). What's missing is the **initial play** sharing the same tempo grammar.

---

## 3. What's already there to build on

### 3.1 Per-step log lines
`sim.run_step()` returns the lines emitted during that step. `js/91-ui-legends.ts:66`:

```ts
for (let s = 0; s < totalSteps; s++) {
  const log = sim.run_step();   // ← lines for step s
  ...
}
```

The current `runSimulation` flattens these into one `allLines` array indexed only by reading order. The proposal: keep the step→lines mapping so the renderer can know "I'm scrolling line L, which sim step does it belong to?"

### 3.2 Per-step cavity snapshots
`wall_state_history` (post-v65 multi-ring, post-v66 with conditions+paramorph, post-v67 decimated). Every snapshot has `step`. The renderer's `_topoRenderThree(sim, wall, snap, replayStep)` accepts a snapshot and historical step → cavity + crystal sizes are honest at any historical step. **This is replay's core capability; we reuse it for live play.**

### 3.3 Replay timer
`js/99g-renderer-replay.ts` has the per-frame timer machinery (`_topoReplayStartTimer`, `_topoReplayRenderFrame`). It's currently invoked by the ▶ button. Phase 1 doesn't co-opt this; it adds a parallel tempo-driver in `displayLines`. Phase 4 unifies them.

### 3.4 Step headers in the log
`sim.format_header()` emits `═══ Step N ═══` lines between each step's log lines. `js/91-ui-legends.ts:69`. These are the natural sync points: when a step header scrolls into view, we render the cavity for that step.

---

## 4. Phase 1 — Legends/Simulation cavity-track

**Goal:** When the user clicks **Grow** in Simulation mode, the topo panel cavity updates step-by-step *as the narrator scrolls* instead of pre-painting the final state.

### 4.1 Mechanism

Modify `runSimulation` (`js/91-ui-legends.ts:40`) to also build a parallel `stepsBySnap` map: snapshot index → step number. Modify `displayLines` (line 97) to:

- Carry a current snapshot pointer alongside the current line index.
- When the line being scrolled is a `═══ Step N ═══` header, look up the snapshot for step N (nearest-not-greater under decimation), call `topoRender(historyEntry)`, and update the fortress-status panel via the same replay-aware path the replay timer already uses (`_topoReplayActiveSnap = snap`).
- When the final line scrolls in, clear `_topoReplayActiveSnap` so subsequent renders go live.

### 4.2 What stays the same

- The sim still runs synchronously up front. Storing the full history is what makes the playback affordable; the engine isn't being driven by the UI clock.
- The 18ms-per-line scroll rhythm. Phase 1 doesn't retune the text speed — it just couples the cavity to it.
- The replay button still does its own thing on top of `wall_state_history`. Phase 4 unifies the two paths; Phase 1 leaves replay alone.
- Decimation policy from v67 (`_replayStride`). Snapshots are still gappy at long runs — the cavity update tracks every available snapshot, not every literal step. For a 200-step run that's ~63 snapshots, scrolling at 18ms × ~6 lines/step ≈ one cavity update per ~108ms.

### 4.3 Scope

| file                          | lines changed | nature |
|-------------------------------|--------------:|--------|
| `js/91-ui-legends.ts`         | ~30           | Build step→lines map in `runSimulation`; threading snap-pointer through `displayLines`. |

That's it for Phase 1. ~30 lines, one file.

### 4.4 Verification

- Open Simulation mode, pick `porphyry`, seed 42, default steps. Click Grow.
- During the text scroll, watch the topo panel — cavity should expand smoothly from a small sphere to its final lumpy form. First-step crystals appear as tiny dots; later-step crystals fill in.
- Step-header line scrolls into view → cavity advances within ~50ms. The user reads about a step right as the cavity shows that step.
- `npm test` — 65/65 green, no SIM_VERSION bump (display-only change).

### 4.5 Risk

- **Low.** Pure display-layer change. The sim's history is the source of truth and is already populated correctly. Worst case: a snapshot lookup misses (decimation gap) and the cavity stays one step behind — visible as a small lag, not a wrong cavity.

---

## 5. Phase 2 — Quick Play (random) mode

Same pattern, applied to the random-mode generation path. Currently in `js/96-ui-random.ts` (random mode owns `randomSim`). The function that builds and runs a random sim probably does a similar synchronous-burst-then-display; mirror the Phase 1 retrofit.

Defer until Phase 1 ships and we have feedback on tempo feel.

---

## 6. Phase 3 — Fortress (Creative) action playback

The harder one. Fortress actions like `wait_10` and `evaporate` synchronously run 10 steps and emit 10 batches of log lines. Today these splat into the log immediately + the topo jumps directly to the post-action state.

Phase 3 vision: when an action would run N>1 steps, the action "plays out" over time at narrative tempo. UI implications:
- Action buttons disable while a playback is in flight.
- A small "playing..." indicator or cancel-button surfaces.
- The user's *next* action gets queued or rejected during playback (probably rejected; UX is "wait for the current event to finish before clicking again").

This is a UX shift worth designing carefully — Fortress today is rapid-fire interactive. Slow-paced playback feels different. Possible mitigations:
- A "fast-forward" toggle (4× speed) that compresses the playback to ~near-instant for users who want the snappy feel.
- Auto-pause-then-action-queue model: the action plays out, but during playback the user can pre-click their next action, which fires the moment the current one finishes.

Defer until Phase 1-2 land and we know how tempo feels.

---

## 7. Phase 4 — Tempo module unification

The replay timer (`js/99g-renderer-replay.ts`) and the Phase 1-3 live-play timers share most of their logic: walk through snapshots, render each, update fortress-status, scroll lines. Phase 4 extracts a `_topoTempoTimer` module that drives both.

Benefits:
- Speed control (0.5×/1×/2×/4×) applies to live play too. Power users can speed up Simulation mode's intro.
- Pause / scrub / frame-step controls already shipped for replay become available during initial play.
- Auto-pause-at-end semantics from `e9f755a` apply to live play too — cavity sits on its final state, narrator log fully scrolled, until user explicitly stops.

Defer to last; this is a cleanup, not new capability.

---

## 8. Observations log — append as you work

Future agents: when you notice something while working on tempo that's not in this proposal, add it here.

### 2026-05-09 — Sonnet 4.5 — `runSimulation` already records step boundaries via `format_header`

The `═══ Step N ═══` line is the natural sync point. Pattern-matching on it in `displayLines` is sturdier than tracking a parallel step counter, because if the sim ever changes how it pushes step boundaries we'd want both to drift together. The header-line approach inherits any future change to step framing.

### 2026-05-09 — Sonnet 4.5 — Decimation creates a "snapshot stride" that's >1 sim step

After v67 `_replayStride`, the cavity can only update at the granularity of available snapshots. Early in the run (stride 1) the cavity updates every step; late in the run (stride 81 by step 810) it updates every 81 steps. For a typical 200-step run, this means the early steps feel granular and the late ones feel chunky. That's actually correct behavior — most of the geological action happens early.

### 2026-05-09 — Sonnet 4.5 — Phase 1 doesn't need `_topoReplayActiveSnap`-equivalent for the fortress panel

Fortress mode isn't in Legends/Simulation, so the fortress-status panel isn't visible during Phase 1. We don't have to thread snapshot-aware conditions through the σ-pill renderer here. That coupling matters in Phase 3 (Fortress live play); skip for Phase 1.

### 2026-05-11 — Sonnet 4.5 — Phase 2 wasn't a trivial port

The proposal called Phase 2 a "trivial port once Phase 1 is shaped." That was wrong. Quick Play (random) mode previously did `out.textContent = bigString` — no scroll mechanic at all. The actual work in Phase 2 was (a) generalising `displayLines` to accept an output element + onDone callback, (b) restructuring `runRandomVugg` to mirror Simulation's per-step-log-capture pattern, and (c) deciding which beats become prologue/epilogue. The retrofit is ~150 lines, not "trivial." Future phase planners: don't trust adjacency. Read the call site first.

### 2026-05-11 — Sonnet 4.5 — Unify the live-play engines, leave replay separate

Phase 4 unifies the three live-play timers (Simulation, Quick Play, Fortress) by extending `displayLines` into a shared engine; mode-specific concerns (clear-vs-accumulate, custom line render, action-grid lock) become callback options. The replay timer in 99g is intentionally NOT folded in. Reasons: (a) it iterates snapshots, not lines — fundamentally different unit. (b) it has play/pause/scrub/frame-step controls that live-play doesn't have. (c) the cost of generalising the engine to handle both data models (line vs snapshot) is high. (d) the payoff — "bring scrub bar to initial play" — hasn't been demanded; the click-to-continue gates already give the user a meaningful pause point, and the speed cluster covers tempo. Adding it as Phase 5+ only if/when use demands it.

The three modes that DID get unified shrank substantially: `_fortressPaceLines` was ~90 lines of paced-scroll machinery; it's now ~30 lines (mostly the options block). Net: ~150 lines of duplication eliminated, one engine to update for future tempo features.

### 2026-05-11 — Sonnet 4.5 — Per-step pacing is the right unit, not per-line

Originally the tempo paced lines at a fixed 18ms each, scaled by `_topoPlaybackSpeed`. Boss redesigned 2026-05-11 — the time unit should be PER STEP. Each step gets the same display budget regardless of how many lines the engine emitted for that step. Implementation: `stepLineCounts: Record<simStep, lineCount>` map, and `perLineDelay = (2000 / speed) / linesInStep`. This makes a step-with-3-lines and a step-with-12-lines feel the same in viewing rhythm, which matches the user's mental model ("each step is a unit of geological time, not a unit of prose density"). The line-density variation now reads as "noisier steps are denser-paced, quieter steps are airier" — accurate metaphor for what's actually happening chemistry-wise.

### 2026-05-11 — Sonnet 4.5 — Reverse-flow via flex column-reverse, not insertBefore

Considered prepending lines with `insertBefore(el, output.firstChild)` instead of CSS flex column-reverse. Picked CSS for two reasons: (a) the narrative-box's INTERNAL multi-paragraph prose still wants top-to-bottom reading order — with column-reverse on #output, the box itself is one flex child but its internal paragraphs flow normally; with insertBefore on every line, we'd have to special-case narrative-box internal prepends, awkwardly. (b) `copyFortressLog` (and the analog Simulation copy) read the DOM in chronological order. CSS reversal preserves that — DOM order is appendChild order, which is chronological. Visual reversal is purely paint-time.

### 2026-05-11 — Sonnet 4.5 — Speed cluster lives at body-document level, not inside topo panel

`.narrative-speed-cluster` mounts at `document.body` and uses `position: fixed; top: 1rem; right: 1rem`. Considered placing it inside the topo panel or as part of the replay bar, but the cluster needs to be visible across all three modes (Simulation, Quick Play, Fortress) and the topo panel isn't always visible in every mode (e.g. when only an inline output is showing during the transition). Body-fixed top-right is unobtrusive and always reachable. The replay bar's own speed cluster stays scoped to the bar; the floating cluster mirrors its state via `topoReplaySpeed(s)` calls.

### 2026-05-11 — Sonnet 4.5 — `running` is the shared cross-mode lock

`let running = false` in 91-ui-legends.ts is now a shared lock across narrative-tempo modes. Phase 2 reuses it as the re-entry guard for `runRandomVugg`. Future agents adding tempo to other modes (Phase 3 Fortress, Phase 4 unification) should consult `running` rather than introducing per-mode flags — the value of one shared lock is that the replay-shortcut listener in 99g can also gate on it (the bail-when-narrative-tempo-active behaviour shipped in `1c08f08` extended in `19e5064`).

### (next agent) — append here

---

## 9. Decisions log — append when you decide

### 2026-05-09 — Boss + Sonnet 4.5 — Tempo lives in the display layer, not the engine

Decided: the sim still runs synchronously up front. The history-driven playback is what creates the perceived tempo. We do NOT introduce a "tick at narration speed" mode in the engine itself (which would mean step-pinned setInterval) because that would couple chemistry rate to UI rate, which is fragile (paused tab = paused chemistry = nonsensical). Better: chemistry runs as fast as the CPU can; the display chooses how fast to *show* it.

### 2026-05-09 — Sonnet 4.5 — Step-header line as the sync point

Decided: tempo-aware playback hooks on `═══ Step N ═══` lines in the display stream, not on a parallel counter. Reason: this remains correct even if the engine's step-framing changes; the display sync moves with the display itself.

### (next agent) — append here
