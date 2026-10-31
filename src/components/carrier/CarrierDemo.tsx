import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CheckGroupId, DemoCarrierView, PhaseId, ReplayScenario, ShotView, StageId, StagedView } from '../../carrier/demo';
import type { CheckId, CheckResult } from '../../carrier/types';
import './carrier-demo.css';

interface Props {
  carriers: DemoCarrierView[];
  phases: { id: PhaseId; label: string; working: string; stages: StageId[] }[];
  groups: { id: CheckGroupId; label: string; checks: CheckId[] }[];
  staged?: StagedView & { carrierId: string };
  disclosure: string;
}

type View = 'prepare' | 'generate' | 'review';
type DialogId = 'help' | 'about' | 'source' | 'checks' | 'draft';

// with reduced motion the replay still steps through every phase, only faster and without movement
const REDUCED_SPEED = 4;

// what each group can and cannot tell you, so a pass is not read as more than it is
const GROUP_SCOPE: Record<CheckGroupId, string> = {
  structure: 'Shape of the spec, one H1 per page, heading levels, links and sitemap entries.',
  seo: 'Title and description lengths, local keyword placement, head tags and JSON-LD. The JSON-LD check parses each block and checks required fields against the page. It is not full schema.org validation.',
  facts:
    'Finds every number and a fixed list of claim words, such as insured, certified or award-winning, and maps each one to an input field. It cannot judge a free-form claim that uses neither.',
  access: 'Alt text on images and contrast for sampled text colour pairs. This is not a full accessibility audit.',
};

const VIEW_LABELS: Record<View, string> = { prepare: 'Prepare', generate: 'Generate', review: 'Review' };

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function startTimes(s: ReplayScenario): number[] {
  let t = 0;
  return s.steps.map((step) => {
    const start = t;
    t += step.ms;
    return start;
  });
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export default function CarrierDemo({ carriers, phases, groups, staged, disclosure }: Props) {
  const [selectedId, setSelectedId] = useState(carriers[0]?.id ?? '');
  const [view, setView] = useState<View>('prepare');
  const [withDraft, setWithDraft] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [elapsed, setElapsed] = useState(0);
  const [dialog, setDialog] = useState<DialogId | null>(null);
  const frame = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const carrier = carriers.find((c) => c.id === selectedId) ?? carriers[0];
  const scenario = carrier ? (withDraft && carrier.replayWithDraft ? carrier.replayWithDraft : carrier.replay) : undefined;
  const starts = useMemo(() => (scenario ? startTimes(scenario) : []), [scenario]);

  const stop = () => cancelAnimationFrame(frame.current);
  useEffect(() => stop, []);

  // each state change moves focus to the new state's heading, so keyboard and screen reader users
  // land on the content that changed
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [view]);

  if (!carrier || !scenario) return null;
  const steps = scenario.steps;

  const go = (next: View) => {
    moved.current = true;
    setView(next);
  };

  const select = (id: string) => {
    stop();
    setSelectedId(id);
    setWithDraft(false);
    setStepIndex(-1);
    setElapsed(0);
    setView('prepare');
  };

  const finish = () => {
    stop();
    setStepIndex(steps.length);
    setElapsed(scenario.totalMs);
    go('review');
  };

  const generate = () => {
    stop();
    const speed = prefersReducedMotion() ? REDUCED_SPEED : 1;
    const begin = performance.now();
    let shown = -1;
    setStepIndex(0);
    setElapsed(0);
    go('generate');
    const tick = (now: number) => {
      const t = (now - begin) * speed;
      let index = 0;
      while (index + 1 < starts.length && (starts[index + 1] ?? Infinity) <= t) index++;
      if (index !== shown) {
        shown = index;
        setStepIndex(index);
      }
      setElapsed(Math.min(t, scenario.totalMs));
      if (t < scenario.totalMs) frame.current = requestAnimationFrame(tick);
      else finish();
    };
    frame.current = requestAnimationFrame(tick);
  };

  const backToDetails = () => {
    stop();
    setStepIndex(-1);
    go('prepare');
  };

  const current = steps[Math.min(Math.max(stepIndex, 0), steps.length - 1)];
  const phaseOf = (stage: StageId | undefined) => phases.find((p) => stage && p.stages.includes(stage));
  const currentPhase = phaseOf(current?.stage);
  const runSteps = steps.map((s, i) => ({ s, i })).filter(({ s }) => s.run === current?.run);
  const phaseState = (id: PhaseId): 'pending' | 'active' | 'done' | 'failed' => {
    if (view === 'review') return 'done';
    if (view === 'prepare') return 'pending';
    const mine = runSteps.filter(({ s }) => phaseOf(s.stage)?.id === id);
    if (mine.length === 0) return 'pending';
    const firstIndex = mine[0]?.i ?? Infinity;
    const lastIndex = mine[mine.length - 1]?.i ?? -1;
    if (firstIndex > stepIndex) return 'pending';
    if (stepIndex <= lastIndex) return 'active';
    return mine.some(({ s }) => s.status === 'fail') ? 'failed' : 'done';
  };
  const blockedDraft = steps.find((s, i) => i < stepIndex && s.run === 'Draft' && s.stage === 'publish' && s.status === 'fail');

  const lines = steps
    .slice(0, view === 'review' ? steps.length : Math.max(0, stepIndex + 1))
    .flatMap((s, i) => s.log.map((l, j) => ({ ...l, at: (starts[i] ?? 0) + Math.round(((j + 1) * s.ms) / (s.log.length + 1)), key: `${i}-${j}` })));

  const runs = carrier.runs;
  const publishedRun = runs[runs.length - 1];
  const results = publishedRun?.results ?? [];
  const passed = results.filter((r) => r.passed).length;
  const draftRun = runs.find((r) => r.staged);
  const showDraftDialog = staged && staged.carrierId === carrier.id;

  return (
    <div class="ws">
      <div class="ws__bar">
        <div class="ws__brand">
          <span class="ws__logo" aria-hidden="true" />
          <span>Site builder</span>
          <span class="ws__crumb" aria-hidden="true">
            /
          </span>
          <span class="ws__crumb-name">{carrier.name}</span>
        </div>
        <div class="ws__bar-actions">
          <span class="ws__badge">Recorded demo</span>
          <button class="ws__icon-btn" type="button" onClick={() => setDialog('help')} aria-label="How the generator works" title="How the generator works">
            ?
          </button>
        </div>
      </div>

      <div class="ws__notice">
        <p>{disclosure}</p>
        <button class="ws__link-btn" type="button" onClick={() => setDialog('about')}>
          About this demo
        </button>
      </div>

      <div class="ws__body">
        <aside class="ws__side" aria-label="Carriers">
          <fieldset class="ws__carriers">
            <legend class="ws__side-title">Carriers</legend>
            {carriers.map((c) => (
              <label class={`ws__carrier${c.id === selectedId ? ' is-selected' : ''}`} key={c.id}>
                <input type="radio" name="carrier" value={c.id} checked={c.id === selectedId} onChange={() => select(c.id)} />
                <span class="ws__avatar" aria-hidden="true">
                  {c.name
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')}
                </span>
                <span class="ws__carrier-text">
                  <span class="ws__carrier-name">{c.name}</span>
                  <span class="ws__carrier-sub">{c.summary}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p class="ws__side-note">Three fictional carriers. Each has one recorded result.</p>
        </aside>

        <div class="ws__main">
          <ol class="ws__steps" aria-label="Progress">
            {(Object.keys(VIEW_LABELS) as View[]).map((v, i) => {
              const order: View[] = ['prepare', 'generate', 'review'];
              const state = v === view ? 'current' : order.indexOf(v) < order.indexOf(view) ? 'done' : 'todo';
              return (
                <li class={`ws__step is-${state}`} key={v} aria-current={state === 'current' ? 'step' : undefined}>
                  <span class="ws__step-num" aria-hidden="true">
                    {state === 'done' ? '✓' : i + 1}
                  </span>
                  {VIEW_LABELS[v]}
                </li>
              );
            })}
          </ol>

          {view === 'prepare' && (
            <section class="ws__panel ws__panel--prepare" aria-labelledby="ws-heading">
              <div class="ws__panel-head">
                <div>
                  <p class="ws__kicker">Business details</p>
                  <h2 id="ws-heading" ref={headingRef} tabIndex={-1}>
                    {carrier.name}
                  </h2>
                </div>
                <div class="ws__head-actions">
                  <button class="wbtn wbtn--quiet" type="button" onClick={() => setDialog('source')}>
                    View raw input
                  </button>
                  <button class="wbtn wbtn--primary ws__quick" type="button" onClick={generate}>
                    Generate website
                  </button>
                </div>
              </div>
              <p class="ws__inline-note" role="note">
                <span class="ws__lock" aria-hidden="true" />
                These details are fixed for this recorded demo, so the fields are read only. An edit here could not change the recorded result.
              </p>
              <div class="ws__form">
                {groupRows(carrier.sheet).map(([group, rows]) => (
                  <fieldset class="ws__group" key={group}>
                    <legend>{group}</legend>
                    {rows.map((row) => (
                      <div class={`ws__field${Array.isArray(row.value) || row.value.length > 60 ? ' ws__field--wide' : ''}`} key={row.label}>
                        <span class="ws__field-label">{row.label}</span>
                        <div class="ws__field-value">
                          {Array.isArray(row.value) ? (
                            <ul>
                              {row.value.map((v) => (
                                <li key={v}>{v}</li>
                              ))}
                            </ul>
                          ) : (
                            row.value
                          )}
                        </div>
                      </div>
                    ))}
                  </fieldset>
                ))}
              </div>
              <div class="ws__runbar">
                <div class="ws__usage">
                  <p class="ws__usage-title">This run uses</p>
                  <p>
                    {carrier.usage.fields} input fields · {carrier.usage.lanes} lanes · {carrier.usage.specialties} specialties · {carrier.usage.credentials}{' '}
                    credentials
                  </p>
                  <p class="ws__muted">Output: {carrier.usage.pages} pages, JSON-LD and a sitemap, checked by 13 automated checks.</p>
                  {carrier.replayWithDraft && (
                    <label class="ws__check">
                      <input type="checkbox" checked={withDraft} onChange={(e) => setWithDraft((e.target as HTMLInputElement).checked)} />
                      <span>
                        Replay the staged draft first
                        <span class="ws__muted"> Developer example: a draft with planted mistakes that the checks block. Adds about 4 seconds.</span>
                      </span>
                    </label>
                  )}
                </div>
                <button class="wbtn wbtn--primary wbtn--lg" type="button" onClick={generate}>
                  Generate website
                </button>
              </div>
            </section>
          )}

          {view === 'generate' && (
            <section class="ws__panel ws__panel--generate" aria-labelledby="ws-heading">
              <div class="ws__panel-head">
                <div>
                  <p class="ws__kicker">{current?.run ? `${current.run} · generating` : 'Generating'}</p>
                  <h2 id="ws-heading" ref={headingRef} tabIndex={-1}>
                    {carrier.name}
                  </h2>
                </div>
                <div class="ws__head-actions">
                  <button class="wbtn wbtn--quiet" type="button" onClick={backToDetails}>
                    Cancel
                  </button>
                  <button class="wbtn wbtn--secondary" type="button" onClick={finish}>
                    Skip to result
                  </button>
                </div>
              </div>

              <ol class="ws__phases">
                {phases.map((p) => {
                  const state = phaseState(p.id);
                  return (
                    <li class={`ws__phase is-${state}`} key={p.id}>
                      <span class="ws__phase-mark" aria-hidden="true" />
                      <span class="ws__phase-label">{p.label}</span>
                      <span class="gen-sr">{state === 'pending' ? ', waiting' : state === 'active' ? ', in progress' : state === 'failed' ? ', failed' : ', done'}</span>
                    </li>
                  );
                })}
              </ol>
              <div class="ws__progress" aria-hidden="true">
                <span style={{ transform: `scaleX(${scenario.totalMs ? elapsed / scenario.totalMs : 0})` }} />
              </div>
              <div class="ws__status-row">
                <p class="ws__status" role="status">
                  {currentPhase ? `${currentPhase.label}: ${currentPhase.working}.` : 'Starting.'}
                </p>
                <p class="ws__time">
                  {seconds(elapsed)} of {seconds(scenario.totalMs)}, simulated
                </p>
              </div>
              {blockedDraft && (
                <p class="ws__alert" role="alert">
                  The staged draft failed {draftRun ? draftRun.results.filter((r) => !r.passed).length : ''} checks and was blocked. The failures go back for a
                  rewrite.
                </p>
              )}

              <div class="ws__canvas" aria-hidden="true">
                <div class={`ws__wire ws__wire--${currentPhase?.id ?? 'planning'}`}>
                  <span class="w-nav" />
                  <span class="w-h1" />
                  <span class="w-h1 w-h1--2" />
                  <span class="w-line" />
                  <span class="w-line w-line--2" />
                  <span class="w-img" />
                  <span class="w-cols">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span class="w-check">13 checks</span>
                </div>
              </div>

              <details class="ws__activity">
                <summary>Show activity</summary>
                <ol class="ws__log">
                  {lines.map((l) => (
                    <li class={`ws__line is-${l.tone}`} key={l.key}>
                      <span class="ws__log-time">{seconds(l.at)}</span>
                      <span>{l.text}</span>
                    </li>
                  ))}
                </ol>
              </details>
            </section>
          )}

          {view === 'review' && (
            <section class="ws__panel ws__panel--review" aria-labelledby="ws-heading">
              <div class="ws__panel-head">
                <div>
                  <p class="ws__kicker ws__kicker--ok">Website ready</p>
                  <h2 id="ws-heading" ref={headingRef} tabIndex={-1}>
                    {carrier.name}
                  </h2>
                </div>
                <div class="ws__head-actions">
                  <button class="wbtn wbtn--quiet" type="button" onClick={backToDetails}>
                    Back to business details
                  </button>
                  <a class="wbtn wbtn--primary wbtn--lg" href={carrier.siteHref}>
                    Open website <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>

              <div class="ws__validation">
                <p class={`ws__chip ${passed === results.length ? 'is-ok' : 'is-fail'}`}>
                  <span aria-hidden="true">{passed === results.length ? '✓' : '!'}</span> {passed} of {results.length} checks passed
                </p>
                <button class="ws__link-btn" type="button" onClick={() => setDialog('checks')}>
                  View check details
                </button>
              </div>

              {withDraft && draftRun && (
                <p class="ws__inline-note ws__inline-note--warn">
                  The staged draft failed {draftRun.results.filter((r) => !r.passed).length} checks and was not published. The rewrite passed all{' '}
                  {results.length}.{' '}
                  {showDraftDialog && (
                    <button class="ws__link-btn" type="button" onClick={() => setDialog('draft')}>
                      Compare draft and rewrite
                    </button>
                  )}
                </p>
              )}

              <div class="ws__result">
                <a class="ws__browser" href={carrier.siteHref} aria-label={`Open the ${carrier.name} website`}>
                  <span class="ws__chrome" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span class="ws__url">{carrier.siteHref}</span>
                  </span>
                  <Shot shot={carrier.shots.desktop} alt={`Screenshot of the generated ${carrier.name} home page`} sizes="(min-width: 70rem) 52rem, 92vw" />
                </a>
                <div class="ws__phone">
                  <Shot shot={carrier.shots.mobile} alt="The same home page at phone width" sizes="10rem" />
                </div>
              </div>
              <p class="ws__muted ws__shot-note">Screenshots of the built pages.</p>

              <nav class="ws__pages" aria-label={`${carrier.name} pages`}>
                <span class="ws__pages-label">Pages</span>
                {carrier.pages.map((pg) => (
                  <a href={pg.href} key={pg.href}>
                    {pg.label}
                  </a>
                ))}
                <a href={`${carrier.siteHref}sitemap.xml`}>sitemap.xml</a>
              </nav>

              <details class="ws__summary">
                <summary>Check summary</summary>
                <ul class="ws__groups">
                  {groups.map((g) => {
                    const rs = pick(results, g.checks);
                    return (
                      <li key={g.id}>
                        <span class="ws__group-name">{g.label}</span>
                        <span class="ws__group-count">
                          {rs.filter((r) => r.passed).length} of {rs.length} passed
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <button class="ws__link-btn" type="button" onClick={() => setDialog('checks')}>
                  Open all check details
                </button>
              </details>

              <details class="ws__activity">
                <summary>Show activity</summary>
                <ol class="ws__log">
                  {lines.map((l) => (
                    <li class={`ws__line is-${l.tone}`} key={l.key}>
                      <span class="ws__log-time">{seconds(l.at)}</span>
                      <span>{l.text}</span>
                    </li>
                  ))}
                </ol>
              </details>
            </section>
          )}
        </div>
      </div>

      <Dialog open={dialog === 'help'} onClose={() => setDialog(null)} title="How the generator works">
        <ol class="dlg__steps">
          <li>
            <strong>Planning.</strong> The model reads the business details and plans the pages.
          </li>
          <li>
            <strong>Content.</strong> It writes one JSON spec: design tokens, page copy, SEO fields, JSON-LD, the sitemap and a list of facts. Each fact
            names the input field it came from. Code checks that the spec has the expected shape.
          </li>
          <li>
            <strong>Rendering.</strong> Code turns the spec into HTML with one of three fixed layouts and a photo from a licensed library.
          </li>
          <li>
            <strong>Validation.</strong> 13 checks read the rendered pages. If one fails, the failures go back for a rewrite and nothing is published.
          </li>
        </ol>
        <h3>What the checks do not cover</h3>
        <ul>
          <li>The grounding check finds numbers and a fixed list of claim words. A vague claim with neither gets past it.</li>
          <li>The JSON-LD check is not full schema.org validation. The contrast check samples colour pairs and is not a full accessibility audit.</li>
          <li>Copy quality has no automated score. A person reads the site before it goes live.</li>
        </ul>
        <h3>In a production version</h3>
        <p>
          A server-side job calls the model with a strict output schema, so the API key never reaches the browser. Each live run records its token use, cost
          and latency. This demo shows none of these, because no live run happened.
        </p>
        {staged && (
          <p>
            <button class="ws__link-btn" type="button" onClick={() => setDialog('draft')}>
              Developer example: the staged draft
            </button>
          </p>
        )}
      </Dialog>

      <Dialog open={dialog === 'about'} onClose={() => setDialog(null)} title="About this demo">
        <p>
          The public demo replays recorded runs. This keeps every visit the same and avoids live API costs. A production version calls the model from a
          server, where the API key stays private.
        </p>
        <p>
          The site specs, planning notes and review notes were drafted with Claude during development and then edited by hand. No pipeline run produced
          them, so this page shows no token counts, latency or cost.
        </p>
        <p>
          The code parts are real. The validator, the renderer, the 13 checks and the sitemaps run on the recorded specs when the site is built. The
          websites you open are that rendered output.
        </p>
        <p>Photos on the carrier sites are licensed stock from Pexels and Wikimedia Commons. Each page credits its photo. The photos do not show these carriers.</p>
      </Dialog>

      <Dialog open={dialog === 'source'} onClose={() => setDialog(null)} title={`Raw input: ${carrier.name}`} wide>
        <p>The pipeline receives exactly this JSON. Every fact on the generated site must map to a field here.</p>
        <pre class="dlg__code" tabIndex={0}>
          {carrier.inputJson}
        </pre>
      </Dialog>

      <Dialog open={dialog === 'checks'} onClose={() => setDialog(null)} title={`Checks: ${carrier.name}`} wide>
        <p>
          {passed} of {results.length} automated checks passed on the published site.
        </p>
        {groups.map((g) => {
          const rs = pick(results, g.checks);
          return (
            <section class="dlg__group" key={g.id} aria-labelledby={`dlg-g-${g.id}`}>
              <h3 id={`dlg-g-${g.id}`}>
                {g.label}{' '}
                <span class="ws__group-count">
                  {rs.filter((r) => r.passed).length} of {rs.length} passed
                </span>
              </h3>
              <p class="ws__muted">{GROUP_SCOPE[g.id]}</p>
              <ul class="dlg__checks">
                {rs.map((r) => (
                  <li class={r.passed ? 'is-pass' : 'is-fail'} key={r.id}>
                    <span class="dlg__mark" aria-hidden="true">
                      {r.passed ? '✓' : '✕'}
                    </span>
                    <span>
                      <span class="gen-sr">{r.passed ? 'Passed: ' : 'Failed: '}</span>
                      <span class="dlg__check-label">{r.label}</span>
                      <span class="dlg__check-sum">{r.summary}.</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <details class="dlg__more">
          <summary>Illustrative assessment (not measured)</summary>
          <p class="ws__muted">
            A sample review rubric, written during development to show how copy quality could be reviewed. No model scored these, and they are not part of
            the publish gate.
          </p>
          <ul class="dlg__rubric">
            {carrier.rubric.map((r) => (
              <li key={r.criterion}>
                <strong>{r.criterion}</strong> <span class="ws__muted">{r.score} of 5.</span> {r.reason}
              </li>
            ))}
          </ul>
        </details>
      </Dialog>

      {staged && (
        <Dialog open={dialog === 'draft'} onClose={() => setDialog(null)} title="Developer example: the staged draft" wide>
          <p>
            This is not the current run. A first draft for {staged.carrierName} was written with mistakes on purpose, to show the publish gate. It passed{' '}
            {staged.draftPassed} of {staged.total} checks and was not published. The rewrite passed all {staged.total}.
          </p>
          <ol class="dlg__fixes">
            {staged.corrections.map((c) => (
              <li key={`${c.page}-${c.before}`}>
                <p class="dlg__fix-label">Draft · {c.page}</p>
                <p class="dlg__before">{c.before === '' ? 'Meta description left empty' : `“${c.before}”`}</p>
                <p class="dlg__fix-label">Caught by</p>
                <p class="dlg__check-label">{c.check}</p>
                <p class="dlg__fix-label">Rewrite</p>
                <p class="dlg__after">“{c.after}”</p>
              </li>
            ))}
          </ol>
        </Dialog>
      )}
    </div>
  );
}

function groupRows(rows: DemoCarrierView['sheet']): [string, DemoCarrierView['sheet']][] {
  const map = new Map<string, DemoCarrierView['sheet']>();
  for (const r of rows) map.set(r.group, [...(map.get(r.group) ?? []), r]);
  return [...map.entries()];
}

function pick(results: CheckResult[], ids: CheckId[]): CheckResult[] {
  return ids.map((id) => results.find((r) => r.id === id)).filter((r): r is CheckResult => !!r);
}

// native modal dialog: the browser makes the page behind it inert and closes it on escape. focus goes back to the
// control that opened it.
function Dialog({ open, onClose, title, wide, children }: { open: boolean; onClose: () => void; title: string; wide?: boolean; children: ComponentChildren }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement as HTMLElement | null;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);
  const id = useMemo(() => `dlg-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <dialog
      ref={ref}
      class={`dlg${wide ? ' dlg--wide' : ''}`}
      aria-labelledby={id}
      onClose={() => {
        onClose();
        opener.current?.focus();
      }}
      onKeyDown={(e) => {
        // keep tab inside the dialog; the browser would otherwise move focus out to its own toolbar
        if (e.key !== 'Tab' || !ref.current) return;
        const items = [...ref.current.querySelectorAll<HTMLElement>('button, [href], summary, [tabindex="0"]')].filter((el) => el.offsetParent !== null);
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
      onClick={(e) => {
        // a click on the backdrop lands on the dialog element itself
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div class="dlg__inner">
        <div class="dlg__head">
          <h2 id={id}>{title}</h2>
          <button class="ws__icon-btn" type="button" onClick={() => ref.current?.close()} aria-label="Close">
            ✕
          </button>
        </div>
        <div class="dlg__body">{children}</div>
      </div>
    </dialog>
  );
}

function Shot({ shot, alt, sizes }: { shot: ShotView; alt: string; sizes: string }) {
  return (
    <picture>
      <source type="image/avif" srcset={shot.avif} sizes={sizes} />
      <source type="image/webp" srcset={shot.webp} sizes={sizes} />
      <img src={shot.src} srcset={shot.jpg} sizes={sizes} alt={alt} width={shot.width} height={shot.height} decoding="async" />
    </picture>
  );
}
