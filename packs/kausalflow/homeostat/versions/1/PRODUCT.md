# Homeostat: the product

A build of this pack is the homeostat package: a Python library and a `homeostat`
command that turn a scenario file into a plant history with its ground truth. It is
not a demo of the four components. The components are its core: every place below
that names one must keep its rules, and must not reimplement them differently.
Everything else here is the product around them. Where this file is silent, choose
what a careful builder would, and note it in `NOTES.md`.

## Shape

- A **Python package** `homeostat` (Python 3.11 or later; NumPy, pandas, Pydantic
  and PyYAML are enough), installable with pip, with the console command
  `homeostat` (`python -m homeostat` does the same).
- Two layers. The **core** is pure math: operators, a graph of signals, an engine
  that steps it, events. A **domain library** is a plugin that turns names
  (templates, ISA tags, sensor presets, faults, degradations, maintenance tasks)
  into core operators and events. The package ships one library, `process`
  (version 1), registered under the entry point group `homeostat.libraries`.
- Everything works **offline**: the documentation, the examples, the schema and the
  catalog are inside the package. No network, no server, no account.
- The audience is a person or an AI assistant with a shell. Every problem is
  reported as an issue with a code, a location and a fix (`scenario-issues`).

## Surfaces

**The scenario.** YAML or JSON, the keys of `scenario-issues` plus these, which the
`process` library and the generators add:

| Key | What |
|---|---|
| `units` | `{id, template, period?, note?, <template parameters as keys>}` |
| `exogenous[].measured` | `{tag, sensor?, span, installed?}`: an instrument on any signal |
| `interventions[]` with `fault` | `{at, target: <unit>, fault, magnitude?, profile?, over?, lanes?}` |
| `degradation[]` | `{target: <unit>, kind, note?, <its parameters>}` |
| `plan.maintenance[]` | `{at, task, target: <unit or list>, duration?, id?, note?}`, or recurring: `{task, target, every, first?, jitter?}` |
| `plan.production` | a list, or a generator `{cycle: [...] or next: {from: {to: weight}}, campaign, over}` |
| `faults[]` | random faults, expanded into `interventions` and removed before validation (so it is not among the keys `scenario-issues` lists): `{target: <unit or list>, every, kinds: {fault: weight}, magnitude?: {fault: number or distribution}, after?}` |
| `family` | `{plants, histories}` |
| `init` | `steady` (default), `none`, or `{burn_in: <duration>}` |
| `output.start` | a date-time: the index becomes timestamps |
| `expect[]` | kinds `stat`, `shift`, `saturation`, `settles`, `visible`, `feasible` (Flow 5) |

Any number, duration or choice may be a **distribution**, anywhere: a unit's
parameters, a source's, event and plan times (`at`), generator `campaign`, `jitter`
and fault `magnitude`, regime values: `{normal: {mean, sd}}`,
`{lognormal: {median, sigma}}`, `{uniform: [a, b]}`, `{loguniform: [a, b]}`,
`{choice: {a: w, ...}}` or `{choice: [a, b]}`; numbers may be durations, and a
choice may pick a template.

**Operators.** `scenario-issues` specifies eight. The full set, usable under
`custom` and used by the templates (outputs are `out`; each is exact for its step):

| Op | Rule |
|---|---|
| `clock` | the time in seconds (0 while settling, negative during a burn-in) |
| `product` | gain · Π in_i (`n`, `gain`) |
| `weighted_mean` | Σ w_i x_i / Σ w_i over inputs with w_i > 0, else hold (`n`; inputs x0.., w0..) |
| `log_linear` | ln y = bias + Σ w_i f_i(in_i), f = lin, log or inv; NaN outside the domain |
| `fopdt` | first order plus dead time, exact for dead times that are not whole steps (`K`, `tau`, `theta`) |
| `variable_delay` | plug flow: the value leaving entered when the throughput since then was `capacity` (`rate` input, default 1; `max_delay`; zero rate holds) |
| `saturation` | clip to [lo, hi] (dynamic) |
| `stiction` | two-parameter stick-slip (He et al. 2007), static band `fs`, dynamic band `fd` |
| `bias`, `white_noise`, `clip`, `quantize` | observation stages: + offset, + std·ε, clip, round to `step` (not while settling) |
| `delay` | fixed dead time of an observation stage |
| `gate` | passes `u` while `open` ≥ 0.5, else NaN |
| `sample_hold` | samples every `period` (with `phase`), holds between |

A `pid` holds its output and freezes its integral on a NaN measurement; MAN with a
NaN manual output holds the last output; mode switches are bumpless.

**The `process` library.** A loop unit `XIC-nnn` (X = F, L or T) creates
`XT-nnn` (the reading), `XV-nnn` (the valve), and `<id>.sp`, `.mode` (0 MAN, 1
AUTO, 2 CAS), `.man_out`, `.out` and `.cv` (the true regulated variable); analyzers
and labs get `AT-nnn`; ports are `<id>.<port>`, inner parameters paths such as
`TIC-101.plant.K`. A loop is named after its unit id (`TIC-101`, in `meta["loops"]`,
roles and expectations); its controller is `<id>.pid`. Every loop is: schedules for sp, mode and man_out, a `pid`
(reverse acting unless stated), `stiction` on its output, `saturation` 0 to 100 as
the valve, the plant below, and the instrument chain of its `sensor` on `cv`. Loop
parameters common to all loop templates: `sp`, `mode` (AUTO), `Kc`, `Ti`, `tuning`
(`manual`, or `simc`: Kc = τ/(K(τc + θ)), Ti = min(τ, 4(τc + θ)), τc = detune ·
max(θ, τ/4)), `detune` (1), `Td` (0), `fs`, `fd` (0), `scan` (0 = every step),
`sensor`, `span`, `cv`. A port nothing drives is a schedule at its default.

- `flow_loop`: sp 50 m3/h, Kc 0.8, Ti 5 s, magnetic_flowmeter, span [0, 100].
  cv = fopdt(K 1, tau 5 s, theta 1 s)(valve) + Kp 5 · `pressure` (bar, default 0).
- `level_loop`: sp 50 %, Kc 1.4, Ti 1200 s, radar_level, span [0, 100], direct
  acting. outflow = first_order(Kv 0.5, tau_v 2 s)(valve); cv = integrator of
  `inflow` (default 20 m3/h) − outflow with k = 100/(3600 · area 2 · height 3),
  limits 0 to 100. simc for an integrating plant with τc = 300 s · detune.
- `temperature_loop`: sp 80 degC, Kc 4, Ti 600 s, thermocouple, span [0, 200].
  cv = base 10 + fopdt(K 0.8, tau 600 s, theta 60 s)(valve) + first_order(Kd 0.5,
  tau_d 900 s)(`feed_temp`, default 25).
- `heat_exchanger`: sp 70, Kc 4, Ti 300 s. cv = fopdt(gain 0.6 · F_nom 20/`flow`,
  300 s, 30 s)(valve) + first_order(1, tau_in 300 s)(`inlet_temp`, 25); `flow`
  defaults to 20 m3/h, and a gain or time constant driven by a signal stays exact.
- `mixer` (no loop): ports `flow_a` 10, `prop_a` 1, `flow_b` 10, `prop_b` 3; the
  flow-weighted mean property, then plug flow through `volume` 2 m3 at the total
  flow (`max_transit` 6 h), measured by an online analyzer (`analyzer` true, `span`
  [0, 10]). Signals `<id>.flow`, `<id>.mix`, `<id>.out`.
- `reactor`: a temperature loop (same defaults) plus the product property: q_inst
  = q_ref 2 · exp(−E_R 5000 (1/T − 1/T_ref)) · `ratio`^b · activity (T in kelvin,
  t_ref 80), plug flow through `volume` 5 m3 at `flow` (10 m3/h) to `q_reactor`,
  back-mixing with tau_mix 600 s · F_nom 10/flow to `q_product`, and a lab on it
  (`lab_period` 4 h, `lab_delay` 1 h, `lab_noise` 2 %, `lab_span` [0, 10]).
- `cstr`: a stirred reactor with feeds `flow_a` 8 and `flow_b` 2 m3/h and an
  `impurity` (1 ppm) in feed A. Latent states: the fraction of B left (dx/dt =
  D(x_in − x) − k x, k Arrhenius in T with `k_ref` 4/h and `E_k` 8000 K, cut by
  catalyst activity and exp(−`poison` 0.3 · impurity)); the reaction heat (`dT_rxn`
  50 degC per unit converted) and feed cooling (`Kf` 1.5) in the temperature;
  q_inst = q_ref 1 · (x/x_ref 0.08)^b 0.8 · Arrhenius(`E_q` 3000) · exp(`gamma`
  0.15 · impurity) · activity^c 1.5, optional side product (`side_effect`,
  `E_side`, `t_side`) and slow unexplained OU variation (`q_noise`); mixed over V/F,
  plug flow through `pipe_volume` 0.5 m3, then a lab (span [0, 2]). `cooling: true`
  makes the valve remove heat and the controller direct acting.

Instrument chain, from true value to reading: lag → bias → white noise → clip to
span → quantize (→ sample-and-hold → delay) → a gate on `<tag>.installed`. Noise and
quantization are % of span:

| Preset | Lag | Noise | Quantization | Sample, report |
|---|---|---|---|---|
| `thermocouple` | 20 s | 0.05 % | 0.01 % | every step |
| `magnetic_flowmeter` | 1 s | 0.5 % | 0.05 % | every step |
| `radar_level` | 2 s | 0.2 % | 0.1 % | every step |
| `online_analyzer` | 1 min | 1 % | 0.1 % | 10 min, 5 min later |
| `lab` | none | 2 % | 0.5 % | 4 h, 1 h later |

Faults (events on the unit's parameters; label `fault:<name>`, origin
`fault:<name>@<unit>`): `valve_stiction` (fs = magnitude, default 3 %, fd half;
ramp 12 h), `valve_stuck` (fs huge; step), `sensor_bias` (offset shift, default 2 %
of span; step), `sensor_drift` (the same offset as a ramp over 1 d), `sensor_noise`
(noise × magnitude, default 5; step), `fouling` (plant gain × magnitude, default
0.7; ramp 2 d; heating templates only).

Degradations (ageing states, held while settling): `fouling` (lost gain fraction
grows at rate · T/t_ref per day, max 0.8), `sensor_drift` (rate % of span per day),
`valve_wear` (friction band grows at rate % per day, max 10), `catalyst_decay`
(reactor and cstr; activity falls at rate per day, faster when hot, max 0.9).
Maintenance tasks (label `maintenance:<task>`) expand into these events, one log
entry each (`reset` returns an ageing state to zero): `clean` (reset fouling),
`replace_catalyst` (reset decay), `calibrate` (set the bias offset to 0, reset
drift if any), `replace_sensor` (calibrate, and set the noise std to nominal; the
lag is not reset), `replace_valve` (set fs and fd to the unit's own, reset the
stiction state and wear), `stop` (mode MAN and man_out 0, then mode AUTO after
`duration`), `remove_sensor` (`<tag>.installed` 0: the reading is NaN and the
controller holds), `install_sensor` (`<tag>.installed` 1, then replace_sensor). A
task or fault that does not apply to the unit is an error.

**The Python API.** `simulate(source)` → `Run`; `prepare(source, plant=0)` →
`Prepared` (`scenario`, `warnings`, `compiled`, `config_hash`, `engine()`,
`run()`); `load_scenario`; `draw(config, plant)` → (concrete config, trace);
`family(source, plants=None, histories=None)` → `Family` (`lanes`, `draws()`,
`run(k)`, `rejected`); `catalog()` (every operator, template, preset, fault,
degradation and task as data); `homeostat.labelers`: `visibility`, `settle_times`,
`feasibility`, `lineage`; the core: `Graph`, `Engine` (`schedule`, `initialize`,
`run`, `fork`, `snapshot`, `restore`), `Event`; errors: `HomeostatError.issues`.
A source is a path, YAML text, a dict or a scenario. `Run` has `truth`, `measured`,
`observed` (DataFrames, index a TimedeltaIndex or timestamps, `(lane, signal)`
columns with several lanes), `seconds`, `frame(signals)`, `lane(k)`, `lanes`, and
`meta` with the content of `scenario-truth` in pandas form: `signals` (a DataFrame
indexed by signal name), `events`, `timeline` and `trace` (DataFrames), `loops`
(a list of dicts), `causal_graph` (`{nodes, edges}`), `promoted` (a dict), plus
`units`, `scenario`, `reproducibility` and `warnings`.

**The command line.** `validate`, `explain`, `run`, `diagnose`, `diff` and
`convert` as `cli-contract` states, plus `guide [topic]` (the bundled docs; no
topic prints the index), `describe [name ...] [--kind K] [--json]` (what exists, kinds template, fault,
degradation, task, preset, operator and expectation;
for a template: parameters, ports, the signals a unit creates, the faults,
degradations and tasks that apply, an example), `schema [--template T]` (JSON
Schema with the library's vocabulary), `examples [name] [--json]` (the five
examples below), `eval list|show|score|run` and `skill [--install]` (writes
`.claude/skills/homeostat/SKILL.md`).

**Examples** shipped in the package: `disturbance_rejection` (a twin run, AUTO
against MAN on shared noise), `plant_history` (two months: grades, fouling, sensor
drift, maintenance), `product_quality` (a mixer feeding a reactor), `plant_family`
(48 drawn temperature loops tuned by simc), `self_running_plant` (six months of
generated grades, maintenance and faults).

## Flows

1. **Find out what exists.** `homeostat describe`, `describe <name>`, `examples`,
   `schema`, `guide`. All of it comes from the library's own metadata, so it never
   disagrees with what validates.
2. **Write and validate.** `homeostat validate s.yaml` reports every problem of the
   first stage that has any, with fixes (`scenario-issues`); repeat until `OK`.
   Warnings mark parts that change nothing.
3. **Say what plant it is.** `homeostat explain s.yaml`, without running: units,
   loops (what each controller reads and writes), inputs and which loops they reach,
   the timeline, the notes. `diff a b` shows the keys that changed and what the
   compiled plants do differently.
4. **Run and read.** `homeostat run s.yaml --out out/` prints statistics of the
   observed signals (all with `--all-signals`), the first events and the warnings,
   and writes the files `cli-contract` names; in Python, `simulate` gives the same
   run. The run starts settled (`run-series`) unless `init` says otherwise; ground
   truth follows `scenario-truth`.
5. **Check what the run shows.** `expect` entries, each with `id`, `note`, `lane`:
   `stat` (`signal`, `stat` required: mean, std, min, max or count of non-NaN
   samples, over `window`, within `at_least`/`at_most`); `shift` (`signal`, mean of
   window `after` minus mean of `before`; `absolute`); `saturation` (`loop`,
   `at_most` required: the fraction of samples at an output limit, over `window`);
   `settles` (`within`; optional `transition` written `grade_A->grade_B`, `loop`,
   `band` default 1 % of the new setpoint, `hold` 600 s; judged on cv from the
   transition's start); `visible` (`fault` a fault name such as `sensor_noise`,
   optional `target` unit, `signal` an observed signal, `visible` default true,
   `within`; every matching fault must satisfy it); `feasible`.
   `homeostat diagnose` reports PASS, FAIL or ERROR with evidence; exit 3 on a
   failure.
6. **Changes and faults.** `interventions` set, shift or scale a setpoint, mode,
   manual output, free port, schedule or parameter, as a step or ramp; a fault
   names a unit. Targeted parameters become signals.
7. **A history from a plan.** `regimes` and `plan.production` move between
   operating points; `degradation` wears equipment with operation;
   `plan.maintenance` resets it. Every change is an event; `timeline` lists the
   intervals.
8. **A plan that runs itself.** Production, maintenance and fault generators expand
   into an explicit plan when the plant is drawn, before validation; each drawn
   value comes from a stream keyed by its address (`plan/production/campaign/3`,
   `faults/0/2/kind`) and is recorded in `meta["trace"]`. A generator that cannot
   make a plan is `E_BAD_GENERATOR` at its key.
9. **A family of plants.** Distributions anywhere; `family()` draws `plants` plants
   × `histories`, runs those that share a structure as lanes of one batch, redraws
   a draw that fails validation (`E_DRAW_REJECTED` after 20 in a row). A plant in a
   family gives the same data as the same plant run alone with the same noise key.
   `simulate()` refuses a scenario with a `family` of several plants.
10. **Twin runs.** `lanes`, `noise_keys`, `lanes:` on events; `Engine.fork()`
    continues a copy on the same streams.
11. **Labels.** `visibility(scenario)` adds one twin lane per fault on the same noise
    and reports when and on which recorded signal each fault's effect (twin minus
    fault-free) first stands out from the signal's own variation over a moving
    `window` (1800 s), as a shift of the mean or a change of variance (`z` 3,
    `alpha` 0.001), and stays out for `persistence` (half the window): an oracle
    bound, and too small means not visible; `settle_times(run)`; `feasibility(run)`; `lineage(scenario,
    sample)` gives, per lab result, when its material was sampled and entered each
    upstream unit, from tracers that are never recorded.
12. **Measure an assistant.** `eval list` and `eval show <task>` give thirteen
    requests to write a scenario (levels 1 to 5); `eval score <task> <file>` and
    `eval run <dir>` (files `<task>.yaml` and optional `<task>.first.yaml`) simulate
    the candidate, ignore its own `expect`, check the task's acceptance checks, and
    report valid, passed/total and success; exit 3 unless every task succeeds.

## Interfaces

- **Domain library**: an object found by entry point, with a name and major
  version, that provides templates (parameters, ports, a build function adding core
  operators to the graph and returning the unit's signals and components), sensor
  presets, fault aliases (unit → events on parameters), degradations (unit → ageing
  operators) and tasks (unit → events), plus the metadata `describe`, `schema` and
  `catalog` print. `library: process@1` pins the major version.
- **Labelers** use only the public core API (prepare, engine, lanes, events).
- **Speed** is optional: the original compiles a plant into one function with
  Numba when installed (`homeostat[fast]`), with the same results.

## Order

When a build cannot do everything at once, build in this order and say in
`NOTES.md` where it stopped:

1. **Core product**: the four components; every operator; the `process` library's
   loop templates (flow, level, temperature), sensor presets, faults and
   interventions; `simulate` and `Run`; `validate`, `explain`, `run`, `diagnose`
   with all expectation kinds but `visible`; `describe`, `examples`, `schema`,
   `guide`.
2. **Histories**: regimes and production, degradations and maintenance, the
   generators, `output.start`, `init` forms, multi-rate (`period`, `scan`), `diff`.
3. **Process units and labels**: mixer, heat exchanger, reactor, cstr; the four
   labelers and the `visible` expectation; families and distributions.
4. **Assistant tooling**: `eval` with its thirteen tasks, `skill`, the Python core
   API (`Graph`, `Engine`, `fork`, `snapshot`), and the optional compiled step.

The tutorials, guides and reference pages of homeostat's own documentation are not
repeated here; a build writes its own for `guide`.
