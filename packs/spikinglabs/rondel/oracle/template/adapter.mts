import { SRC, SpecError, serve } from './common.mts';

await import(`${SRC}/test/setup.ts`);
const tpl = await import(`${SRC}/src/lib/templates.ts`);
const yaml: any = await import(`${SRC}/node_modules/yaml/dist/index.js`);
const need = (i: any, ...keys: string[]) => {
  for (const k of keys) if (i[k] === undefined || i[k] === null) throw new SpecError(`missing ${k}`);
};

// The warnings are texts for people; the contract names them by code.
const CODES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Add at least one stage/, () => 'no-stages'],
  [/no columns/, () => 'no-columns'],
  [/^Voting comes before writing/, () => 'vote-before-write'],
  [/^Grouping comes before writing/, () => 'group-before-write'],
  [/^Discussing comes before voting/, () => 'discuss-before-vote'],
  [/without a break/, () => 'no-break'],
  [/^“(.*)” has no time/s, (m) => `no-time:${m[1]}`],
];

await serve(async (i: any) => {
  switch (i.op) {
    case 'parse': {
      need(i, 'yaml');
      const syntax = yaml.parseDocument(i.yaml, { uniqueKeys: true }).errors.length > 0;
      const { template, errors } = tpl.parseTemplate(i.yaml, i.id_prefix ?? '');
      return { result: { template, errors: syntax ? [{ line: null }] : errors.map((e: any) => ({ line: e.line ?? null })).sort((a: any, b: any) => (a.line ?? 0) - (b.line ?? 0)) } };
    }
    case 'to_yaml': {
      need(i, 'template');
      const text = tpl.templateToYaml(i.template);
      const data = yaml.parse(text);
      return { result: { data, order: Object.keys(data) } };
    }
    case 'roundtrip': {
      need(i, 'template');
      const { template, errors } = tpl.parseTemplate(tpl.templateToYaml(i.template));
      return { result: { template, errors: errors.map((e: any) => ({ line: e.line ?? null })) } };
    }
    case 'new_version': {
      need(i, 'yaml');
      return { result: tpl.newVersionYaml(i.yaml, i.taken ?? []) };
    }
    case 'design_checks': {
      need(i, 'template');
      return {
        result: tpl.designChecks(i.template).map((msg: string) => {
          for (const [re, code] of CODES) {
            const m = msg.match(re);
            if (m) return code(m);
          }
          throw new SpecError(`unknown warning ${msg}`);
        }),
      };
    }
    case 'from_meeting': {
      need(i, 'view');
      return { result: tpl.templateFromMeeting(i.view) };
    }
    case 'builtin':
      return {
        result: tpl.BUILTIN_TEMPLATES.map(({ template: t }: any) => ({
          id: t.id, name: t.name, type: t.type, title: t.title ?? null,
          columns: t.columns.map((c: any) => c.title),
          agenda: t.agenda.map((a: any) => [a.title, a.durationMin, a.activity ?? 'topic']),
          settings: t.settings ?? null,
        })),
      };
    default:
      throw new SpecError(`unknown op ${i.op}`);
  }
});
