// the carrier business data that a dispatcher or owner fills in. everything the generated site
// is allowed to claim has to come from these fields.
export interface CarrierInput {
  id: string;
  slug: string;
  name: string;
  owner: string;
  foundedYear: number;
  fleet: {
    tractors: number;
    trailers: { type: string; count: number }[];
  };
  equipment: string[];
  base: { street: string; city: string; state: string; zip: string; metro: string };
  serviceArea: string;
  lanes: { from: string; to: string; miles: number; frequency: string }[];
  specialties: string[];
  credentials: string[];
  hours: string[];
  quoteResponse: string;
  contact: { phone: string; email: string; person: string };
  ownerNote: string;
}

export type PageId = 'home' | 'services' | 'lanes' | 'quote' | 'faq';
export const PAGE_IDS: readonly PageId[] = ['home', 'services', 'lanes', 'quote', 'faq'];

export type HeroVariant = 'split' | 'band' | 'stacked';
export type RadiusStyle = 'square' | 'soft' | 'round';

export interface Palette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  heading: string;
  primary: string;
  onPrimary: string;
  accent: string;
  heroBg: string;
  heroText: string;
  border: string;
}

export interface FontToken {
  family: string;
  fallback: string;
  weight: number;
}

export interface DesignTokens {
  palette: Palette;
  fonts: { heading: FontToken; body: FontToken };
  heroVariant: HeroVariant;
  radius: RadiusStyle;
}

export interface Link {
  label: string;
  href: string;
}

/** a photo picked from the licensed media library in media.ts, with alt text written for this page */
export interface ImageRef {
  id: string;
  alt: string;
}

export interface HeroSection {
  kind: 'hero';
  eyebrow: string;
  lead: string;
  primaryCta: Link;
  secondaryCta?: Link;
  highlights: string[];
  image?: ImageRef;
}

export interface StatsSection {
  kind: 'stats';
  /** short label for screen readers; the stats strip has no visible heading */
  label: string;
  items: { value: string; label: string }[];
}

export interface CardsSection {
  kind: 'cards';
  heading: string;
  intro?: string;
  items: { title: string; body: string }[];
  /** index: numbered editorial list; modules: compact tiles; panels: large blocks; tabs: one panel at a time */
  display?: 'index' | 'modules' | 'panels' | 'tabs';
}

/** text beside a photo */
export interface FeatureSection {
  kind: 'feature';
  heading: string;
  paragraphs: string[];
  image: ImageRef;
  items?: string[];
}

/** expandable details; each item opens on its own */
export interface AccordionSection {
  kind: 'accordion';
  heading: string;
  intro?: string;
  items: { title: string; body: string }[];
}

export interface ProseSection {
  kind: 'prose';
  heading: string;
  paragraphs: string[];
}

export interface ChecklistSection {
  kind: 'checklist';
  heading: string;
  items: string[];
}

export interface LanesSection {
  kind: 'lanes';
  heading: string;
  intro: string;
  lanes: { from: string; to: string; miles?: number; frequency?: string; note?: string }[];
  /** explorer: pick a lane to see its detail; table: one row per lane; list: stacked rows */
  display?: 'explorer' | 'table' | 'list';
}

export interface FaqSection {
  kind: 'faq';
  heading: string;
  items: { q: string; a: string }[];
  display?: 'list' | 'accordion';
}

export interface QuoteFormSection {
  kind: 'quote-form';
  heading: string;
  intro: string;
  equipmentOptions: string[];
  submitLabel: string;
  responseNote: string;
  /** heading for the contact panel beside the form */
  contactHeading?: string;
}

export interface CtaSection {
  kind: 'cta';
  heading: string;
  body: string;
  cta: Link;
  /** direct puts call and text actions first, for a business where the owner answers the phone */
  direct?: boolean;
}

export type Section =
  | HeroSection
  | StatsSection
  | CardsSection
  | FeatureSection
  | AccordionSection
  | ProseSection
  | ChecklistSection
  | LanesSection
  | FaqSection
  | QuoteFormSection
  | CtaSection;

export interface Heading {
  level: number;
  text: string;
}

export interface PageSeo {
  title: string;
  description: string;
  /** may contain a newline to set an intentional line break in the visible heading */
  h1: string;
  headings: Heading[];
  localKeywords: string[];
}

export interface SitePage {
  id: PageId;
  /** relative to the site root, '' for home, otherwise ending in a slash */
  path: string;
  navLabel: string;
  seo: PageSeo;
  sections: Section[];
}

export interface Fact {
  id: string;
  claim: string;
  /** dotted path into the carrier input, for example fleet.trailers.0.count */
  source: string;
  value: string;
}

export interface SitemapEntry {
  path: string;
  changefreq: 'weekly' | 'monthly' | 'yearly';
  priority: number;
}

export interface SiteSpec {
  specVersion: 1;
  carrierId: string;
  slug: string;
  business: {
    name: string;
    phone: string;
    email: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    hours: string[];
  };
  design: DesignTokens;
  pages: SitePage[];
  structuredData: {
    organization: Record<string, unknown>;
    faqPage: Record<string, unknown>;
  };
  sitemap: SitemapEntry[];
  facts: Fact[];
}

export type CheckId =
  | 'spec-valid'
  | 'title-length'
  | 'meta-description'
  | 'single-h1'
  | 'heading-order'
  | 'local-keyword'
  | 'json-ld'
  | 'internal-links'
  | 'image-alt'
  | 'head-meta'
  | 'sitemap'
  | 'contrast'
  | 'grounding';

export interface CheckResult {
  id: CheckId;
  label: string;
  passed: boolean;
  /** one line per problem; empty when the check passed */
  problems: string[];
  /** short plain summary of what was checked */
  summary: string;
}

export interface CheckReport {
  passed: boolean;
  results: CheckResult[];
}
