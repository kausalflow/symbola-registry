# Review questions for kausalflow/homeostat

Four components, 56 obligations, 6 assumptions. Every component passes its own spec when the original runs through `oracle/<name>/` (the adapters call the original code and reduce its result to the JSON the contract states; they never edit it).

| component | what it holds | examples | properties | mutants killed |
|---|---|---|---|---|
| `scenario-issues` | codes, locations, fix and hint of `homeostat validate`; warnings; the staging of problems | 119 | 12 | 7/7 |
| `scenario-truth` | signal table, loops, roles, causal graph, event log, promoted parameters, timeline | 28 | 7 | 8/8 |
| `run-series` | step order, exact discretization, ramps, reproducible keyed random streams (statistical checks hold across seeds) | 13 | 11 | 4/4 |
| `cli-contract` | exit codes 0/1/2/3, where problems go, the `--json` shapes | 44 | 8 | 7/7 |

## 1. Non-goals and priorities to confirm

Non-goals in `BRIEF.md`: no physics; no bit-identical numbers across NumPy versions or between a rebuild and the original; no speed requirement; no GUI/server/live operation. Priority order: (1) validate/run agree and problems are actionable, (2) exact complete ground truth, (3) reproducible keyed streams, (4) dt-independent dynamics, (5) scriptable CLI, (6) message readability. Is the order what you want, in particular ground truth above reproducibility?

## 2. `default` obligations to confirm

- `issues.stages`: six stages, an earlier stage hides the later ones. The CLI tells users to "fix them all, then validate again", but is hiding a deliberate rule or an accident of how the loader is written? A rebuild that reports everything at once would fail 6 examples and a property.
- `issues.sorted-report`: not product behaviour; the contract sorts issues by (location, code) so outputs compare as data.
- `truth.event-order`: same-step events go in order of time, interventions before plan transitions. Chosen because `value_before` shows it; do you want it as a promise?
- `truth.event-ids`: `ev<position>` and `transition<position>.<j>`. Exact spelling pinned; confirm or make it open.
- `series.integrator`: clipping to `[lo, hi]` from `initial`.
- `cli.problem-channels`: `validate` prints a failing report on standard output while every other command uses standard error (see the bug list). Confirm that this asymmetry is wanted.
- `cli.json-shapes`: top-level key sets of `run`, `explain`, `diagnose`, `diff` pinned; confirm that adding a key is a contract change.
- `cli.convert`: `convert` does not validate.

## 3. Assumptions to confirm

`K-same-numpy-version`, `K-trusted-plugins-and-snapshots`, `K-scenario-sizes-are-sane`, `K-time-is-simulated`, `K-yaml-reads-the-scenario-as-written`, `K-process-library-is-installed`. The two with a monitor worth keeping: reproducibility info in `run.meta`, and the `steps` count in the validate summary.

## 4. Behaviour of the original that looks like a bug (the spec does not pin these)

1. `plan: true` (any non-mapping `plan`) or a non-list `plan.maintenance` makes `validate` raise `AttributeError`/`TypeError` inside `has_generators` instead of reporting E_SCHEMA. Found by fuzzing. The property `test_malformed_input_is_reported_never_raised` excludes it so the original passes; the obligation `issues.malformed-input-is-reported` says it should be reported.
2. `seed: -1` validates, then the run fails inside NumPy (`SeedSequence`) with a bare `ValueError`. `validate` should reject a negative seed.
3. Inconsistent locations: a parameter value out of bounds in an intervention is E_BAD_EVENT located at the parameter path (`u.Kc`) rather than `interventions[i]`; the same in the starting regime is E_BAD_PARAM at `regimes.A.u.Kc`; a bad mode name in a regime is located `regimes.B.mode: regimes` or `regimes`. None of these is in the examples.
4. Two interventions (or events) with the same `id` are accepted; the event log then has ambiguous ids.
5. A plan without `plan.start` names its first transition `None->B` in the timeline and the label (the Python `None`). The contract's timeline description says there is no regime before the first transition; no example covers it.
6. Some E_SCHEMA problems come with no fix at all (an unparseable duration, `lanes: 0`); the other codes always have one. Hence `issues.fix-offered` excludes E_SCHEMA.
7. `regimes: {A: {sp: MAN}}` is accepted (a mode name on a non-mode target becomes 0).
8. Where an E_ALGEBRAIC_LOOP path starts depends on declaration order and discovery order; the contract rotates it to the smallest id.
9. `validate` cannot see runs that cannot settle (an integrator with a non-zero input and `init: steady` gives E_INIT_NO_STEADY_STATE only when running).
10. Location style differs by stage (`custom[0]: y.u` while building, `y.u` when compiling).
11. An empty or false `faults` (`faults: []`, `faults: null`) is not expanded, so validation reports it as an unknown key (E_SCHEMA at `faults`), while a non-empty list is valid. Found while writing version 2; not pinned.
12. A non-list `faults` (`faults: 1`) makes `validate` raise `TypeError` inside the fault generator instead of reporting E_SCHEMA. Not pinned; the unknown-key property never generates `faults`.

## 5. Requirements without a home

Things CLAUDE.md or the design call requirements that the four components above cannot hold, with the kind of check each would need:

- **Core never mentions hardware** ("reactor", "valve", "sensor" in `homeostat/core/`). A static check over a source tree: grep identifiers, docstrings and comments. Needs a source-level check driver, not an input/output component.
- **Plugins use only the public core API; extensions add vocabulary, never engine behaviour.** An import-graph check over the source (`homeostat.libraries`, labelers, ai, domains may not import private core modules).
- **Every operator's scalar kernel equals its array `output`/`update`; the compiled (Numba) step matches the Python step to the last bit or to rounding.** Needs two implementations of the same engine in one process and a numeric comparison with a tolerance; a rebuild with one step has nothing to compare. The kernel parity part is an internal-consistency test of the original.
- **Resumable engine: `run(until)` in pieces equals one run; `fork()`, `snapshot()` and `Engine.restore()` continue exactly; `result(clear=True)` hands over pieces that together are one run.** Needs a stateful session driver: an input that is a sequence of calls on one live engine (run, schedule, fork, snapshot, restore, result) with the output the final series, and metamorphic properties (pieces equal whole). The `run-series` output could be that component's output.
- **Feedback operators read measured values, so measurement error propagates into the process.** A statistical check over seeds: a plant with a noisy sensor has a controller output whose variance exceeds the noise-free one, and the true value depends on the measurement noise. Needs the pid and an observation noise operator in a series component; not done here because the pid and noise operators are outside this pack's vocabulary.
- **Same config + seed + package version + NumPy version gives identical output across processes, machines and the compiled/uncompiled step.** `run-series` checks same-process repetition only; a cross-process check needs a runner that calls the implementation twice in fresh processes (or on two machines) and compares.
- **`run.meta` records Homeostat, NumPy, Python, platform, seed, dt, lanes, noise keys, step kind and `config_hash`; the hash ignores `expect` and pins the library version.** The hash is the SHA-256 of the canonical JSON of the validated model with defaults filled in, so a rebuild needs the exact model dump; a component could take a scenario and return the hash, but would pin the original's field names and defaults. Left out on purpose.
- **Multi-rate stepping (`period`, `phase`), `init` variants, `family()` draws and generators, plan-driven histories with maintenance and degradations, `labelers` (visibility, settle times, feasibility, lineage), `diagnose` evaluation of expectations, `eval`.** All deterministic or statistical behaviour of the scenario language that needs the `process` library or simulated values; each wants its own component of the same kind as `scenario-truth` / `run-series` (scenario in, summary out).
- **Docs, examples and bundled reference stay in sync with the code (`scripts/gen_reference.py`, `tests/test_docs.py`), the site builds in strict mode, release by tagging `v<version>`.** A repository-level check driver (run a generator, diff the tree, build the site).
- **Performance** ("several hundred times faster" with Numba). A benchmark with a threshold on a reference machine; not a contract-level check.

## 6. Left out on purpose

- The `process` library: templates (flow, level, temperature loop, pressure, mixer, heat exchanger, reactor, cstr), ISA tag derivation, sensor presets, fault aliases, degradations, maintenance tasks. This is the largest piece of ground truth left: `scenario-truth` and `scenario-issues` could take scenarios with `library: process@1` and units, and a rebuild would then need each template's signal names, roles and edges. Recommended as the next round, one example per template, since the format already holds it.
- Operators outside the vocabulary table of `scenario-issues` (bias, clip, delay, fopdt, gate, log_linear, product, quantize, sample_hold, saturation, stiction, variable_delay, weighted_mean, white_noise) and the PID's own numbers (earlier draft covered PID/FOPDT/schedules).
- Commands `guide`, `describe`, `schema` (the published JSON Schema), `examples`, `skill`, `eval`.
- Values of the simulated signals beyond what holds for every seed (the exact numbers differ between machines and NumPy versions).
- The wording of messages and the layout of text output (`issues.message-wording`, `cli.text-layout` are `open`).
- `symbolon` oracle caveat: the adapters normalize three things the original leaves incidental: issue order, event-log order (by applied time, id, lane) and where an algebraic-loop path starts.
