import { mediaById, mediaCredit, mediaSrc } from './media';
import type {
  AccordionSection,
  CardsSection,
  ChecklistSection,
  CtaSection,
  FaqSection,
  FeatureSection,
  HeroSection,
  ImageRef,
  LanesSection,
  Link,
  PageId,
  ProseSection,
  QuoteFormSection,
  Section,
  SitePage,
  SiteSpec,
  StatsSection,
} from './types';

// rendering is a pure function of the spec, so the checks inspect exactly the html that ships

// canonical urls, sitemaps and the json-ld checks all use this origin; it must match the url in each
// recorded spec, so a deploy to another host changes both together
export const SITE_ORIGIN = 'https://work.nielzontolentino.com';
export const SITES_PATH = '/carrier-sites/';
// the generator is the site root; carrier sites keep their own prefix so their urls match the canonical ones
export const GENERATOR_PATH = '/';
export const ROBOTS = 'noindex, nofollow';

export function siteBase(slug: string): string {
  return `${SITES_PATH}${slug}/`;
}

export function pageHref(spec: SiteSpec, page: SitePage): string {
  return `${siteBase(spec.slug)}${page.path}`;
}

export function canonicalUrl(spec: SiteSpec, page: SitePage): string {
  return `${SITE_ORIGIN}${pageHref(spec, page)}`;
}

export function findPage(spec: SiteSpec, id: PageId): SitePage {
  const page = spec.pages.find((p) => p.id === id);
  if (!page) throw new Error(`spec ${spec.slug} has no ${id} page`);
  return page;
}

export function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** the h1 may hold newlines for intentional line breaks; everywhere else it reads as one line */
export function flatHeading(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ').trim();
}

function telHref(phone: string): string {
  return `tel:+1${phone.replace(/\D/g, '')}`;
}

// links in the spec are written relative to the carrier site root ("quote/", "#quote-form"),
// so the model never has to know where the demo is hosted
export function resolveHref(spec: SiteSpec, href: string): string {
  if (/^(https?:|mailto:|tel:|#|\/)/.test(href)) return href;
  return `${siteBase(spec.slug)}${href}`;
}

function button(spec: SiteSpec, link: Link, variant: 'primary' | 'ghost'): string {
  return `<a class="btn btn--${variant}" href="${esc(resolveHref(spec, link.href))}">${esc(link.label)}</a>`;
}

// ---------- photos ----------

function photo(ref: ImageRef, sizes: string, eager: boolean, cls: string): string {
  const asset = mediaById(ref.id);
  if (!asset) return '';
  const set = (format: 'avif' | 'webp' | 'jpg') => asset.widths.map((w) => `${mediaSrc(asset, w, format)} ${w}w`).join(', ');
  const largest = asset.widths[asset.widths.length - 1] ?? asset.widths[0] ?? 0;
  const loading = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  return `<figure class="photo ${cls}"><div class="photo__frame"><picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="${mediaSrc(asset, largest, 'jpg')}" srcset="${set('jpg')}" sizes="${sizes}" alt="${esc(ref.alt)}" width="${asset.width}" height="${asset.height}" ${loading} decoding="async"></picture></div><figcaption class="credit">${esc(mediaCredit(asset))}</figcaption></figure>`;
}

// ---------- sections ----------

type Variant = SiteSpec['design']['heroVariant'];

function h1(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return `<h1>${esc(flatHeading(text))}</h1>`;
  return `<h1>${lines.map((l) => `<span class="l">${esc(l)}</span>`).join(' ')}</h1>`;
}

function smsHref(phone: string): string {
  return `sms:+1${phone.replace(/\D/g, '')}`;
}

function hero(spec: SiteSpec, page: SitePage, s: HeroSection): string {
  const variant = spec.design.heroVariant;
  const actions = `<div class="actions">${button(spec, s.primaryCta, 'primary')}${s.secondaryCta ? button(spec, s.secondaryCta, 'ghost') : ''}</div>`;
  const highlights = s.highlights.length ? `<ul class="highlights">${s.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : '';
  const eyebrow = `<p class="eyebrow">${esc(s.eyebrow)}</p>`;
  const lead = `<p class="lead">${esc(s.lead)}</p>`;

  if (page.id !== 'home' || !s.image) {
    return `<section class="hero hero--compact"><div class="wrap hero__inner"><div class="hero__title">${eyebrow}${h1(page.seo.h1)}</div><div class="hero__side">${lead}${actions}${highlights}</div></div></section>`;
  }

  if (variant === 'split') {
    // editorial: headline and standfirst over a wide fleet photograph
    const img = photo(s.image, '(min-width: 80rem) 76rem, 100vw', true, 'photo--wide');
    return `<section class="hero hero--home"><div class="wrap"><div class="hero__head"><div class="hero__title">${eyebrow}${h1(page.seo.h1)}</div><div class="hero__side">${lead}${actions}${highlights}</div></div>${img}</div></section>`;
  }
  if (variant === 'band') {
    // structured: text and a framed equipment photo side by side
    const img = photo(s.image, '(min-width: 60rem) 44rem, 100vw', true, 'photo--framed');
    return `<section class="hero hero--home"><div class="wrap hero__grid"><div class="hero__text">${eyebrow}${h1(page.seo.h1)}${lead}${actions}${highlights}</div>${img}</div></section>`;
  }
  // image-led: the truck fills the screen and the text block sits on top of its lower edge
  const b = spec.business;
  const card = `<div class="hero__card"><p class="hero__card-title">Talk to the driver</p><p class="hero__card-phone"><a href="${telHref(b.phone)}">${esc(b.phone)}</a></p>${b.hours.map((h) => `<p>${esc(h)}</p>`).join('')}<p class="hero__card-actions"><a class="btn btn--light btn--sm" href="${telHref(b.phone)}">Call</a><a class="btn btn--outline-light btn--sm" href="${smsHref(b.phone)}">Text</a></p></div>`;
  const img = photo(s.image, '100vw', true, 'photo--bleed');
  return `<section class="hero hero--home">${img}<div class="wrap hero__overlay"><div class="hero__block">${eyebrow}${h1(page.seo.h1)}${lead}${actions}${highlights}</div>${card}</div></section>`;
}

function stats(s: StatsSection): string {
  const items = s.items.map((i) => `<div class="stat"><dt>${esc(i.label)}</dt><dd>${esc(i.value)}</dd></div>`).join('');
  return `<section class="stats" aria-label="${esc(s.label)}"><div class="wrap"><dl class="stats__list">${items}</dl></div></section>`;
}

function head(heading: string, intro?: string): string {
  return `<div class="section__head"><h2>${esc(heading)}</h2>${intro ? `<p class="intro">${esc(intro)}</p>` : ''}</div>`;
}

function cards(s: CardsSection): string {
  const display = s.display ?? 'index';
  const items = s.items.map((i) => `<li class="card" data-tab-panel><h3>${esc(i.title)}</h3><p>${esc(i.body)}</p></li>`).join('');
  const attrs = display === 'tabs' ? ' data-tabs' : '';
  return `<section class="section section--cards cards--${display}" data-reveal><div class="wrap split">${head(s.heading, s.intro)}<div class="cards-wrap"><ul class="cards"${attrs}>${items}</ul></div></div></section>`;
}

function feature(s: FeatureSection): string {
  const list = s.items?.length ? `<ul class="feature__list">${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
  const img = photo(s.image, '(min-width: 60rem) 36rem, 100vw', false, 'photo--feature');
  return `<section class="section section--feature" data-reveal><div class="wrap feature">${img}<div class="feature__text"><h2>${esc(s.heading)}</h2><div class="prose">${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div>${list}</div></div></section>`;
}

function accordion(s: AccordionSection): string {
  const items = s.items.map((i) => `<details class="acc__item"><summary><h3>${esc(i.title)}</h3></summary><div class="acc__body"><p>${esc(i.body)}</p></div></details>`).join('');
  return `<section class="section section--accordion" data-reveal><div class="wrap split">${head(s.heading, s.intro)}<div class="acc">${items}</div></div></section>`;
}

function prose(s: ProseSection): string {
  return `<section class="section section--prose" data-reveal><div class="wrap split">${head(s.heading)}<div class="prose">${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div></div></section>`;
}

function checklist(s: ChecklistSection): string {
  return `<section class="section section--checklist" data-reveal><div class="wrap split">${head(s.heading)}<ul class="checklist">${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div></section>`;
}

const pct = (miles: number, longest: number) => `${((miles / longest) * 100).toFixed(1)}%`;

// distances are drawn to the stated miles, relative to the longest lane in the list. no map is
// drawn, because a map would suggest roads and positions that the input does not give.
function lanes(spec: SiteSpec, s: LanesSection): string {
  const longest = Math.max(1, ...s.lanes.map((l) => l.miles ?? 0));
  const drawn = s.lanes.some((l) => l.miles);
  const display = s.display ?? 'list';
  const key = drawn ? `<p class="lanes__key">Bar length is proportional to the stated road distance.</p>` : '';
  const meta = (l: LanesSection['lanes'][number]) => [l.miles ? `${l.miles} mi` : '', l.frequency ?? ''].filter(Boolean).join(' · ');
  const bar = (l: LanesSection['lanes'][number]) =>
    l.miles ? `<div class="lane__bar" aria-hidden="true"><span style="width:${pct(l.miles, longest)}"></span></div>` : '';
  const route = (l: LanesSection['lanes'][number]) =>
    `<span class="lane__from">${esc(l.from)}</span><span class="lane__arrow" aria-hidden="true">→</span><span class="visually-hidden"> to </span><span class="lane__to">${esc(l.to)}</span>`;

  if (display === 'table') {
    const rows = s.lanes
      .map(
        (l) =>
          `<tr><th scope="row">${route(l)}</th><td class="lane__dist">${l.miles ? `${l.miles} mi` : ''}${bar(l)}</td><td>${esc(l.frequency ?? '')}</td>${l.note ? `<td>${esc(l.note)}</td>` : ''}</tr>`,
      )
      .join('');
    return `<section class="section section--lanes lanes--table" data-reveal><div class="wrap">${head(s.heading, s.intro)}<div class="table-scroll"><table class="lanes-table"><thead><tr><th scope="col">Lane</th><th scope="col">Distance</th><th scope="col">Runs</th></tr></thead><tbody>${rows}</tbody></table></div>${key}</div></section>`;
  }

  const items = s.lanes
    .map(
      (l, i) =>
        `<li class="lane" data-lane data-from="${esc(l.from)}" data-to="${esc(l.to)}" data-meta="${esc(meta(l))}" data-width="${l.miles ? pct(l.miles, longest) : '0%'}"${i === 0 ? ' data-first' : ''}><p class="lane__route">${route(l)}</p>${bar(l)}${meta(l) ? `<p class="lane__meta">${esc(meta(l))}</p>` : ''}${l.note ? `<p class="lane__note">${esc(l.note)}</p>` : ''}</li>`,
    )
    .join('');
  if (display === 'explorer') {
    const quote = spec.pages.find((p) => p.id === 'quote');
    const quoteAttr = quote ? ` data-quote="${esc(pageHref(spec, quote))}"` : '';
    return `<section class="section section--lanes lanes--explorer" data-reveal><div class="wrap">${head(s.heading, s.intro)}<div class="lx" data-explorer${quoteAttr}><ol class="lanes lx__list">${items}</ol></div>${key}</div></section>`;
  }
  return `<section class="section section--lanes lanes--list" data-reveal><div class="wrap">${head(s.heading, s.intro)}<ol class="lanes">${items}</ol>${key}</div></section>`;
}

function faq(s: FaqSection): string {
  if (s.display === 'accordion') {
    const items = s.items.map((i) => `<details class="acc__item faq__item"><summary><h3>${esc(i.q)}</h3></summary><div class="acc__body"><p>${esc(i.a)}</p></div></details>`).join('');
    return `<section class="section section--faq" data-reveal><div class="wrap split">${head(s.heading)}<div class="faq acc">${items}</div></div></section>`;
  }
  const items = s.items.map((i) => `<div class="faq__item"><h3>${esc(i.q)}</h3><p>${esc(i.a)}</p></div>`).join('');
  return `<section class="section section--faq" data-reveal><div class="wrap split">${head(s.heading)}<div class="faq">${items}</div></div></section>`;
}

interface FieldDef {
  id: string;
  label: string;
  control: string;
  required: boolean;
  wide?: boolean;
}

function field(f: FieldDef): string {
  const mark = f.required ? ' <span class="req">(required)</span>' : '';
  return `<div class="field${f.wide ? ' field--wide' : ''}"><label for="${f.id}">${esc(f.label)}${mark}</label>${f.control}<p class="field__error" id="${f.id}-error" hidden></p></div>`;
}

function quoteForm(spec: SiteSpec, s: QuoteFormSection): string {
  const input = (id: string, type: string, auto: string, required: boolean) =>
    `<input id="${id}" name="${id}" type="${type}" autocomplete="${auto}"${required ? ' required aria-required="true"' : ''}>`;
  const options = s.equipmentOptions.map((o) => `<option>${esc(o)}</option>`).join('');
  const defs: FieldDef[] = [
    { id: 'q-name', label: 'Your name', control: input('q-name', 'text', 'name', true), required: true },
    { id: 'q-company', label: 'Company', control: input('q-company', 'text', 'organization', false), required: false },
    { id: 'q-email', label: 'Email', control: input('q-email', 'email', 'email', true), required: true },
    { id: 'q-phone', label: 'Phone', control: input('q-phone', 'tel', 'tel', false), required: false },
    { id: 'q-pickup', label: 'Pickup city', control: input('q-pickup', 'text', 'off', true), required: true },
    { id: 'q-delivery', label: 'Delivery city', control: input('q-delivery', 'text', 'off', true), required: true },
    { id: 'q-equipment', label: 'Equipment', control: `<select id="q-equipment" name="q-equipment">${options}</select>`, required: false },
    { id: 'q-date', label: 'Pickup date', control: input('q-date', 'date', 'off', false), required: false },
    { id: 'q-details', label: 'Freight details', control: `<textarea id="q-details" name="q-details" rows="4"></textarea>`, required: false, wide: true },
  ];
  const b = spec.business;
  const direct = spec.design.heroVariant === 'stacked';
  const aside = s.contactHeading
    ? `<aside class="quote-aside" aria-labelledby="quote-contact"><h2 id="quote-contact">${esc(s.contactHeading)}</h2><p class="quote-aside__phone"><a href="${telHref(b.phone)}">${esc(b.phone)}</a></p>${direct ? `<p class="quote-aside__actions"><a class="btn btn--primary btn--sm" href="${telHref(b.phone)}">Call</a><a class="btn btn--ghost btn--sm" href="${smsHref(b.phone)}">Text</a></p>` : ''}<p><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></p>${b.hours.map((h) => `<p class="quote-aside__hours">${esc(h)}</p>`).join('')}<p class="quote-aside__note">${esc(s.responseNote)}</p></aside>`
    : '';
  const form = `<form class="quote" id="quote-form" data-demo-form novalidate aria-describedby="quote-demo-note">
<p class="quote__demo" id="quote-demo-note">Demo form. Nothing you enter leaves this page.</p>
<p class="quote__prefill" data-prefill-note hidden></p>
<div class="quote__fields">${defs.map(field).join('')}</div>
<div class="quote__foot"><button class="btn btn--primary" type="submit">${esc(s.submitLabel)}</button><p class="quote__note">${esc(s.responseNote)}</p></div>
<div class="form-result" role="status" tabindex="-1" hidden><p class="form-result__title">Demo request recorded on this page</p><p>Nothing was sent. On a live site, dispatch gets this request.</p><button class="btn btn--ghost btn--sm" type="button" data-form-edit>Edit the request</button></div>
</form>`;
  return `<section class="section section--quote"><div class="wrap quote-grid"><div class="quote-main">${head(s.heading, s.intro)}${form}</div>${aside}</div></section>`;
}

function cta(spec: SiteSpec, s: CtaSection): string {
  const b = spec.business;
  if (s.direct) {
    return `<section class="cta cta--direct" data-reveal><div class="wrap cta__inner"><div class="cta__text"><h2>${esc(s.heading)}</h2><p>${esc(s.body)}</p></div><div class="cta__actions"><a class="btn btn--light btn--lg" href="${telHref(b.phone)}">Call ${esc(b.phone)}</a><a class="btn btn--outline-light btn--lg" href="${smsHref(b.phone)}">Send a text</a>${button(spec, s.cta, 'primary')}</div></div></section>`;
  }
  return `<section class="cta" data-reveal><div class="wrap cta__inner"><div class="cta__text"><h2>${esc(s.heading)}</h2><p>${esc(s.body)}</p></div><div class="cta__actions">${button(spec, s.cta, 'primary')}<a class="cta__phone" href="${telHref(b.phone)}">${esc(b.phone)}</a></div></div></section>`;
}

function section(spec: SiteSpec, page: SitePage, s: Section): string {
  switch (s.kind) {
    case 'hero':
      return hero(spec, page, s);
    case 'stats':
      return stats(s);
    case 'cards':
      return cards(s);
    case 'feature':
      return feature(s);
    case 'accordion':
      return accordion(s);
    case 'prose':
      return prose(s);
    case 'checklist':
      return checklist(s);
    case 'lanes':
      return lanes(spec, s);
    case 'faq':
      return faq(s);
    case 'quote-form':
      return quoteForm(spec, s);
    case 'cta':
      return cta(spec, s);
  }
}

// ---------- page chrome ----------

// three header treatments: a centred masthead, a utility bar over a working nav, and a compact bar
// that leads with the phone. the links and their order stay the same, so each site is easy to use.
function header(spec: SiteSpec, current: SitePage): string {
  const variant: Variant = spec.design.heroVariant;
  const link = (p: SitePage) => `<a href="${esc(pageHref(spec, p))}"${p.id === current.id ? ' aria-current="page"' : ''}>${esc(p.navLabel)}</a>`;
  const items = spec.pages
    .filter((p) => p.id !== 'quote')
    .map((p) => `<li>${link(p)}</li>`)
    .join('');
  const quote = spec.pages.find((p) => p.id === 'quote');
  const quoteLink = quote
    ? `<a class="btn btn--primary btn--sm top__quote" href="${esc(pageHref(spec, quote))}"${quote.id === current.id ? ' aria-current="page"' : ''}>${esc(quote.navLabel)}</a>`
    : '';
  const b = spec.business;
  const logo = `<a class="logo" href="${esc(siteBase(spec.slug))}"><span class="logo__mark" aria-hidden="true"></span>${esc(b.name)}</a>`;
  const nav = `<nav class="nav" aria-label="Main"><ul>${items}</ul></nav>`;
  const phone = `<a class="top__phone" href="${telHref(b.phone)}">${esc(b.phone)}</a>`;

  if (variant === 'split') {
    return `<header class="top"><div class="wrap top__mast">${phone}${logo}${quoteLink}</div><div class="top__navrow"><div class="wrap">${nav}</div></div></header>`;
  }
  if (variant === 'band') {
    const utility = `<div class="utility"><div class="wrap utility__row"><p class="utility__status"><span class="utility__dot" aria-hidden="true"></span>${b.hours.map(esc).join(' · ')}</p><p class="utility__contact">${phone}<a href="mailto:${esc(b.email)}">${esc(b.email)}</a></p></div></div>`;
    return `<header class="top">${utility}<div class="wrap top__bar">${logo}${nav}${quoteLink}</div></header>`;
  }
  const call = `<a class="btn btn--primary btn--sm top__call" href="${telHref(b.phone)}">Call the driver<span class="top__call-number"> ${esc(b.phone)}</span></a>`;
  const dock = `<div class="dock" aria-label="Contact the driver" role="region"><a class="dock__item" href="${telHref(b.phone)}">Call</a><a class="dock__item" href="${smsHref(b.phone)}">Text</a>${quote ? `<a class="dock__item dock__item--primary" href="${esc(pageHref(spec, quote))}">Quote</a>` : ''}</div>`;
  return `<header class="top"><div class="wrap top__bar">${logo}${nav}${call}</div></header>${dock}`;
}

function footer(spec: SiteSpec): string {
  const b = spec.business;
  const links = spec.pages.map((p) => `<li><a href="${esc(pageHref(spec, p))}">${esc(p.navLabel)}</a></li>`).join('');
  return `<footer class="foot"><div class="wrap foot__grid">
<div><p class="foot__name">${esc(b.name)}</p><p>${esc(b.street)}<br>${esc(b.city)}, ${esc(b.state)} ${esc(b.zip)}</p></div>
<div><p class="foot__label">Contact</p><p><a href="${telHref(b.phone)}">${esc(b.phone)}</a><br><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></p></div>
<div><p class="foot__label">Hours</p>${b.hours.map((h) => `<p>${esc(h)}</p>`).join('')}</div>
<nav aria-label="Footer"><ul class="foot__nav">${links}</ul></nav>
</div><div class="wrap foot__note"><p>Fictional business. This site was generated for a demo. Photos are illustrative stock and do not show this carrier.</p></div></footer>`;
}

export function renderBody(spec: SiteSpec, pageId: PageId): string {
  const page = findPage(spec, pageId);
  const banner = `<div class="demo-banner"><p>Fictional business. This site was generated for a demo. <a href="${GENERATOR_PATH}">Back to the generator</a></p></div>`;
  const skip = `<a class="skip" href="#content">Skip to content</a>`;
  const main = `<main id="content" class="page page--${page.id}">${page.sections.map((s) => section(spec, page, s)).join('\n')}</main>`;
  return `<div class="site site--${spec.design.heroVariant}">${[skip, banner, header(spec, page), main, footer(spec)].join('\n')}</div>`;
}

// ---------- head ----------

export interface PageHead {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  og: { property: string; content: string }[];
  jsonLd: string[];
}

// json-ld is embedded in a script tag, so a closing tag inside a string must not end the script early
function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function pageHead(spec: SiteSpec, pageId: PageId): PageHead {
  const page = findPage(spec, pageId);
  const canonical = canonicalUrl(spec, page);
  const jsonLd: string[] = [];
  if (page.id === 'home') jsonLd.push(jsonForScript(spec.structuredData.organization));
  if (page.id === 'faq') jsonLd.push(jsonForScript(spec.structuredData.faqPage));
  return {
    title: page.seo.title,
    description: page.seo.description,
    canonical,
    robots: ROBOTS,
    og: [
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: spec.business.name },
      { property: 'og:title', content: page.seo.title },
      { property: 'og:description', content: page.seo.description },
      { property: 'og:url', content: canonical },
    ],
    jsonLd,
  };
}

export function renderSitemap(spec: SiteSpec): string {
  const urls = spec.sitemap
    .map(
      (e) =>
        `  <url>\n    <loc>${SITE_ORIGIN}${siteBase(spec.slug)}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority.toFixed(1)}</priority>\n  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}


export { renderCss } from './site-css';
