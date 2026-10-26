import { SRC, SpecError, clock, serve, b64, unb64 } from './common.mts';
await import(`${SRC}/test/setup.ts`);
const Y: any = await import(`${SRC}/node_modules/yjs/dist/yjs.mjs`);

const model = await import(`${SRC}/src/lib/model.ts`);
const { meetingOps, LimitError } = await import(`${SRC}/src/lib/ops.ts`);
const files = await import(`${SRC}/src/lib/files.ts`);

const KINDS: [string, string][] = [['col', 'columns'], ['card', 'cards'], ['agenda', 'agenda'], ['idea', 'ideas'], ['action', 'actions'], ['decision', 'decisions']];
const ROOM = (i: any) => i.room_id ?? 'room1';

class Run {
  doc: any;
  ids: Record<string, Set<string>> = {};
  counts: Record<string, number> = {};
  ref = new Map<string, string>(); // ref -> real id
  shown = new Map<string, string>(); // real id -> ref, for ids created by steps
  constructor(public room: string) {}
  maps() {
    return model.maps(this.doc);
  }
  scan(assign: boolean, ref?: string, positional = false) {
    const m = this.maps();
    for (const [kind, key] of KINDS) {
      const map = m[key];
      const seen = (this.ids[kind] ??= new Set());
      const fresh = [...map.values()].filter((x: any) => !seen.has(x.id));
      if (positional) fresh.sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
      else fresh.sort((a: any, b: any) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));
      for (const x of fresh as any[]) {
        seen.add(x.id);
        const n = (this.counts[kind] = (this.counts[kind] ?? 0) + 1);
        const name = ref && fresh.length === 1 ? ref : `${kind}:${n}`;
        this.ref.set(name, x.id);
        if (!positional && assign) this.shown.set(x.id, name);
      }
    }
  }
  real(v: any) {
    return typeof v === 'string' ? (this.ref.get(v) ?? v) : v;
  }
  show(v: any): any {
    if (typeof v === 'string') return this.shown.get(v) ?? v;
    if (Array.isArray(v)) return v.map((x) => this.show(x));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [this.shown.get(k) ?? k, this.show(x)]));
    return v;
  }
}

function person(name: string) {
  const l = name.toLowerCase();
  return { id: `id-${l}`, name, voter: `voter-${l}` };
}

function applyStep(run: Run, s: any) {
  if (s.now) clock.t = Date.parse(s.now);
  const p = person(s.by ?? 'Ana');
  localStorage.setItem(`rondel:voter:${run.room}`, JSON.stringify(p.voter));
  const ops: any = meetingOps(run.doc, run.room, { id: p.id, name: p.name });
  const a = Object.fromEntries(Object.entries(s.args ?? {}).map(([k, v]) => [k, ['card', 'into', 'item', 'idea', 'column', 'action', 'decision', 'person'].includes(k) ? run.real(v) : v]));
  if (a.patch && typeof a.patch === 'object' && 'columnId' in a.patch) a.patch = { ...a.patch, columnId: run.real(a.patch.columnId) };
  const item = (k: string) => {
    if (a[k] === undefined) throw new SpecError(`missing ${k}`);
    return a[k];
  };
  switch (s.op) {
    case 'rename': return ops.rename(a.title);
    case 'settings': return ops.settings(a.settings);
    case 'phase': return ops.phase(a.phase);
    case 'close': return ops.close();
    case 'reopen': return ops.reopen();
    case 'join': return ops.join();
    case 'remove_person': return ops.removePerson(a.person);
    case 'allow_back': return ops.allowBack(a.person);
    case 'add_facilitator': return ops.addFacilitator(a.person);
    case 'clear_ready': return ops.clearReady();
    case 'timer_start': return ops.timerStart(a.ms, a.label ?? null);
    case 'timer_pause': return ops.timerPause();
    case 'timer_resume': return ops.timerResume();
    case 'timer_add': return ops.timerAdd(a.ms);
    case 'timer_reset': return ops.timerReset();
    case 'add_column': return ops.addColumn({ title: a.title, description: a.description, color: a.color });
    case 'update_column': return ops.updateColumn(item('column'), a.patch);
    case 'move_column': return ops.moveColumn(item('column'), a.to);
    case 'delete_column': return ops.deleteColumn(item('column'));
    case 'share_card': return ops.shareCard({ columnId: item('column'), text: a.text, color: a.color ?? null });
    case 'update_card': return ops.updateCard(item('card'), a.patch);
    case 'delete_card': return ops.deleteCard(item('card'));
    case 'group': return ops.group(item('card'), item('into'));
    case 'ungroup': return ops.ungroup(item('card'));
    case 'group_title': return ops.groupTitle(item('card'), a.title);
    case 'vote': return ops.vote(item('card'), a.delta);
    case 'add_agenda': return ops.addAgenda(a.title, a.minutes ?? 5, a.activity);
    case 'update_agenda': return ops.updateAgenda(item('item'), a.patch);
    case 'move_agenda': return ops.moveAgenda(item('item'), a.to);
    case 'delete_agenda': return ops.deleteAgenda(item('item'));
    case 'set_current': return ops.setCurrent(item('item'), a.start_timer ?? true);
    case 'notes_insert': { const t = ops.notesFor(item('item')); return t.insert(a.at ?? t.length, a.text); }
    case 'add_idea': return ops.addIdea(a.text, a.item ?? null);
    case 'edit_idea': return ops.editIdea(item('idea'), a.text);
    case 'delete_idea': return ops.deleteIdea(item('idea'));
    case 'brainstorm': return ops.brainstorm(a.item ?? null, a.patch);
    case 'vote_idea': return ops.voteIdea(item('idea'), a.delta);
    case 'idea_to_action': return ops.ideaToAction(item('idea'));
    case 'idea_to_agenda': return ops.ideaToAgenda(item('idea'));
    case 'add_decision': return ops.addDecision(a.text, a.item ?? null);
    case 'delete_decision': return ops.deleteDecision(item('decision'));
    case 'add_action': return ops.addAction({ text: a.text, owner: a.owner, due: a.due, cardId: a.card ?? null });
    case 'update_action': return ops.updateAction(item('action'), a.patch);
    case 'delete_action': return ops.deleteAction(item('action'));
    default: throw new SpecError(`unknown op ${s.op}`);
  }
}

function runSteps(run: Run, steps: any[]) {
  const results: string[] = [];
  for (const s of steps) {
    try {
      applyStep(run, s);
      results.push('ok');
    } catch (e: any) {
      if (e instanceof LimitError) results.push('limit');
      else throw e;
    }
    run.scan(true, s.ref);
  }
  return results;
}

function startRun(room: string, init: any, steps: any[] = []) {
  const run = new Run(room);
  run.doc = new Y.Doc();
  let prevView: any = null;
  if (init.previous) {
    const pr = startRun(room, init.previous.init, init.previous.steps ?? []);
    // Ids the previous meeting's steps created are its names, so ids derived from them are reproducible.
    prevView = pr.show(JSON.parse(JSON.stringify(model.readView(pr.doc))));
  }
  model.initMeeting(run.doc, { ...initArgs(init), previous: prevView });
  run.scan(false, undefined, true);
  runSteps(run, steps);
  return run;
}

function initArgs(i: any) {
  return { title: i.title ?? '', template: i.template, creatorId: i.creator, seriesName: i.series_name ?? null, defaults: i.defaults ?? null, facilitators: i.facilitators, series: i.series ?? null, seed: i.seed };
}

export function report(run: Run, input: any, results: string[]) {
  const view = model.readView(run.doc);
  const notes = Object.fromEntries([...run.maps().notes.entries()].map(([id, t]: any) => [id, t.toString()]));
  const want: string[] | null = input.show ?? null;
  const pick = (v: any) => {
    if (!want || !v) return v;
    const o: any = {};
    for (const k of Object.keys(v)) {
      if (k === 'meta') {
        const m = Object.fromEntries(Object.entries(v.meta).filter(([mk]) => want.includes(`meta.${mk}`) || want.includes('meta')));
        if (Object.keys(m).length) o.meta = m;
      } else if (want.includes(k)) o[k] = v[k];
    }
    return o;
  };
  const out: any = { results, view: view ? pick(run.show(JSON.parse(JSON.stringify(view)))) : null, notes: !want || want.includes('notes') ? run.show(notes) : {} };
  if (input.export) out.update = b64(Y.encodeStateAsUpdate(run.doc));
  return out;
}

await serve((input) => {
  clock.t = Date.parse(input.now);
  let run: Run;
  if (input.init) {
    localStorage.clear();
    run = startRun(ROOM(input), input.init);
  } else {
    run = new Run(ROOM(input));
    localStorage.clear();
    if (input.file !== undefined && input.file !== null) {
      const text = typeof input.file === 'string' ? input.file : JSON.stringify(input.file);
      run.doc = files.docFromFile(files.parseMeetingFile(text));
    } else {
      run.doc = new Y.Doc();
      Y.applyUpdate(run.doc, unb64(input.update));
      if (!model.readMeta(run.doc)) throw new SpecError('empty or damaged');
    }
    run.scan(false, undefined, true);
  }
  const results = runSteps(run, input.steps ?? []);
  return report(run, input, results);
});
