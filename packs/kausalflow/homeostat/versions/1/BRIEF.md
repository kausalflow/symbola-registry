# homeostat

Homeostat generates time series of the kind a process plant's historian records (flows, levels, temperatures, controller outputs, lab values) together with the full truth behind them, from abstract data-generating processes rather than physics. A user, usually an AI assistant, writes a declarative scenario (YAML or JSON): a plant built from templates or from core operators, noise sources, planned changes and faults at given times, a production and maintenance plan. Homeostat validates the scenario, runs it, and hands back the values at three levels (true, measured, observed) and the ground truth: the signal table, the control loops and the roles of their signals, the causal graph, the log of every event and the timeline of the plan.

`PRODUCT.md` describes the whole package: the scenario language with the `process` library (templates, ISA tags, sensor presets, faults, degradations, maintenance), plans and their generators, plant families, labelers, the Python API and every command. Its core is the part a rebuild must get exactly right for those users to trust it, specified as four components:

- **what a scenario says about the plant** (`scenario-truth`): signals, loops, roles, causal graph, events and timeline, which follow from the scenario alone and never from the random draw;
- **what is wrong with a scenario** (`scenario-issues`): the code, location and suggested fix of every problem, found before anything runs, and the warnings for a valid scenario that has parts with no effect;
- **how a run unfolds** (`run-series`): the order inside a step, exact (dt-independent) discretization, ramps, and reproducible random streams keyed by operator;
- **how the command line reports it** (`cli-contract`): exit codes, where problems are printed, and the shape of `--json` output.

The components check the core vocabulary (the operators in the `scenario-issues` table, `exogenous` sources, `interventions`, `regimes` and `plan.production`). The rest of the language, and the `process` library, are specified in `PRODUCT.md` and not yet checked.

## Non-goals

- Physics. Homeostat does not solve first-principles models; its plants are composed of abstract operators, and a rebuild must not add mechanistic simulation.
- Bit-identical numbers across NumPy versions, platforms or CPUs, or between a rebuild and the original. Only the properties stated (ground truth, exact discretization, stationary statistics, reproducibility of one implementation with itself) are required.
- Speed. The original has an optional compiled step; no rebuild is required to be fast, only correct and reproducible.
- A graphical interface, a server, or live operation: the scenario file in, the run out.

## Priorities

When goals conflict, earlier ones win:

1. A scenario that validates must be something the engine can run, and one that does not must be rejected with the right code, a location at the offending key, and a fix a person or an assistant can act on.
2. Ground truth is exact and complete: every event, role, edge and interval in the scenario is recorded, and none of it depends on the seed.
3. Runs are reproducible, and random streams are keyed by operator and noise key, so changing one part of a scenario never changes the noise of another.
4. Dynamics are discretized exactly: changing `dt` never changes the physical response.
5. The command line is scriptable: stable exit codes and JSON shapes.
6. Readability of messages and of text output.

## Who resolves gaps

kausalflow, as the namespace holder. If the pack doesn't settle something, record the
question and the reading you chose in `NOTES.md` next to your build; obligations marked
`open` in `obligations.toml` are yours to choose.
