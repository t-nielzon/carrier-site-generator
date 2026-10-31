import type { HeroVariant, SiteSpec } from './types';

// one shared base plus one composition per layout variant. the spec supplies colours, fonts and
// the variant; the layouts themselves are fixed and reviewed, so a generated site cannot ship a
// broken grid. text colours only ever use the token pairs that the contrast check samples.

const RADIUS = { square: '0', soft: '3px', round: '8px' } as const;

export function renderCss(spec: SiteSpec): string {
  const { palette: c, fonts, radius, heroVariant } = spec.design;
  const vars = `:root{--bg:${c.bg};--surface:${c.surface};--text:${c.text};--muted:${c.muted};--heading:${c.heading};--primary:${c.primary};--on-primary:${c.onPrimary};--accent:${c.accent};--hero-bg:${c.heroBg};--hero-text:${c.heroText};--border:${c.border};--radius:${RADIUS[radius]};--font-heading:'${fonts.heading.family}',${fonts.heading.fallback};--font-body:'${fonts.body.family}',${fonts.body.fallback};--heading-weight:${fonts.heading.weight};--body-weight:${fonts.body.weight}}`;
  return vars + BASE_CSS + VARIANT_CSS[heroVariant] + MOTION_CSS;
}

const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
[hidden]{display:none!important}
html{-webkit-text-size-adjust:100%;interpolate-size:allow-keywords}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);font-weight:var(--body-weight);font-size:1.0625rem;line-height:1.6;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%;height:auto}
h1,h2,h3{font-family:var(--font-heading);font-weight:var(--heading-weight);color:var(--heading);line-height:1.1;margin:0 0 .5em;text-wrap:balance}
h1{font-size:var(--h1,clamp(2.5rem,1.6rem + 3.4vw,4.4rem));letter-spacing:-.02em}
h1 .l{display:block}
h2{font-size:var(--h2,clamp(1.75rem,1.3rem + 1.5vw,2.5rem));letter-spacing:-.01em}
h3{font-size:var(--h3,1.1875rem);line-height:1.25}
p{margin:0 0 1em}
a{color:var(--primary);text-underline-offset:.18em;text-decoration-thickness:1px;transition:color .15s,text-decoration-color .15s}
a:hover{color:var(--heading)}
:focus-visible{outline:3px solid var(--primary);outline-offset:3px}
.wrap{width:100%;max-width:var(--wrap,76rem);margin:0 auto;padding:0 clamp(1.25rem,4vw,2.5rem)}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.skip{position:absolute;left:1rem;top:-4rem;background:var(--surface);color:var(--heading);padding:.5rem 1rem;z-index:30}
.skip:focus{top:1rem}
.demo-banner{background:#141619;color:#e8e9eb;font:500 .8125rem/1.4 system-ui,sans-serif;text-align:center;padding:.55rem 1rem}
.demo-banner p{margin:0}
.demo-banner a{color:#ffffff}
.demo-banner a:focus-visible{outline-color:#ffffff}
.logo{display:inline-flex;align-items:center;gap:.6rem;font-family:var(--font-heading);font-weight:var(--heading-weight);font-size:1.3rem;line-height:1.1;color:var(--heading);text-decoration:none}
.nav ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.25rem 1.6rem}
.nav a{position:relative;display:inline-block;color:var(--text);text-decoration:none;font-size:.9688rem;padding:.35rem 0}
.nav a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--primary);transform:scaleX(0);transform-origin:left;transition:transform .2s ease}
.nav a:hover{color:var(--heading)}
.nav a:hover::after{transform:scaleX(.5)}
.nav a[aria-current=page]{color:var(--heading)}
.nav a[aria-current=page]::after{transform:scaleX(1)}
.top__phone{color:var(--heading);font-weight:600;text-decoration:none;white-space:nowrap}
.top__phone:hover{color:var(--primary)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;min-height:2.875rem;padding:.7rem 1.4rem;font:600 1rem/1.2 var(--font-body);text-decoration:none;text-align:center;border:1.5px solid var(--primary);border-radius:var(--radius);cursor:pointer;transition:background-color .15s,color .15s,border-color .15s,transform .15s}
.btn:active{transform:translateY(1px)}
.btn--primary{background:var(--primary);color:var(--on-primary)}
.btn--primary:hover{background:var(--heading);border-color:var(--heading);color:var(--bg)}
.btn--ghost{background:transparent;color:var(--heading);border-color:var(--heading)}
.btn--ghost:hover{background:var(--heading);color:var(--bg)}
.btn--light{background:var(--hero-text);border-color:var(--hero-text);color:var(--hero-bg)}
.btn--light:hover{background:transparent;color:var(--hero-text)}
.btn--outline-light{background:transparent;border-color:var(--hero-text);color:var(--hero-text)}
.btn--outline-light:hover{background:var(--hero-text);color:var(--hero-bg)}
.btn--sm{min-height:2.5rem;padding:.5rem 1rem;font-size:.9375rem}
.btn--lg{min-height:3.25rem;padding:.85rem 1.6rem;font-size:1.0625rem}
.btn[aria-current=page]{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--primary)}
.actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:2rem}
.eyebrow{font-size:.8125rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:1.1rem}
.lead{font-size:clamp(1.125rem,1rem + .4vw,1.3125rem);line-height:1.55;max-width:34rem;margin-bottom:0}
.highlights{list-style:none;margin:1.5rem 0 0;padding:0;display:flex;flex-wrap:wrap;gap:.4rem 1.5rem;color:var(--muted);font-size:.9375rem}
.photo{margin:0}
.photo__frame{overflow:hidden;background:var(--border)}
.photo picture{display:block;height:100%}
.photo img{width:100%;height:100%;object-fit:cover;transition:transform .6s cubic-bezier(.2,.6,.2,1)}
.photo:hover img{transform:scale(1.025)}
.credit{margin-top:.55rem;font-size:.75rem;line-height:1.4;color:var(--muted)}
.hero--compact{padding:clamp(3rem,6vw,5rem) 0 clamp(2.5rem,5vw,3.5rem);border-bottom:1px solid var(--border)}
.hero--compact h1{font-size:var(--h1-compact,clamp(2.2rem,1.5rem + 2.6vw,3.4rem));max-width:22ch}
.hero--compact .hero__inner{display:grid;gap:1rem 4rem;align-items:end}
.stats{border-bottom:1px solid var(--border)}
.stats__list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin:0}
.stat{display:flex;flex-direction:column-reverse;justify-content:flex-end;gap:.2rem;padding:1.5rem 1.25rem 1.5rem 0}
.stat dd{margin:0;font-family:var(--font-heading);font-weight:var(--heading-weight);font-size:clamp(1.75rem,1.3rem + 1.4vw,2.5rem);line-height:1;color:var(--heading)}
.stat dt{font-size:.9375rem;color:var(--muted)}
.section{padding:clamp(3.5rem,7vw,6rem) 0}
.section__head{max-width:38rem;margin-bottom:2rem}
.intro{color:var(--muted);font-size:1.0625rem;margin:0}
.split{display:grid;gap:0 4rem}
.cards{list-style:none;margin:0;padding:0;display:grid;gap:0 2.5rem}
.card{border-top:1px solid var(--border);padding:1.4rem 0 .6rem}
.card h3{margin-bottom:.4rem}
.card p{color:var(--muted)}
.prose{max-width:40rem}
.prose p{font-size:1.125rem}
.feature{display:grid;gap:2rem 4rem;align-items:center}
.feature__list{list-style:none;margin:1.5rem 0 0;padding:0;border-top:1px solid var(--border)}
.feature__list li{padding:.7rem 0;border-bottom:1px solid var(--border)}
.checklist{list-style:none;margin:0;padding:0;display:grid;gap:0 2.5rem}
.checklist li{position:relative;padding:1rem 0 1rem 2rem;border-top:1px solid var(--border)}
.checklist li::before{content:"";position:absolute;left:.15rem;top:1.45rem;width:.85rem;height:.45rem;border-left:2px solid var(--primary);border-bottom:2px solid var(--primary);transform:rotate(-45deg)}
.acc{border-top:1px solid var(--heading)}
.acc__item{border-bottom:1px solid var(--border)}
.acc__item summary{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.15rem 0;cursor:pointer;list-style:none}
.acc__item summary::-webkit-details-marker{display:none}
.acc__item summary h3{margin:0;font-size:var(--h3,1.1875rem);transition:color .15s}
.acc__item summary::after{content:"";flex:none;width:.65rem;height:.65rem;border-right:2px solid var(--primary);border-bottom:2px solid var(--primary);transform:translateY(-.15rem) rotate(45deg);transition:transform .25s ease}
.acc__item[open] summary::after{transform:translateY(.1rem) rotate(-135deg)}
.acc__item summary:hover h3{color:var(--primary)}
.acc__item::details-content{block-size:0;overflow:hidden;transition:block-size .3s ease,content-visibility .3s allow-discrete}
.acc__item[open]::details-content{block-size:auto}
.acc__body{padding:0 0 1.25rem}
.acc__body p{margin:0;max-width:40rem}
.lanes{list-style:none;margin:0;padding:0;border-top:1px solid var(--heading)}
.lane{display:grid;gap:.4rem 2rem;padding:1.25rem 0;border-bottom:1px solid var(--border)}
.lane p{margin:0}
.lane__route{display:flex;flex-wrap:wrap;gap:.2rem .6rem;font-family:var(--font-heading);font-weight:var(--heading-weight);color:var(--heading);font-size:1.1875rem;line-height:1.25}
.lane__arrow{color:var(--primary)}
.lane__bar{height:.4rem;background:var(--border);align-self:center}
.lane__bar span{display:block;height:100%;background:var(--primary)}
.lane__meta{color:var(--text);font-variant-numeric:tabular-nums}
.lane__note{color:var(--muted);grid-column:1/-1}
.lanes__key{margin:1rem 0 0;font-size:.875rem;color:var(--muted)}
.faq__item{border-top:1px solid var(--border);padding:1.4rem 0 .4rem}
.faq__item h3{margin-bottom:.45rem}
.faq__item p{max-width:40rem}
.faq.acc .faq__item{border-top:0;padding:0}
.quote-grid{display:grid;gap:3rem}
.quote__demo,.quote__prefill{margin:0 0 1.5rem;padding:.75rem 1rem;border-left:3px solid var(--primary);background:var(--surface);font-size:.9375rem;color:var(--text)}
.quote__fields{display:grid;gap:1.25rem 1.5rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))}
.field{display:flex;flex-direction:column;gap:.4rem;min-width:0}
.field--wide{grid-column:1/-1}
.field label{font-weight:600;color:var(--heading);font-size:.9688rem}
.req{font-weight:400;color:var(--muted);font-size:.875rem}
.field input,.field select,.field textarea{font:inherit;color:var(--text);background:var(--surface);border:1px solid var(--muted);border-radius:var(--radius);padding:.7rem .8rem;width:100%;min-width:0;transition:border-color .15s,box-shadow .15s}
.field input:hover,.field select:hover,.field textarea:hover{border-color:var(--heading)}
.field input:focus-visible,.field select:focus-visible,.field textarea:focus-visible{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px var(--surface),0 0 0 5px var(--primary)}
.field [aria-invalid=true]{border-color:var(--primary);border-width:2px}
.field__error{margin:0;font-size:.9063rem;font-weight:600;color:var(--primary)}
.quote__foot{display:flex;flex-wrap:wrap;align-items:center;gap:1rem 1.5rem;margin-top:1.75rem}
.quote__note{margin:0;color:var(--muted)}
.form-result{margin-top:1.75rem;padding:1.25rem 1.4rem;background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--primary)}
.form-result:focus{outline:none}
.form-result:focus-visible{outline:3px solid var(--primary);outline-offset:3px}
.form-result__title{font-family:var(--font-heading);font-weight:var(--heading-weight);color:var(--heading);font-size:1.25rem;margin-bottom:.35rem}
.quote-aside{align-self:start;padding:1.75rem;background:var(--surface);border:1px solid var(--border)}
.quote-aside h2{font-size:1.375rem}
.quote-aside p{margin:0 0 .4rem}
.quote-aside__phone a{font-family:var(--font-heading);font-weight:var(--heading-weight);font-size:1.5rem;color:var(--heading);text-decoration:none}
.quote-aside__actions{display:flex;gap:.5rem;margin:.6rem 0 .9rem!important}
.quote-aside__note{margin-top:1rem!important;padding-top:1rem;border-top:1px solid var(--border);color:var(--muted)}
.cta{background:var(--hero-bg);color:var(--hero-text);padding:clamp(3.5rem,7vw,5.5rem) 0}
.cta h2{color:var(--hero-text);max-width:20ch}
.cta p{margin:0;max-width:34rem}
.cta__inner{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:2rem}
.cta__actions{display:flex;flex-wrap:wrap;align-items:center;gap:1rem 1.5rem}
.cta__phone{color:var(--hero-text);font-weight:600;white-space:nowrap}
.cta__phone:hover{color:var(--hero-text)}
.cta .btn--primary:hover{background:var(--hero-text);border-color:var(--hero-text);color:var(--hero-bg)}
.cta :focus-visible{outline-color:var(--hero-text)}
.foot{background:var(--surface);border-top:1px solid var(--border);padding:3rem 0 1.5rem;font-size:.9375rem}
.foot__grid{display:grid;gap:1.5rem 2rem;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))}
.foot__grid p{margin:0 0 .3rem}
.foot__name{font-family:var(--font-heading);font-weight:var(--heading-weight);color:var(--heading);font-size:1.125rem}
.foot__label{font-weight:600;color:var(--heading)}
.foot__nav{list-style:none;margin:0;padding:0;line-height:1.9}
.foot__note{margin-top:2rem;color:var(--muted);font-size:.8438rem}
.foot__note p{margin:0;padding-top:1.25rem;border-top:1px solid var(--border)}
.dock{display:none}
@media (min-width:48rem){
.stats__list{grid-template-columns:repeat(4,minmax(0,1fr))}
.cards,.checklist{grid-template-columns:repeat(2,minmax(0,1fr))}
.lane{grid-template-columns:minmax(14rem,1.1fr) minmax(0,2fr) var(--lane-meta,11rem);align-items:center}
.lane:not(:has(.lane__bar)){grid-template-columns:1fr auto}
.hero--compact .hero__inner{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)}
}
@media (min-width:60rem){
.split{grid-template-columns:minmax(0,1fr) minmax(0,2fr)}
.split .section__head{margin-bottom:0}
.feature{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.quote-grid{grid-template-columns:minmax(0,2fr) minmax(16rem,1fr)}
.quote-aside{position:sticky;top:1.5rem}
}
`;

const VARIANT_CSS: Record<HeroVariant, string> = {
  // established regional fleet: a newspaper-style masthead, editorial serif, a wide fleet photograph
  // and a lane explorer. warm paper, deep ink, rust used sparingly.
  split: `
.site--split{--h1:clamp(2.6rem,1.5rem + 4vw,5rem);--h2:clamp(1.8rem,1.3rem + 1.6vw,2.6rem)}
.site--split h1{letter-spacing:-.025em;line-height:1}
.site--split .top{background:var(--bg)}
.site--split .top__mast{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:1rem;padding-top:1.4rem;padding-bottom:1.1rem}
.site--split .top__mast .top__phone{justify-self:start;font-size:.9375rem}
.site--split .top__mast .top__quote{justify-self:end}
.site--split .logo{font-size:clamp(1.4rem,1.1rem + 1vw,2rem);letter-spacing:-.01em}
.site--split .logo__mark{width:.55rem;height:1.6rem;background:var(--primary)}
.site--split .top__navrow{border-top:1px solid var(--heading);border-bottom:1px solid var(--border)}
.site--split .nav ul{justify-content:center;gap:.25rem 2.2rem;padding:.35rem 0}
.site--split .nav a{font-size:.875rem;letter-spacing:.06em;text-transform:uppercase}
.site--split .hero--home{padding:clamp(2.5rem,5vw,4.5rem) 0 clamp(2.5rem,5vw,4rem)}
.site--split .hero__head{display:grid;gap:1.5rem 4rem;align-items:end;margin-bottom:clamp(2rem,4vw,3rem)}
.site--split .hero__head h1{margin:0}
.site--split .hero__side .lead{font-size:1.1875rem}
.site--split .hero__side .actions{margin-top:1.5rem}
.site--split .photo--wide .photo__frame{aspect-ratio:4/3}
.site--split .photo--wide img{object-position:30% 60%}
.site--split .hero--compact{text-align:center;border-bottom:1px solid var(--heading)}
.site--split .hero--compact .hero__inner{grid-template-columns:1fr;justify-items:center}
.site--split .hero--compact h1{margin-left:auto;margin-right:auto}
.site--split .hero--compact .lead{margin:0 auto}
.site--split .hero--compact .actions{justify-content:center;margin-top:1.5rem}
.site--split .stats{background:var(--surface);border-top:1px solid var(--border)}
.site--split .stat{padding-left:1.25rem;border-left:1px solid var(--border)}
.site--split .stat:nth-child(odd){border-left:0;padding-left:0}
.site--split .cards--index .cards{counter-reset:item}
.site--split .cards--index .card{counter-increment:item;display:grid;grid-template-columns:2.5rem minmax(0,1fr);column-gap:.75rem;border-top-color:var(--heading)}
.site--split .cards--index .card::before{content:counter(item);grid-row:span 2;font-family:var(--font-heading);font-size:1.75rem;line-height:1;color:var(--primary)}
.site--split .cards--index .card h3{font-size:1.3125rem}
.site--split .section--feature,.site--split .section--prose{background:var(--surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.site--split .section--prose .prose p:first-child{font-family:var(--font-heading);font-size:clamp(1.5rem,1.1rem + 1.2vw,2.1rem);line-height:1.3;color:var(--heading)}
.site--split .photo--feature .photo__frame{aspect-ratio:4/5;max-height:36rem}
.site--split .photo--feature img{object-position:35% 50%}
.site--split .feature__text .prose p:first-child{font-family:var(--font-heading);font-size:clamp(1.35rem,1.1rem + .8vw,1.75rem);line-height:1.35;color:var(--heading)}
.site--split .lx{display:grid;gap:1.5rem 3rem}
.site--split .lx__panel{display:none}
.site--split .lx--live .lx__panel{display:block}
.site--split .lx--live .lane{grid-template-columns:1fr;padding:0;border-bottom:1px solid var(--border)}
.site--split .lx--live .lane .lane__bar,.site--split .lx--live .lane .lane__meta{display:none}
.site--split .lx__pick{display:flex;width:100%;align-items:center;justify-content:space-between;gap:1rem;padding:1rem .75rem 1rem 0;font:inherit;text-align:left;background:none;border:0;cursor:pointer;color:var(--heading);transition:background-color .15s,padding .2s}
.site--split .lx__pick:hover{background:var(--surface)}
.site--split .lx__pick[aria-pressed=true]{padding-left:.9rem;background:var(--surface);box-shadow:inset 3px 0 0 var(--primary)}
.site--split .lx__pick-meta{font-family:var(--font-body);font-size:.875rem;color:var(--muted);white-space:nowrap}
.site--split .lx__panel{align-self:start;padding:2rem;background:var(--hero-bg);color:var(--hero-text)}
.site--split .lx__panel :focus-visible{outline-color:var(--hero-text)}
.site--split .lx__label{margin:0 0 .5rem;font-size:.8125rem;letter-spacing:.08em;text-transform:uppercase}
.site--split .lx__route{margin:0 0 1.5rem;font-family:var(--font-heading);font-weight:var(--heading-weight);font-size:clamp(1.6rem,1.2rem + 1.2vw,2.25rem);line-height:1.15;color:var(--hero-text)}
.site--split .lx__meta{margin:0 0 .75rem;font-size:1.125rem}
.site--split .lx__track{height:.5rem;background:rgba(255,255,255,.18);margin:0 0 .5rem}
.site--split .lx__fill{display:block;height:100%;background:var(--hero-text);transition:width .4s ease}
.site--split .lx__note{margin:0 0 1.5rem;font-size:.875rem}
@media (min-width:48rem){
.site--split .stat:nth-child(odd){border-left:1px solid var(--border);padding-left:1.25rem}
.site--split .stat:first-child{border-left:0;padding-left:0}
.site--split .photo--wide .photo__frame{aspect-ratio:2/1}
}
@media (min-width:60rem){
.site--split .hero__head{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)}
.site--split .lx{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.site--split .lx__panel{position:sticky;top:1.5rem}
}
@media (max-width:40rem){
.site--split .top__mast{grid-template-columns:1fr auto}
.site--split .top__mast .logo{grid-column:1/-1;grid-row:1;justify-self:center}
.site--split .nav ul{gap:.1rem 1.1rem}
.site--split .nav a{font-size:.8125rem}
}
`,
  // cold chain: utility bar, sticky working header, split hero with a framed photo, dense spec
  // grids, monospaced labels for operating data and expandable handling details
  band: `
.site--band{--wrap:78rem;--lane-meta:17rem;--h1:clamp(2.2rem,1.5rem + 2.4vw,3.5rem);--h2:clamp(1.5rem,1.2rem + 1vw,2.1rem);--h3:1.0625rem}
.site--band .eyebrow,.site--band .stat dt,.site--band .lanes__key,.site--band .credit,.site--band .req,.site--band .foot__label,.site--band .utility,.site--band .lanes-table thead,.site--band .cards--modules .card::before{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:500;letter-spacing:.02em}
.site--band .eyebrow{color:var(--primary);text-transform:uppercase;font-size:.75rem;letter-spacing:.1em}
.site--band .utility{background:var(--hero-bg);color:var(--hero-text);font-size:.75rem}
.site--band .utility a{color:var(--hero-text)}
.site--band .utility :focus-visible{outline-color:var(--hero-text)}
.site--band .utility__row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.25rem 1.5rem;padding-top:.45rem;padding-bottom:.45rem}
.site--band .utility p{margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1.25rem}
.site--band .utility .top__phone{color:var(--hero-text);font-weight:500}
.site--band .utility__dot{width:.5rem;height:.5rem;border-radius:50%;background:var(--accent)}
.site--band .top{position:sticky;top:0;z-index:20;background:var(--surface);border-bottom:1px solid var(--border)}
.site--band .top__bar{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 2rem;padding-top:.85rem;padding-bottom:.85rem}
.site--band .logo{margin-right:auto;font-size:1.15rem;letter-spacing:-.01em}
.site--band .logo__mark{width:1.1rem;height:1.1rem;border:2px solid var(--primary);border-radius:50%;box-shadow:inset 0 0 0 3px var(--surface),inset 0 0 0 10px var(--primary)}
.site--band .nav a{font-size:.9375rem}
.site--band .hero--home{padding:clamp(2.5rem,5vw,4rem) 0;border-bottom:1px solid var(--border)}
.site--band .hero__grid{display:grid;gap:2.5rem;align-items:center}
.site--band .hero__text h1{max-width:22ch}
.site--band .photo--framed .photo__frame{aspect-ratio:3/2;border:1px solid var(--border);padding:.5rem;background:var(--surface)}
.site--band .photo--framed img{object-position:40% 70%}
.site--band .hero--compact{background:var(--surface);border-top:0}
.site--band .stats{background:var(--surface)}
.site--band .stats__list{border-left:1px solid var(--border)}
.site--band .stat{padding:1.1rem 1.25rem;border-right:1px solid var(--border);border-bottom:1px solid var(--border)}
.site--band .stat dd{font-size:clamp(1.5rem,1.2rem + 1vw,2.1rem);font-weight:500;letter-spacing:-.02em}
.site--band .stat dt{font-size:.6875rem;text-transform:uppercase;letter-spacing:.08em}
.site--band .section{padding:clamp(3rem,6vw,4.5rem) 0;border-bottom:1px solid var(--border)}
.site--band .split{grid-template-columns:1fr}
.site--band .split .section__head{margin-bottom:1.75rem}
.site--band .cards--modules .cards{counter-reset:mod;gap:1rem;grid-template-columns:repeat(2,minmax(0,1fr))}
.site--band .cards--modules .card{counter-increment:mod;padding:1.1rem 1.15rem;border:1px solid var(--border);background:var(--surface);transition:border-color .2s,transform .2s,box-shadow .2s}
.site--band .cards--modules .card:hover{border-color:var(--primary);transform:translateY(-2px);box-shadow:0 8px 20px -14px var(--heading)}
.site--band .cards--modules .card::before{content:counter(mod,decimal-leading-zero);display:block;margin-bottom:.9rem;font-size:.75rem;color:var(--primary)}
.site--band .cards--modules .card p{margin:0;font-size:.9688rem}
.site--band .section--feature{background:var(--surface)}
.site--band .photo--feature .photo__frame{aspect-ratio:1/1;max-width:28rem;border:1px solid var(--border)}
.site--band .feature__list li{display:flex;gap:.75rem;font-size:.9688rem}
.site--band .feature__list li::before{content:"";flex:none;width:.5rem;height:.5rem;margin-top:.55rem;background:var(--primary)}
.site--band .section--accordion .acc{max-width:52rem}
.site--band .acc__item summary h3{font-size:1.0625rem}
.site--band .table-scroll{overflow-x:auto}
.site--band .lanes-table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;min-width:34rem}
.site--band .lanes-table thead{font-size:.6875rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);text-align:left}
.site--band .lanes-table th,.site--band .lanes-table td{padding:.85rem 1rem .85rem 0;border-bottom:1px solid var(--border);vertical-align:middle;text-align:left}
.site--band .lanes-table thead th{border-bottom:2px solid var(--heading);font-weight:500}
.site--band .lanes-table tbody th{font-weight:600;color:var(--heading)}
.site--band .lanes-table tbody tr{transition:background-color .15s}
.site--band .lanes-table tbody tr:hover{background:var(--surface)}
.site--band .lane__dist{width:40%}
.site--band .lane__dist .lane__bar{margin-top:.4rem;height:.35rem}
.site--band .lane__from,.site--band .lane__to{white-space:nowrap}
.site--band .lanes-table .lane__arrow{margin:0 .4rem}
.site--band .quote-aside{border-top:3px solid var(--primary)}
@media (min-width:48rem){
.site--band .stats__list{grid-template-columns:repeat(4,minmax(0,1fr))}
}
@media (min-width:60rem){
.site--band .cards--modules .cards:has(> :nth-child(4):last-child){grid-template-columns:repeat(4,minmax(0,1fr))}
.site--band .hero__grid{grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:3.5rem}
.site--band .split{grid-template-columns:minmax(0,1fr) minmax(0,2.5fr)}
.site--band .split .section__head{margin-bottom:0}
.site--band .feature{grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)}
}
@media (max-width:30rem){
.site--band .cards--modules .cards{grid-template-columns:1fr}
}
@media (max-width:40rem){
.site--band .utility__contact a:last-child{display:none}
.site--band .top{position:static}
.site--band .nav{order:3;flex-basis:100%}
.site--band .nav ul{gap:.1rem 1.1rem}
}
`,
  // owner-operator: full-bleed photo under a solid text block, condensed poster type, first-person
  // copy and a direct line to the driver on every screen
  stacked: `
.site--stacked{--lane-meta:9.5rem;--h1:clamp(2.9rem,1.4rem + 5.2vw,6rem);--h2:clamp(2.1rem,1.5rem + 2.4vw,3.4rem);--h3:1.5rem;--h1-compact:clamp(2.8rem,1.6rem + 4.6vw,5rem)}
.site--stacked h1,.site--stacked h2,.site--stacked h3,.site--stacked .logo,.site--stacked .stat dd,.site--stacked .lane__route,.site--stacked .foot__name,.site--stacked .form-result__title,.site--stacked .hero__card-phone a{text-transform:uppercase;letter-spacing:.005em}
.site--stacked h1{line-height:.9;letter-spacing:-.005em;margin-bottom:.35em}
.site--stacked h2{line-height:.95}
.site--stacked .top{background:var(--hero-bg)}
.site--stacked .top__bar{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 2rem;padding-top:.8rem;padding-bottom:.8rem}
.site--stacked .logo{margin-right:auto;font-size:1.5rem;color:var(--hero-text)}
.site--stacked .logo__mark{width:1.3rem;height:.4rem;background:var(--accent)}
.site--stacked .nav a{color:var(--hero-text)}
.site--stacked .nav a:hover{color:var(--hero-text)}
.site--stacked .nav a::after{background:var(--accent)}
.site--stacked .nav a[aria-current=page]{color:var(--hero-text)}
.site--stacked .top :focus-visible{outline-color:var(--hero-text)}
.site--stacked .top__call{font-size:1rem}
.site--stacked .top__call:hover{background:var(--hero-text);border-color:var(--hero-text);color:var(--hero-bg)}
.site--stacked .eyebrow{color:var(--primary)}
.site--stacked .hero--home{position:relative;background:var(--hero-bg)}
.site--stacked .photo--bleed .photo__frame{aspect-ratio:4/3}
.site--stacked .photo--bleed img{object-position:35% 60%}
.site--stacked .photo--bleed .credit{margin:0;padding:.4rem clamp(1.25rem,4vw,2.5rem) 3.75rem;background:var(--hero-bg);color:var(--hero-text);font-size:.6875rem}
.site--stacked .hero__overlay{position:relative;display:grid;gap:1.5rem;padding-bottom:clamp(2rem,4vw,3rem)}
.site--stacked .hero__block{background:var(--bg);padding:clamp(1.5rem,4vw,2.75rem);margin-top:-3rem}
.site--stacked .hero__block .lead{max-width:38rem}
.site--stacked .hero__card{align-self:end;background:var(--hero-bg);color:var(--hero-text);padding:1.5rem 1.6rem;border:1px solid var(--accent)}
.site--stacked .hero__card p{margin:0 0 .2rem}
.site--stacked .hero__card-title{font-size:.8125rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
.site--stacked .hero__card-phone a{font-family:var(--font-heading);font-weight:var(--heading-weight);font-size:2.25rem;line-height:1.1;color:var(--hero-text);text-decoration:none}
.site--stacked .hero__card-actions{display:flex;gap:.5rem;margin-top:1rem!important}
.site--stacked .hero__card :focus-visible{outline-color:var(--hero-text)}
.site--stacked .hero--compact{background:var(--hero-bg);border:0}
.site--stacked .hero--compact h1,.site--stacked .hero--compact .lead{color:var(--hero-text)}
.site--stacked .hero--compact .eyebrow{color:var(--hero-text)}
.site--stacked .hero--compact .btn--ghost{color:var(--hero-text);border-color:var(--hero-text)}
.site--stacked .hero--compact .btn--ghost:hover{background:var(--hero-text);color:var(--hero-bg)}
.site--stacked .hero--compact :focus-visible{outline-color:var(--hero-text)}
.site--stacked .hero--compact .btn--primary:hover{background:var(--hero-text);border-color:var(--hero-text);color:var(--hero-bg)}
.site--stacked .stats{background:var(--bg);border-bottom:4px solid var(--heading)}
.site--stacked .stat dd{font-size:clamp(2.2rem,1.5rem + 2.4vw,3.5rem)}
.site--stacked .section--feature .feature{align-items:start}
.site--stacked .photo--feature .photo__frame{aspect-ratio:3/2}
.site--stacked .feature__text .prose p:first-child{font-size:clamp(1.4rem,1.1rem + 1vw,1.875rem);line-height:1.35;color:var(--heading);font-weight:500}
.site--stacked .card{border-top:4px solid var(--heading);padding-top:1.25rem}
.site--stacked .cards--tabs .tabs__list{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1.25rem;padding:0}
.site--stacked .tabs__tab{font:600 1rem/1.2 var(--font-body);padding:.7rem 1.2rem;border:2px solid var(--heading);background:transparent;color:var(--heading);cursor:pointer;transition:background-color .15s,color .15s}
.site--stacked .tabs__tab:hover{background:var(--surface)}
.site--stacked .tabs__tab[aria-selected=true]{background:var(--heading);color:var(--bg)}
.site--stacked .cards--tabs .cards.is-tabbed{display:block}
.site--stacked .cards--tabs .cards.is-tabbed .card{border-top:0;padding:1.5rem;background:var(--surface);border-left:6px solid var(--primary)}
.site--stacked .cards--tabs .cards.is-tabbed .card h3{font-size:2rem}
.site--stacked .cards--tabs .cards.is-tabbed .card p{font-size:1.1875rem;color:var(--text)}
.site--stacked .lanes{border-top:4px solid var(--heading)}
.site--stacked .lane__route{font-size:1.5rem}
.site--stacked .lane__bar{height:.6rem}
.site--stacked .faq.acc{border-top:4px solid var(--heading)}
.site--stacked .acc__item summary h3{font-size:1.5rem}
.site--stacked .cta--direct{background:var(--primary)}
.site--stacked .cta--direct h2{font-size:clamp(2.4rem,1.6rem + 3vw,4rem)}
.site--stacked .cta--direct .cta__actions{gap:.75rem}
.site--stacked .cta--direct .btn--primary{background:var(--hero-bg);border-color:var(--hero-bg);color:var(--hero-text)}
.site--stacked .quote-aside{background:var(--hero-bg);color:var(--hero-text);border:0}
.site--stacked .quote-aside h2,.site--stacked .quote-aside__phone a,.site--stacked .quote-aside a{color:var(--hero-text)}
.site--stacked .quote-aside__note{color:var(--hero-text);border-top-color:var(--accent)}
.site--stacked .quote-aside .btn--primary{background:var(--hero-text);border-color:var(--hero-text);color:var(--hero-bg)}
.site--stacked .quote-aside .btn--ghost{border-color:var(--hero-text)}
.site--stacked .quote-aside :focus-visible{outline-color:var(--hero-text)}
.site--stacked .dock{position:fixed;left:0;right:0;bottom:0;z-index:25;display:grid;grid-template-columns:1fr 1fr 1.2fr;background:var(--hero-bg);border-top:1px solid var(--accent)}
.site--stacked .dock__item{display:flex;align-items:center;justify-content:center;min-height:3.25rem;color:var(--hero-text);font-weight:600;text-decoration:none;border-right:1px solid rgba(255,255,255,.15)}
.site--stacked .dock__item--primary{background:var(--primary);color:var(--on-primary);border:0}
.site--stacked .dock :focus-visible{outline-color:var(--hero-text);outline-offset:-4px}
.site--stacked .foot{padding-bottom:5rem}
@media (min-width:48rem){
.site--stacked .dock{display:none}
.site--stacked .foot{padding-bottom:1.5rem}
.site--stacked .photo--bleed .photo__frame{aspect-ratio:auto;height:min(78vh,46rem)}
.site--stacked .photo--bleed .credit{position:absolute;right:.75rem;top:.6rem;padding:.2rem .5rem}
.site--stacked .hero__overlay{grid-template-columns:minmax(0,1.7fr) minmax(16rem,1fr);align-items:end;margin-top:-14rem}
.site--stacked .hero__block{margin-top:0}
}
@media (max-width:47.99rem){
.site--stacked .top__call-number{display:none}
.site--stacked .nav{order:3;flex-basis:100%}
.site--stacked .nav ul{gap:.1rem 1.1rem}
}
`,
};

// entrance motion is added only after the script confirms it can reveal the content again, and
// never when the reader asks for reduced motion
const MOTION_CSS = `
.js-reveal [data-reveal]{opacity:0;transform:translateY(14px);transition:opacity .6s ease,transform .6s ease}
.js-reveal [data-reveal].is-in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}.photo:hover img{transform:none}.js-reveal [data-reveal]{opacity:1;transform:none}}
`;
