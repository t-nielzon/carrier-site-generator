import { CHECK_LABELS, runChecks, textBlocks } from './checks';
import { carrierById } from './inputs';
import { recordingFor, type RubricScore } from './recorded';
import { renderBody, siteBase } from './render';
import type { CarrierInput, CheckId, CheckResult, PageId, SiteSpec } from './types';
import { validateSpec } from './validate';

// builds everything the demo page replays, at build time, from the recorded runs.
// the browser gets plain data; it never sees a model or an api key.

export type StageId = 'read' | 'plan' | 'write' | 'schema' | 'render' | 'checks' | 'grounding' | 'publish';
export type PhaseId = 'planning' | 'content' | 'rendering' | 'validation';

// the four phases the owner sees, each made of the pipeline stages that run inside it
export const PHASES: { id: PhaseId; label: string; working: string; stages: StageId[] }[] = [
  { id: 'planning', label: 'Planning', working: 'Reading the business details and planning pages', stages: ['read', 'plan'] },
  { id: 'content', label: 'Content', working: 'Writing page copy and checking the spec shape', stages: ['write', 'schema'] },
  { id: 'rendering', label: 'Rendering', working: 'Rendering pages, JSON-LD and the sitemap', stages: ['render'] },
  { id: 'validation', label: 'Validation', working: 'Running page checks and the grounding check', stages: ['checks', 'grounding', 'publish'] },
];

// simulated stage durations in milliseconds. they set the pace of the replay only; one run takes
// about 7 seconds, so the result arrives without a long wait.
export const SIMULATED_MS: Record<StageId, number> = {
  read: 450,
  plan: 1300,
  write: 1900,
  schema: 400,
  render: 900,
  checks: 900,
  grounding: 800,
  publish: 400,
};

// the staged draft is a developer example, so it replays at a faster pace
const DRAFT_PACE = 0.5;

export type CheckGroupId = 'structure' | 'seo' | 'facts' | 'access';

// how the evidence panel groups the checks. every check sits in exactly one group.
export const CHECK_GROUPS: { id: CheckGroupId; label: string; checks: CheckId[] }[] = [
  { id: 'structure', label: 'Structure', checks: ['spec-valid', 'single-h1', 'heading-order', 'internal-links', 'sitemap'] },
  { id: 'seo', label: 'SEO', checks: ['title-length', 'meta-description', 'local-keyword', 'json-ld', 'head-meta'] },
  { id: 'facts', label: 'Factual checks', checks: ['grounding'] },
  { id: 'access', label: 'Accessibility', checks: ['image-alt', 'contrast'] },
];

const SEO_CHECKS = new Set<CheckId>(CHECK_GROUPS.filter((g) => g.id !== 'facts').flatMap((g) => g.checks).filter((id) => id !== 'spec-valid'));

export type LogTone = 'info' | 'note' | 'ok' | 'fail';

export interface LogLine {
  text: string;
  tone: LogTone;
}

export interface ReplayStep {
  stage: StageId;
  /** empty for a single run; 'Draft' or 'Rewrite' when the staged draft is included */
  run: string;
  ms: number;
  status: 'ok' | 'fail';
  log: LogLine[];
}

export interface ReplayScenario {
  steps: ReplayStep[];
  totalMs: number;
}

export interface RunView {
  number: number;
  staged: boolean;
  passed: boolean;
  results: CheckResult[];
}

export interface SheetRow {
  group: string;
  label: string;
  value: string | string[];
}

export interface ShotView {
  avif: string;
  webp: string;
  jpg: string;
  src: string;
  width: number;
  height: number;
}

export interface DemoCarrierView {
  id: string;
  name: string;
  summary: string;
  siteHref: string;
  pages: { label: string; href: string }[];
  brief: { label: string; value: string }[];
  sheet: SheetRow[];
  /** the raw input exactly as the pipeline receives it */
  inputJson: string;
  usage: { fields: number; lanes: number; specialties: number; credentials: number; pages: number };
  /** the published run on its own */
  replay: ReplayScenario;
  /** the staged draft, its failed checks, then the published rewrite; only where a draft exists */
  replayWithDraft?: ReplayScenario;
  runs: RunView[];
  rubric: RubricScore[];
  shots: { desktop: ShotView; mobile: ShotView };
}

// screenshots are real renders of the built pages, captured by scripts/screenshots.mjs
export const SHOT_BASE = '/carrier-shots/';
export const SHOT_SIZES = {
  desktop: { widths: [800, 1440], width: 1440, height: 900 },
  mobile: { widths: [390, 780], width: 780, height: 1688 },
} as const;

export function shotView(slug: string, kind: keyof typeof SHOT_SIZES): ShotView {
  const { widths, width, height } = SHOT_SIZES[kind];
  const set = (ext: string) => widths.map((w) => `${SHOT_BASE}${slug}-${kind}-${w}.${ext} ${w}w`).join(', ');
  return { avif: set('avif'), webp: set('webp'), jpg: set('jpg'), src: `${SHOT_BASE}${slug}-${kind}-${widths[widths.length - 1]}.jpg`, width, height };
}

export interface StagedView {
  carrierName: string;
  draftPassed: number;
  total: number;
  failed: { label: string; problems: string[] }[];
  corrections: { page: string; check: string; before: string; after: string }[];
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function brief(c: CarrierInput): { label: string; value: string }[] {
  const miles = c.lanes.map((l) => l.miles);
  return [
    { label: 'Base', value: `${c.base.city}, ${c.base.state} (${c.base.metro} area)` },
    { label: 'Fleet', value: [plural(c.fleet.tractors, 'tractor'), ...c.fleet.trailers.map((t) => `${t.count} × ${t.type}`)].join(' · ') },
    { label: 'Coverage', value: c.serviceArea },
    { label: 'Regular lanes', value: `${c.lanes.length} lanes, ${Math.min(...miles)}–${Math.max(...miles)} mi` },
    { label: 'Freight', value: c.specialties.join(' · ') },
    { label: 'Quote response', value: c.quoteResponse },
  ];
}

function sheet(c: CarrierInput): SheetRow[] {
  return [
    { group: 'Company', label: 'Business name', value: c.name },
    { group: 'Company', label: 'Owner', value: c.owner },
    { group: 'Company', label: 'Founded', value: String(c.foundedYear) },
    { group: 'Company', label: 'Base', value: `${c.base.street}, ${c.base.city}, ${c.base.state} ${c.base.zip} (${c.base.metro} area)` },
    { group: 'Fleet', label: 'Fleet', value: [plural(c.fleet.tractors, 'tractor'), ...c.fleet.trailers.map((t) => `${t.count} × ${t.type}`)] },
    { group: 'Fleet', label: 'Equipment', value: c.equipment },
    { group: 'Coverage', label: 'Service area', value: c.serviceArea },
    { group: 'Coverage', label: 'Lanes', value: c.lanes.map((l) => `${l.from} → ${l.to} · about ${l.miles} mi · ${l.frequency}`) },
    { group: 'Services', label: 'Specialties', value: c.specialties },
    { group: 'Services', label: 'Credentials', value: c.credentials },
    { group: 'Contact', label: 'Hours', value: c.hours },
    { group: 'Contact', label: 'Quote response', value: c.quoteResponse },
    { group: 'Contact', label: 'Contact', value: [c.contact.person, c.contact.phone, c.contact.email] },
    { group: 'Voice', label: 'Owner note', value: c.ownerNote },
  ];
}

function wordCount(spec: SiteSpec, id: PageId): number {
  const html = renderBody(spec, id);
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  return textBlocks(main).join(' ').split(/\s+/).filter(Boolean).length;
}

function checkLines(results: CheckResult[]): LogLine[] {
  return results.flatMap((r): LogLine[] =>
    r.passed
      ? [{ text: `Pass: ${r.label}. ${r.summary}.`, tone: 'ok' as const }]
      : [{ text: `Fail: ${r.label}.`, tone: 'fail' as const }, ...r.problems.map((p) => ({ text: `  ${p}`, tone: 'fail' as const }))],
  );
}

type RecordedRunData = ReturnType<typeof recordingFor>['runs'][number];

function stepsForRun(input: CarrierInput, run: RecordedRunData, label: string, notes: string[], withFeedback: boolean, pace: number): ReplayStep[] {
  const report = runChecks(input, run.output);
  const valid = validateSpec(run.output);
  const steps: ReplayStep[] = [];
  const step = (stage: StageId, status: 'ok' | 'fail', log: LogLine[]) =>
    steps.push({ stage, run: label, ms: Math.round(SIMULATED_MS[stage] * pace), status, log });
  const prefix = label ? `${label}: ` : '';

  if (withFeedback && run.feedback) {
    step('read', 'ok', [
      { text: `${prefix}the failed checks go back to the writing step with the same business details.`, tone: 'info' },
      ...run.feedback.map((f) => ({ text: `Feedback: ${f}`, tone: 'note' as const })),
    ]);
  } else {
    const fields = Object.keys(input).length;
    step('read', 'ok', [
      { text: `${prefix}read ${fields} input fields for ${input.name}.`, tone: 'info' },
      { text: `${plural(input.lanes.length, 'lane')}, ${plural(input.specialties.length, 'specialty')}, ${plural(input.credentials.length, 'credential')}.`, tone: 'info' },
    ]);
  }
  step('plan', 'ok', notes.map((n) => ({ text: `Plan: ${n}`, tone: 'note' as const })));

  if (valid.ok) {
    const spec = valid.spec;
    step('write', 'ok', spec.pages.map((p) => ({ text: `Wrote ${p.navLabel}: ${wordCount(spec, p.id)} words, ${p.sections.length} sections.`, tone: 'info' as const })));
  } else {
    step('write', 'ok', [{ text: 'Loaded the recorded output.', tone: 'info' }]);
  }

  const specCheck = report.results.filter((r) => r.id === 'spec-valid');
  const schemaOk = specCheck.every((r) => r.passed);
  step('schema', schemaOk ? 'ok' : 'fail', checkLines(specCheck));
  if (!schemaOk || !valid.ok) {
    steps[steps.length - 1]?.log.push({ text: `${prefix}blocked. The spec does not have the expected shape. Nothing was rendered.`, tone: 'fail' });
    return steps;
  }

  step('render', 'ok', [
    { text: `Rendered ${valid.spec.pages.length} pages, 2 JSON-LD blocks and sitemap.xml.`, tone: 'info' },
    { text: 'Every page has a noindex robots tag, because the business is fictional.', tone: 'info' },
  ]);
  const seo = report.results.filter((r) => SEO_CHECKS.has(r.id));
  step('checks', seo.every((r) => r.passed) ? 'ok' : 'fail', checkLines(seo));
  const grounding = report.results.filter((r) => r.id === 'grounding');
  step('grounding', grounding.every((r) => r.passed) ? 'ok' : 'fail', checkLines(grounding));

  if (!report.passed) {
    const failed = report.results.filter((r) => !r.passed).length;
    step('publish', 'fail', [{ text: `${prefix}blocked. ${plural(failed, 'check')} failed. Nothing was published.`, tone: 'fail' }]);
  } else {
    step('publish', 'ok', [{ text: `Published to ${siteBase(valid.spec.slug)}`, tone: 'ok' }]);
  }
  return steps;
}

function scenario(steps: ReplayStep[]): ReplayScenario {
  return { steps, totalMs: steps.reduce((sum, s) => sum + s.ms, 0) };
}

export function buildDemoView(carrierId: string, summary: string): DemoCarrierView {
  const input = carrierById(carrierId);
  const recording = recordingFor(carrierId);
  const published = recording.runs[recording.runs.length - 1];
  const first = recording.runs[0];
  if (!published || !first) throw new Error(`${carrierId} has no runs`);
  // the published run replayed on its own uses the base plan, because its rewrite notes only make
  // sense after the draft has failed
  const replay = scenario(stepsForRun(input, published, '', first.notes, false, 1));
  const draft = recording.runs.find((r) => r.staged);
  const replayWithDraft = draft
    ? scenario([...stepsForRun(input, draft, 'Draft', draft.notes, false, DRAFT_PACE), ...stepsForRun(input, published, 'Rewrite', published.notes, true, 1)])
    : undefined;
  const runs: RunView[] = recording.runs.map((run) => {
    const report = runChecks(input, run.output);
    return { number: run.number, staged: run.staged === true, passed: report.passed, results: report.results };
  });
  const last = recording.runs[recording.runs.length - 1];
  const v = validateSpec(last?.output);
  if (!v.ok) throw new Error(`published run for ${carrierId} is invalid`);
  const spec = v.spec;
  return {
    id: carrierId,
    name: input.name,
    summary,
    siteHref: siteBase(spec.slug),
    pages: spec.pages.map((p) => ({ label: p.navLabel, href: `${siteBase(spec.slug)}${p.path}` })),
    brief: brief(input),
    sheet: sheet(input),
    inputJson: JSON.stringify(input, null, 2),
    usage: { fields: Object.keys(input).length, lanes: input.lanes.length, specialties: input.specialties.length, credentials: input.credentials.length, pages: spec.pages.length },
    replay,
    ...(replayWithDraft ? { replayWithDraft } : {}),
    runs,
    rubric: recording.rubric,
    shots: { desktop: shotView(spec.slug, 'desktop'), mobile: shotView(spec.slug, 'mobile') },
  };
}

/** the staged first draft and what changed in the published run, built from the recorded fixtures */
export function buildStagedView(carrierId: string): StagedView {
  const input = carrierById(carrierId);
  const recording = recordingFor(carrierId);
  const draft = recording.runs.find((r) => r.staged);
  if (!draft) throw new Error(`${carrierId} has no staged draft`);
  const report = runChecks(input, draft.output);
  return {
    carrierName: input.name,
    draftPassed: report.results.filter((r) => r.passed).length,
    total: report.results.length,
    failed: report.results.filter((r) => !r.passed).map((r) => ({ label: r.label, problems: r.problems })),
    corrections: (recording.corrections ?? []).map((c) => ({ ...c, check: CHECK_LABELS[c.check] })),
  };
}
