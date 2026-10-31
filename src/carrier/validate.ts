import { mediaById } from './media';
import { PAGE_IDS, type SiteSpec } from './types';

// hand-written structural validator for model output. the model returns json; nothing renders
// until the json has the exact shape the renderer expects.

type Problems = string[];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const HEX = /^#[0-9a-f]{6}$/i;

function str(p: Problems, o: Record<string, unknown>, key: string, at: string, opts: { allowEmpty?: boolean } = {}): void {
  const v = o[key];
  if (typeof v !== 'string') p.push(`${at}.${key} must be a string`);
  else if (!opts.allowEmpty && v.trim() === '') p.push(`${at}.${key} must not be empty`);
}

function strArray(p: Problems, o: Record<string, unknown>, key: string, at: string, min = 0): void {
  const v = o[key];
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) p.push(`${at}.${key} must be a list of strings`);
  else if (v.length < min) p.push(`${at}.${key} needs at least ${min} item(s)`);
}

function objArray(p: Problems, o: Record<string, unknown>, key: string, at: string, min = 1): Record<string, unknown>[] {
  const v = o[key];
  if (!Array.isArray(v) || !v.every(isObj)) {
    p.push(`${at}.${key} must be a list of objects`);
    return [];
  }
  if (v.length < min) p.push(`${at}.${key} needs at least ${min} item(s)`);
  return v;
}

function link(p: Problems, v: unknown, at: string): void {
  if (!isObj(v)) return void p.push(`${at} must be a link object`);
  str(p, v, 'label', at);
  str(p, v, 'href', at);
}

function oneOf(p: Problems, o: Record<string, unknown>, key: string, at: string, allowed: string[]): void {
  if (o[key] !== undefined && !allowed.includes(o[key] as string)) p.push(`${at}.${key} must be one of ${allowed.join(', ')}`);
}

function image(p: Problems, v: unknown, at: string): void {
  if (!isObj(v)) return void p.push(`${at} must be an object`);
  str(p, v, 'id', at);
  // empty alt is valid json; the image-alt check decides whether it is good enough
  str(p, v, 'alt', at, { allowEmpty: true });
  if (typeof v.id === 'string' && !mediaById(v.id)) p.push(`${at}.id "${v.id}" is not in the media library`);
}

function section(p: Problems, s: Record<string, unknown>, at: string): void {
  switch (s.kind) {
    case 'hero':
      str(p, s, 'eyebrow', at);
      str(p, s, 'lead', at);
      link(p, s.primaryCta, `${at}.primaryCta`);
      if (s.secondaryCta !== undefined) link(p, s.secondaryCta, `${at}.secondaryCta`);
      strArray(p, s, 'highlights', at);
      if (s.image !== undefined) image(p, s.image, `${at}.image`);
      return;
    case 'feature':
      str(p, s, 'heading', at);
      strArray(p, s, 'paragraphs', at, 1);
      image(p, s.image, `${at}.image`);
      if (s.items !== undefined) strArray(p, s, 'items', at);
      return;
    case 'accordion':
      str(p, s, 'heading', at);
      if (s.intro !== undefined) str(p, s, 'intro', at);
      objArray(p, s, 'items', at).forEach((i, n) => {
        str(p, i, 'title', `${at}.items.${n}`);
        str(p, i, 'body', `${at}.items.${n}`);
      });
      return;
    case 'stats':
      str(p, s, 'label', at);
      objArray(p, s, 'items', at).forEach((i, n) => {
        str(p, i, 'value', `${at}.items.${n}`);
        str(p, i, 'label', `${at}.items.${n}`);
      });
      return;
    case 'cards':
      str(p, s, 'heading', at);
      if (s.intro !== undefined) str(p, s, 'intro', at);
      objArray(p, s, 'items', at).forEach((i, n) => {
        str(p, i, 'title', `${at}.items.${n}`);
        str(p, i, 'body', `${at}.items.${n}`);
      });
      oneOf(p, s, 'display', at, ['index', 'modules', 'panels', 'tabs']);
      return;
    case 'prose':
      str(p, s, 'heading', at);
      strArray(p, s, 'paragraphs', at, 1);
      return;
    case 'checklist':
      str(p, s, 'heading', at);
      strArray(p, s, 'items', at, 1);
      return;
    case 'lanes':
      str(p, s, 'heading', at);
      str(p, s, 'intro', at);
      objArray(p, s, 'lanes', at).forEach((l, n) => {
        for (const k of ['from', 'to']) str(p, l, k, `${at}.lanes.${n}`);
        for (const k of ['frequency', 'note']) if (l[k] !== undefined) str(p, l, k, `${at}.lanes.${n}`);
        if (l.miles !== undefined && (typeof l.miles !== 'number' || l.miles <= 0)) p.push(`${at}.lanes.${n}.miles must be a positive number`);
      });
      oneOf(p, s, 'display', at, ['explorer', 'table', 'list']);
      return;
    case 'faq':
      str(p, s, 'heading', at);
      objArray(p, s, 'items', at).forEach((i, n) => {
        str(p, i, 'q', `${at}.items.${n}`);
        str(p, i, 'a', `${at}.items.${n}`);
      });
      oneOf(p, s, 'display', at, ['list', 'accordion']);
      return;
    case 'quote-form':
      for (const k of ['heading', 'intro', 'submitLabel', 'responseNote']) str(p, s, k, at);
      strArray(p, s, 'equipmentOptions', at, 1);
      if (s.contactHeading !== undefined) str(p, s, 'contactHeading', at);
      return;
    case 'cta':
      str(p, s, 'heading', at);
      str(p, s, 'body', at);
      link(p, s.cta, `${at}.cta`);
      if (s.direct !== undefined && typeof s.direct !== 'boolean') p.push(`${at}.direct must be true or false`);
      return;
    default:
      p.push(`${at}.kind "${String(s.kind)}" is not a known section kind`);
  }
}

function design(p: Problems, d: unknown): void {
  if (!isObj(d)) return void p.push('design must be an object');
  const palette = d.palette;
  if (!isObj(palette)) p.push('design.palette must be an object');
  else {
    for (const k of ['bg', 'surface', 'text', 'muted', 'heading', 'primary', 'onPrimary', 'accent', 'heroBg', 'heroText', 'border']) {
      if (typeof palette[k] !== 'string' || !HEX.test(palette[k] as string)) p.push(`design.palette.${k} must be a #rrggbb colour`);
    }
  }
  const fonts = d.fonts;
  if (!isObj(fonts)) p.push('design.fonts must be an object');
  else {
    for (const k of ['heading', 'body']) {
      const f = fonts[k];
      if (!isObj(f)) {
        p.push(`design.fonts.${k} must be an object`);
        continue;
      }
      str(p, f, 'family', `design.fonts.${k}`);
      str(p, f, 'fallback', `design.fonts.${k}`);
      if (typeof f.weight !== 'number') p.push(`design.fonts.${k}.weight must be a number`);
    }
  }
  if (!['split', 'band', 'stacked'].includes(d.heroVariant as string)) p.push('design.heroVariant must be split, band or stacked');
  if (!['square', 'soft', 'round'].includes(d.radius as string)) p.push('design.radius must be square, soft or round');
}

function page(p: Problems, pg: Record<string, unknown>, n: number): void {
  const at = `pages.${n}`;
  if (!PAGE_IDS.includes(pg.id as never)) p.push(`${at}.id must be one of ${PAGE_IDS.join(', ')}`);
  if (typeof pg.path !== 'string' || (pg.path !== '' && !/^[a-z-]+\/$/.test(pg.path))) p.push(`${at}.path must be '' or a slug ending in /`);
  str(p, pg, 'navLabel', at);
  const seo = pg.seo;
  if (!isObj(seo)) p.push(`${at}.seo must be an object`);
  else {
    str(p, seo, 'title', `${at}.seo`);
    // an empty description is valid json; the seo checks decide whether it is good enough
    str(p, seo, 'description', `${at}.seo`, { allowEmpty: true });
    str(p, seo, 'h1', `${at}.seo`);
    strArray(p, seo, 'localKeywords', `${at}.seo`, 1);
    objArray(p, seo, 'headings', `${at}.seo`).forEach((h, i) => {
      if (typeof h.level !== 'number') p.push(`${at}.seo.headings.${i}.level must be a number`);
      str(p, h, 'text', `${at}.seo.headings.${i}`);
    });
  }
  const sections = objArray(p, pg, 'sections', at);
  sections.forEach((s, i) => section(p, s, `${at}.sections.${i}`));
  if (sections[0] && sections[0].kind !== 'hero') p.push(`${at}.sections.0 must be the hero`);
}

export function validateSpec(value: unknown): { ok: true; spec: SiteSpec } | { ok: false; problems: string[] } {
  const p: Problems = [];
  if (!isObj(value)) return { ok: false, problems: ['spec must be a json object'] };
  if (value.specVersion !== 1) p.push('specVersion must be 1');
  str(p, value, 'carrierId', 'spec');
  str(p, value, 'slug', 'spec');
  const b = value.business;
  if (!isObj(b)) p.push('business must be an object');
  else {
    for (const k of ['name', 'phone', 'email', 'street', 'city', 'state', 'zip']) str(p, b, k, 'business');
    strArray(p, b, 'hours', 'business', 1);
  }
  design(p, value.design);
  const pages = objArray(p, value, 'pages', 'spec', PAGE_IDS.length);
  pages.forEach((pg, n) => page(p, pg, n));
  const ids = pages.map((pg) => pg.id);
  for (const id of PAGE_IDS) if (!ids.includes(id)) p.push(`pages is missing the ${id} page`);
  const sd = value.structuredData;
  if (!isObj(sd) || !isObj(sd.organization) || !isObj(sd.faqPage)) p.push('structuredData needs organization and faqPage objects');
  objArray(p, value, 'sitemap', 'spec').forEach((e, n) => {
    if (typeof e.path !== 'string') p.push(`sitemap.${n}.path must be a string`);
    if (!['weekly', 'monthly', 'yearly'].includes(e.changefreq as string)) p.push(`sitemap.${n}.changefreq is not allowed`);
    if (typeof e.priority !== 'number' || e.priority < 0 || e.priority > 1) p.push(`sitemap.${n}.priority must be between 0 and 1`);
  });
  objArray(p, value, 'facts', 'spec').forEach((f, n) => {
    for (const k of ['id', 'claim', 'source', 'value']) str(p, f, k, `facts.${n}`);
  });
  return p.length === 0 ? { ok: true, spec: value as unknown as SiteSpec } : { ok: false, problems: p };
}
