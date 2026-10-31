import { canonicalUrl, GENERATOR_PATH, findPage, flatHeading, pageHead, pageHref, renderBody, siteBase } from './render';
import type { CarrierInput, CheckId, CheckReport, CheckResult, Heading, PageId, SitePage, SiteSpec } from './types';
import { validateSpec } from './validate';

// automated publish gate for a generated carrier site. every check runs on the spec and on the
// html that the renderer produces from it, so a pass here means the shipped page passes too.

export const TITLE_RANGE = [30, 60] as const;
export const DESCRIPTION_RANGE = [70, 160] as const;
export const MIN_CONTRAST = 4.5;

// each label claims only what its check verifies
export const CHECK_LABELS: Record<CheckId, string> = {
  'spec-valid': 'Spec JSON has the expected shape',
  'title-length': 'Page titles are 30–60 characters',
  'meta-description': 'Meta descriptions are 70–160 characters',
  'single-h1': 'Each page has one H1',
  'heading-order': 'Heading levels do not skip and match the plan',
  'local-keyword': 'Local keyword is in each title and meta description',
  'json-ld': 'JSON-LD parses and has the required fields',
  'internal-links': 'Internal links resolve to a page or anchor',
  'image-alt': 'Images have alt text',
  'head-meta': 'Canonical, Open Graph and noindex tags are present',
  sitemap: 'Sitemap lists each page once',
  contrast: 'Sampled text colour pairs meet WCAG AA (4.5:1)',
  grounding: 'Numbers and claim words in the copy map to input facts',
};

// words that state a credential, an award or a ranking. the copy may only use them when an input fact does.
const CLAIM_TERMS = [
  'award-winning',
  'awards?',
  'certified',
  'certifications?',
  'certificate',
  'accredited',
  'licensed',
  'insured',
  'bonded',
  'guaranteed?',
  'best',
  'number one',
  '#1',
  'leading',
  'industry-leading',
  'top-rated',
  'largest',
  'fastest',
  'safest',
  'cheapest',
  'lowest',
  'family-owned',
  'family-run',
  'veteran-owned',
  'woman-owned',
  'minority-owned',
];
const CLAIM_RE = new RegExp(`(?<![\\w-])(${CLAIM_TERMS.map((t) => t.replace('#', '\\#')).join('|')})(?![\\w-])`, 'gi');
const NUMBER_RE = /\d+(?:[.,:]\d+)*/g;

// ---------- html helpers ----------

export function decode(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function stripTags(html: string): string {
  return decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function headingsOf(html: string): Heading[] {
  const out: Heading[] = [];
  for (const m of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)) out.push({ level: Number(m[1]), text: stripTags(m[2] ?? '') });
  return out;
}

function hrefsOf(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => decode(m[1] ?? ''));
}

function idsOf(html: string): Set<string> {
  return new Set([...html.matchAll(/\bid="([^"]*)"/g)].map((m) => m[1] ?? ''));
}

// one entry per block of visible text, so a reported claim quotes the sentence it sits in
export function textBlocks(html: string): string[] {
  return decode(
    html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' ')
      .replace(/<\/(p|li|h[1-6]|a|div|label|option|button)>|<br>/g, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function ariaLabels(html: string): string[] {
  return [...html.matchAll(/\baria-label="([^"]*)"/g)].map((m) => decode(m[1] ?? ''));
}

// ---------- input facts ----------

function normalize(text: string): string {
  return text.toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
}

export function resolvePath(input: CarrierInput, path: string): unknown {
  let cur: unknown = input;
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function fieldText(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map((v) => fieldText(v) ?? '').join('; ');
  if (value && typeof value === 'object') return Object.values(value).map((v) => fieldText(v) ?? '').join('; ');
  return undefined;
}

// ---------- shared ----------

interface RenderedPage {
  page: SitePage;
  html: string;
  headings: Heading[];
}

const result = (id: CheckId, problems: string[], summary: string): CheckResult => ({
  id,
  label: CHECK_LABELS[id],
  passed: problems.length === 0,
  problems,
  summary,
});

const name = (page: SitePage) => page.navLabel;

function snippet(text: string, index: number, length: number): string {
  if (text.length <= 100) return text;
  const start = Math.max(0, index - 45);
  const end = Math.min(text.length, index + length + 45);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

// ---------- checks ----------

function titleLength(pages: RenderedPage[]): CheckResult {
  const [min, max] = TITLE_RANGE;
  const problems = pages
    .filter(({ page }) => page.seo.title.length < min || page.seo.title.length > max)
    .map(({ page }) => `${name(page)}: title is ${page.seo.title.length} characters`);
  return result('title-length', problems, `${pages.length} titles checked`);
}

function metaDescription(pages: RenderedPage[]): CheckResult {
  const [min, max] = DESCRIPTION_RANGE;
  const problems = pages
    .filter(({ page }) => page.seo.description.length < min || page.seo.description.length > max)
    .map(({ page }) =>
      page.seo.description.length === 0
        ? `${name(page)}: meta description is missing`
        : `${name(page)}: meta description is ${page.seo.description.length} characters`,
    );
  return result('meta-description', problems, `${pages.length} descriptions checked`);
}

function singleH1(pages: RenderedPage[]): CheckResult {
  const problems = pages
    .map(({ page, headings }) => ({ page, count: headings.filter((h) => h.level === 1).length }))
    .filter(({ count }) => count !== 1)
    .map(({ page, count }) => `${name(page)}: found ${count} H1 elements`);
  return result('single-h1', problems, `${pages.length} pages checked`);
}

export function outlineProblems(headings: Heading[]): string[] {
  const problems: string[] = [];
  if (headings[0]?.level !== 1) problems.push('the first heading is not the H1');
  headings.forEach((h, i) => {
    const prev = headings[i - 1];
    if (prev && h.level > prev.level + 1) problems.push(`"${h.text}" jumps from H${prev.level} to H${h.level}`);
  });
  return problems;
}

function headingOrder(pages: RenderedPage[]): CheckResult {
  const problems: string[] = [];
  let total = 0;
  for (const { page, headings } of pages) {
    total += headings.length;
    problems.push(...outlineProblems(headings).map((p) => `${name(page)}: ${p}`));
    if (headings[0] && headings[0].text !== flatHeading(page.seo.h1)) problems.push(`${name(page)}: rendered H1 differs from the planned H1`);
    const planned = page.seo.headings.map((h) => `${h.level}:${h.text}`).join('|');
    const rendered = headings.map((h) => `${h.level}:${h.text}`).join('|');
    if (planned !== rendered) problems.push(`${name(page)}: rendered heading outline differs from the planned outline`);
  }
  return result('heading-order', problems, `${total} headings on ${pages.length} pages`);
}

// the keyword has to be in the title and the meta description, which is where search engines read
// it. visible headings are left to the copy, so they can read naturally.
function localKeyword(pages: RenderedPage[]): CheckResult {
  const problems: string[] = [];
  for (const { page } of pages) {
    const keyword = page.seo.localKeywords[0] ?? '';
    const k = keyword.toLowerCase();
    const missing = [
      ['title', page.seo.title],
      ['meta description', page.seo.description],
    ]
      .filter(([, text]) => !(text ?? '').toLowerCase().includes(k))
      .map(([where]) => where);
    if (missing.length) problems.push(`${name(page)}: "${keyword}" is missing from the ${missing.join(' and ')}`);
  }
  return result('local-keyword', problems, `${pages.length} pages checked`);
}

function jsonLd(spec: SiteSpec, pages: RenderedPage[]): CheckResult {
  const problems: string[] = [];
  let blocks = 0;
  const home = findPage(spec, 'home');
  for (const { page, html } of pages) {
    for (const raw of pageHead(spec, page.id).jsonLd) {
      blocks++;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        problems.push(`${name(page)}: JSON-LD does not parse`);
        continue;
      }
      if (data['@context'] !== 'https://schema.org') problems.push(`${name(page)}: @context must be https://schema.org`);
      if (data['@type'] === 'FAQPage') problems.push(...faqProblems(page, html, data));
      else problems.push(...organizationProblems(spec, canonicalUrl(spec, home), data));
    }
  }
  if (pageHead(spec, 'home').jsonLd.length === 0) problems.push('Home: no organization JSON-LD');
  if (pageHead(spec, 'faq').jsonLd.length === 0) problems.push('FAQ: no FAQPage JSON-LD');
  return result('json-ld', problems, `${blocks} JSON-LD blocks parsed`);
}

function organizationProblems(spec: SiteSpec, homeUrl: string, d: Record<string, unknown>): string[] {
  const p: string[] = [];
  const b = spec.business;
  if (!['LocalBusiness', 'Organization'].includes(d['@type'] as string)) p.push('Organization: @type must be LocalBusiness or Organization');
  if (d.name !== b.name) p.push('Organization: name does not match the business name');
  if (d.url !== homeUrl) p.push('Organization: url is not the canonical home page');
  if (d.telephone !== b.phone) p.push('Organization: telephone does not match the business phone');
  const a = d.address as Record<string, unknown> | undefined;
  if (!a || a['@type'] !== 'PostalAddress') p.push('Organization: address must be a PostalAddress');
  else
    for (const k of ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode', 'addressCountry'])
      if (typeof a[k] !== 'string' || a[k] === '') p.push(`Organization: address.${k} is missing`);
  if (!Array.isArray(d.areaServed) || d.areaServed.length === 0) p.push('Organization: areaServed is empty');
  return p;
}

function faqProblems(page: SitePage, html: string, d: Record<string, unknown>): string[] {
  const p: string[] = [];
  const visible = page.sections.flatMap((s) => (s.kind === 'faq' ? s.items : []));
  const entities = Array.isArray(d.mainEntity) ? (d.mainEntity as Record<string, unknown>[]) : [];
  if (entities.length === 0) p.push('FAQPage: mainEntity is empty');
  // structured data has to say what the page says, or search engines treat it as spam
  if (entities.length !== visible.length) p.push(`FAQPage: ${entities.length} questions in JSON-LD, ${visible.length} on the page`);
  entities.forEach((e, i) => {
    const answer = e.acceptedAnswer as Record<string, unknown> | undefined;
    if (e['@type'] !== 'Question' || typeof e.name !== 'string') p.push(`FAQPage: entry ${i + 1} is not a Question with a name`);
    if (!answer || answer['@type'] !== 'Answer' || typeof answer.text !== 'string') p.push(`FAQPage: entry ${i + 1} has no Answer text`);
    const v = visible[i];
    if (v && (e.name !== v.q || answer?.text !== v.a)) p.push(`FAQPage: entry ${i + 1} does not match the visible question`);
  });
  if (!/class="faq[ "]/.test(html)) p.push('FAQPage: the page has no visible FAQ');
  return p;
}

function internalLinks(spec: SiteSpec, pages: RenderedPage[]): CheckResult {
  const routes = new Map<string, Set<string>>();
  for (const { page, html } of pages) routes.set(pageHref(spec, page), idsOf(html));
  const external = new Set([GENERATOR_PATH, `${siteBase(spec.slug)}sitemap.xml`]);
  const problems = new Set<string>();
  let count = 0;
  for (const { page, html } of pages) {
    const here = pageHref(spec, page);
    for (const href of hrefsOf(html)) {
      if (/^(tel:|mailto:|sms:)/.test(href)) continue;
      if (/^https?:/.test(href)) {
        problems.add(`${name(page)}: external link ${href} is not allowed`);
        continue;
      }
      count++;
      const [path = '', fragment] = href.split('#');
      const target = path === '' ? here : path;
      if (external.has(target)) continue;
      const ids = routes.get(target);
      if (!ids) problems.add(`${name(page)}: ${href} does not resolve to a page`);
      else if (fragment && !ids.has(fragment)) problems.add(`${name(page)}: ${href} points to a missing anchor`);
    }
  }
  return result('internal-links', [...problems], `${count} internal links followed`);
}

function imageAlt(pages: RenderedPage[]): CheckResult {
  const problems: string[] = [];
  let images = 0;
  for (const { page, html } of pages) {
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      images++;
      if (!/\balt="[^"]+"/.test(m[0])) problems.push(`${name(page)}: an image has no alt text`);
    }
    for (const m of html.matchAll(/<svg\b[^>]*>/g)) {
      images++;
      const labelled = /\brole="img"/.test(m[0]) && /\baria-label="[^"]+"/.test(m[0]);
      if (!labelled && !/\baria-hidden="true"/.test(m[0])) problems.push(`${name(page)}: an illustration has no accessible name`);
    }
  }
  return result('image-alt', problems, images ? `${images} image${images === 1 ? '' : 's'} checked` : 'No images used');
}

function headMeta(spec: SiteSpec, pages: RenderedPage[]): CheckResult {
  const problems: string[] = [];
  for (const { page } of pages) {
    const head = pageHead(spec, page.id);
    if (!head.canonical.startsWith('https://') || head.canonical !== canonicalUrl(spec, page)) problems.push(`${name(page)}: canonical URL is wrong`);
    if (!head.robots.includes('noindex')) problems.push(`${name(page)}: robots meta does not block indexing`);
    const og = new Map(head.og.map((o) => [o.property, o.content]));
    if (og.get('og:url') !== head.canonical) problems.push(`${name(page)}: og:url differs from the canonical URL`);
    if (!og.get('og:title')) problems.push(`${name(page)}: og:title is missing`);
  }
  return result('head-meta', problems, `${pages.length} page heads checked`);
}

function sitemap(spec: SiteSpec): CheckResult {
  const problems: string[] = [];
  const listed = spec.sitemap.map((e) => e.path);
  const pagePaths = spec.pages.map((p) => p.path);
  for (const path of pagePaths) if (!listed.includes(path)) problems.push(`sitemap is missing "${path || '/'}"`);
  for (const path of listed) if (!pagePaths.includes(path)) problems.push(`sitemap lists "${path}", which is not a page`);
  if (new Set(listed).size !== listed.length) problems.push('sitemap lists a page more than once');
  return result('sitemap', problems, `${listed.length} sitemap entries`);
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function contrast(spec: SiteSpec): CheckResult {
  const c = spec.design.palette;
  const pairs: [string, string, string, string][] = [
    ['body text', 'background', c.text, c.bg],
    ['muted text', 'background', c.muted, c.bg],
    ['headings', 'background', c.heading, c.bg],
    ['body text', 'surface', c.text, c.surface],
    ['muted text', 'surface', c.muted, c.surface],
    ['headings', 'surface', c.heading, c.surface],
    ['links', 'background', c.primary, c.bg],
    ['links', 'surface', c.primary, c.surface],
    ['button text', 'button', c.onPrimary, c.primary],
    ['hero text', 'hero background', c.heroText, c.heroBg],
    ['hero text', 'button colour', c.heroText, c.primary],
  ];
  const problems = pairs
    .map(([fg, bg, a, b]) => ({ fg, bg, ratio: contrastRatio(a, b) }))
    .filter((p) => p.ratio < MIN_CONTRAST)
    .map((p) => `${p.fg} on ${p.bg} is ${p.ratio.toFixed(2)}:1`);
  return result('contrast', problems, `${pairs.length} token colour pairs sampled`);
}

function stringValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => (k === 'url' || k === '@context' ? [] : stringValues(v)));
  return [];
}

function grounding(input: CarrierInput, spec: SiteSpec, pages: RenderedPage[]): CheckResult {
  const problems = new Set<string>();
  const verified: string[] = [];
  for (const fact of spec.facts) {
    const text = fieldText(resolvePath(input, fact.source));
    if (text === undefined) problems.add(`fact ${fact.id}: input field "${fact.source}" does not exist`);
    else if (!normalize(text).includes(normalize(fact.value))) problems.add(`fact ${fact.id}: "${fact.value}" is not in input field "${fact.source}"`);
    else verified.push(normalize(fact.value));
  }
  const allowedNumbers = new Set(verified.flatMap((v) => v.match(NUMBER_RE) ?? []));

  let numbersChecked = 0;
  let claimsChecked = 0;
  // one problem per page and unsupported value, quoting the first place it appears
  const unsupported = new Map<string, string>();
  for (const { page, html } of pages) {
    // photo credits come from the vetted media library, not from the generated copy
    const copy = html.replace(/<figcaption class="credit">[\s\S]*?<\/figcaption>/g, ' ');
    const texts = [page.seo.title, page.seo.description, ...textBlocks(copy), ...ariaLabels(copy)];
    for (const raw of pageHead(spec, page.id).jsonLd) texts.push(...stringValues(JSON.parse(raw)));
    for (const text of texts) {
      for (const m of text.matchAll(NUMBER_RE)) {
        numbersChecked++;
        const key = `${page.id}|${m[0]}`;
        if (!allowedNumbers.has(m[0]) && !unsupported.has(key))
          unsupported.set(key, `${name(page)}: states ${m[0]} in "${snippet(text, m.index ?? 0, m[0].length)}", and no input fact has it`);
      }
      for (const m of text.matchAll(CLAIM_RE)) {
        claimsChecked++;
        const term = normalize(m[0]);
        const key = `${page.id}|${term}`;
        if (!verified.some((v) => v.includes(term)) && !unsupported.has(key))
          unsupported.set(key, `${name(page)}: claims "${m[0]}" in "${snippet(text, m.index ?? 0, m[0].length)}", and no input fact supports it`);
      }
    }
  }
  for (const p of unsupported.values()) problems.add(p);
  return result(
    'grounding',
    [...problems],
    `${verified.length} facts verified against the input; ${numbersChecked} numbers and ${claimsChecked} claim words checked`,
  );
}

// ---------- entry point ----------

const ORDER: CheckId[] = [
  'spec-valid',
  'title-length',
  'meta-description',
  'single-h1',
  'heading-order',
  'local-keyword',
  'json-ld',
  'internal-links',
  'image-alt',
  'head-meta',
  'sitemap',
  'contrast',
  'grounding',
];

export function runChecks(input: CarrierInput, raw: unknown): CheckReport {
  const validation = validateSpec(raw);
  if (!validation.ok) {
    const results = ORDER.map((id) =>
      id === 'spec-valid'
        ? result(id, validation.problems, 'Schema validation')
        : result(id, ['Not run because the spec is not valid'], 'Skipped'),
    );
    return { passed: false, results };
  }
  const spec = validation.spec;
  const pages: RenderedPage[] = spec.pages.map((page) => {
    const html = renderBody(spec, page.id as PageId);
    return { page, html, headings: headingsOf(html) };
  });
  const specProblems = spec.carrierId === input.id ? [] : [`spec is for ${spec.carrierId}, not ${input.id}`];
  const results = [
    result('spec-valid', specProblems, `${spec.pages.length} pages, ${spec.facts.length} facts`),
    titleLength(pages),
    metaDescription(pages),
    singleH1(pages),
    headingOrder(pages),
    localKeyword(pages),
    jsonLd(spec, pages),
    internalLinks(spec, pages),
    imageAlt(pages),
    headMeta(spec, pages),
    sitemap(spec),
    contrast(spec),
    grounding(input, spec, pages),
  ];
  return { passed: results.every((r) => r.passed), results };
}
