import { describe, expect, it } from 'vitest';
import { contrastRatio, headingsOf, outlineProblems, runChecks } from '../src/carrier/checks';
import { carrierById, carriers } from '../src/carrier/inputs';
import { MEDIA } from '../src/carrier/media';
import { recordingFor, recordings } from '../src/carrier/recorded';
import { renderBody } from '../src/carrier/render';
import type { CheckId, SiteSpec } from '../src/carrier/types';

const henley = carrierById('henley-ridge');
const published = (id: string) => structuredClone(recordingFor(id).runs.at(-1)!.output) as SiteSpec;
const failing = (spec: unknown, input = henley): CheckId[] =>
  runChecks(input, spec)
    .results.filter((r) => !r.passed)
    .map((r) => r.id);

describe('recorded runs', () => {
  for (const recording of recordings) {
    const input = carrierById(recording.carrierId);
    for (const run of recording.runs.filter((r) => !r.staged)) {
      it(`${recording.carrierId} run ${run.number} passes every check`, () => {
        const report = runChecks(input, run.output);
        const problems = report.results.flatMap((r) => r.problems.map((p) => `${r.id}: ${p}`));
        expect(problems).toEqual([]);
        expect(report.passed).toBe(true);
      });
    }
  }

  it('the staged first draft fails on the missing meta description and on grounding', () => {
    const run1 = recordingFor('henley-ridge').runs[0]!;
    expect(run1.staged).toBe(true);
    const report = runChecks(henley, run1.output);
    expect(report.passed).toBe(false);
    // the empty description also lacks the local keyword, so that check fails with it
    expect(failing(run1.output)).toEqual(['meta-description', 'local-keyword', 'grounding']);
    const grounding = report.results.find((r) => r.id === 'grounding')!.problems.join('\n');
    expect(grounding).toContain('1998');
    expect(grounding).toContain('award-winning');
    expect(grounding).toContain('family-owned');
    expect(report.results.find((r) => r.id === 'meta-description')!.problems).toEqual(['Services: meta description is missing']);
  });

  it('every carrier has exactly one published run and a full rubric', () => {
    expect(recordings.map((r) => r.carrierId).sort()).toEqual(carriers.map((c) => c.id).sort());
    for (const r of recordings) {
      expect(r.runs.filter((run) => !run.staged)).toHaveLength(r.runs.length - (r.runs[0]?.staged ? 1 : 0));
      expect(r.rubric).toHaveLength(5);
    }
  });

  it('the three sites use different designs', () => {
    const designs = carriers.map((c) => published(c.id).design);
    expect(new Set(designs.map((d) => d.heroVariant)).size).toBe(3);
    expect(new Set(designs.map((d) => d.palette.primary)).size).toBe(3);
    expect(new Set(designs.map((d) => d.fonts.heading.family)).size).toBe(3);
  });

  it('inputs use only fictional contact details', () => {
    for (const c of carriers) {
      expect(c.contact.phone).toMatch(/555-01\d\d$/);
      expect(c.contact.email).toMatch(/@example\.com$/);
      expect(JSON.stringify(c)).not.toMatch(/\b(?:DOT|MC)[ #-]*\d/);
    }
  });
});

describe('media library', () => {
  it('uses only licensed photos with a source', () => {
    for (const m of MEDIA) {
      expect(['Pexels License', 'CC0']).toContain(m.license);
      expect(m.sourceUrl).toMatch(/^https:\/\/(www\.pexels\.com|commons\.wikimedia\.org)\//);
    }
  });

  it('rejects an unknown section display style', () => {
    const spec = published('larkspur') as unknown as { pages: { sections: Record<string, unknown>[] }[] };
    const lanes = spec.pages[2]!.sections.find((s) => s.kind === 'lanes')!;
    lanes.display = 'map';
    expect(failing(spec, carrierById('larkspur'))[0]).toBe('spec-valid');
  });
});

describe('individual checks', () => {
  it('rejects output that is not a valid spec', () => {
    expect(failing({ specVersion: 1 })).toContain('spec-valid');
    const spec = published('henley-ridge') as unknown as Record<string, unknown>;
    delete spec.facts;
    expect(failing(spec)[0]).toBe('spec-valid');
  });

  it('flags titles outside 30 to 60 characters', () => {
    const spec = published('henley-ridge');
    spec.pages[0]!.seo.title = 'Atlanta trucking';
    expect(failing(spec)).toContain('title-length');
  });

  it('flags long meta descriptions', () => {
    const spec = published('henley-ridge');
    spec.pages[2]!.seo.description = `Atlanta ${'freight '.repeat(30)}`;
    expect(failing(spec)).toContain('meta-description');
  });

  it('flags a second H1 and a skipped heading level', () => {
    const headings = headingsOf('<h1>Freight</h1><h3>Lanes</h3><h2>Quote</h2>');
    expect(headings.map((h) => h.level)).toEqual([1, 3, 2]);
    expect(outlineProblems(headings)).toEqual(['"Lanes" jumps from H1 to H3']);
    expect(outlineProblems(headingsOf('<h2>Lanes</h2><h1>Freight</h1>'))).toEqual(['the first heading is not the H1']);

    const spec = published('henley-ridge');
    spec.pages[3]!.seo.h1 = '';
    expect(failing(spec)[0]).toBe('spec-valid');
  });

  it('flags a rendered outline that drifts from the planned one', () => {
    const spec = published('henley-ridge');
    spec.pages[0]!.seo.headings.pop();
    expect(failing(spec)).toContain('heading-order');
  });

  it('flags a page whose title or description misses the local keyword, but leaves headings to the copy', () => {
    const spec = published('henley-ridge');
    expect(spec.pages[1]!.seo.h1.toLowerCase()).not.toContain('atlanta');
    expect(failing(spec)).toEqual([]);
    spec.pages[1]!.seo.title = 'Dry Van Freight Services | Henley Ridge Freight';
    expect(failing(spec)).toEqual(['local-keyword']);
  });

  it('accepts an intentional line break in the H1', () => {
    const spec = published('henley-ridge');
    expect(spec.pages[0]!.seo.h1).toContain('\n');
    expect(renderBody(spec, 'home')).toContain('<span class="l">');
    expect(spec.pages[0]!.seo.headings[0]!.text).not.toContain('\n');
  });

  it('flags JSON-LD that disagrees with the page', () => {
    const spec = published('henley-ridge');
    spec.structuredData.organization.telephone = '(770) 555-0199';
    const faq = spec.structuredData.faqPage.mainEntity as unknown[];
    faq.pop();
    const failed = failing(spec);
    expect(failed).toContain('json-ld');
  });

  it('flags internal links that do not resolve', () => {
    const spec = published('henley-ridge');
    const hero = spec.pages[0]!.sections[0]!;
    if (hero.kind !== 'hero') throw new Error('unreachable');
    hero.secondaryCta = { label: 'See our lanes', href: 'lane/' };
    expect(failing(spec)).toEqual(['internal-links']);
    hero.secondaryCta = { label: 'Jump to the form', href: 'quote/#missing' };
    expect(failing(spec)).toEqual(['internal-links']);
  });

  it('flags a photo with empty alt text and rejects a photo outside the media library', () => {
    const spec = published('henley-ridge');
    const hero = spec.pages[0]!.sections[0]!;
    if (hero.kind !== 'hero' || !hero.image) throw new Error('unreachable');
    expect(renderBody(spec, 'home')).toContain('Illustrative photo:');
    hero.image.alt = '';
    expect(failing(spec)).toEqual(['image-alt']);
    hero.image = { id: 'stock-truck-from-somewhere', alt: 'A truck' };
    expect(failing(spec)[0]).toBe('spec-valid');
  });

  it('draws lane distances to scale and grounds the miles it prints', () => {
    const spec = published('larkspur');
    const html = renderBody(spec, 'lanes');
    expect(html).toContain('width:100.0%');
    expect(html).toContain('width:41.0%');
    const lanes = spec.pages[2]!.sections.find((s) => s.kind === 'lanes');
    if (lanes?.kind !== 'lanes') throw new Error('unreachable');
    lanes.lanes[0]!.miles = 260;
    expect(failing(spec, carrierById('larkspur'))).toEqual(['grounding']);
  });

  it('flags a sitemap that misses a page', () => {
    const spec = published('larkspur');
    spec.sitemap.pop();
    expect(failing(spec, carrierById('larkspur'))).toEqual(['sitemap']);
  });

  it('flags low-contrast colours', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
    const spec = published('ocotillo');
    spec.design.palette.muted = '#c9bfb3';
    expect(failing(spec, carrierById('ocotillo'))).toEqual(['contrast']);
  });

  it('flags a number that maps to no input fact', () => {
    const spec = published('ocotillo');
    const hero = spec.pages[0]!.sections[0]!;
    if (hero.kind !== 'hero') throw new Error('unreachable');
    hero.highlights.push('Over 900 loads delivered');
    expect(failing(spec, carrierById('ocotillo'))).toEqual(['grounding']);
  });

  it('flags a superlative or credential that the input does not support', () => {
    const spec = published('larkspur');
    spec.pages[1]!.sections.push({ kind: 'prose', heading: 'Safety', paragraphs: ['We are the safest reefer fleet in Texas.'] });
    spec.pages[1]!.seo.headings.push({ level: 2, text: 'Safety' });
    expect(failing(spec, carrierById('larkspur'))).toEqual(['grounding']);
  });

  it('flags a fact whose value is not in the cited input field', () => {
    const spec = published('larkspur');
    spec.facts.find((f) => f.id === 'tractors')!.value = '62';
    expect(failing(spec, carrierById('larkspur'))).toEqual(['grounding']);
    spec.facts.find((f) => f.id === 'tractors')!.source = 'fleet.trucks';
    expect(runChecks(carrierById('larkspur'), spec).results.find((r) => r.id === 'grounding')!.problems[0]).toContain('does not exist');
  });
});
