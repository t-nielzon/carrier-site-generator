# Carrier Site Generator

Generates small multi-page websites for trucking carriers from typed business inputs, then checks every page before it is published.

**Live demo:** https://work.nielzontolentino.com/carrier-sites/

Three fictional carriers are included: Henley Ridge Freight (dry van, Atlanta area), Larkspur Cold Lines (reefer, Dallas area) and Ocotillo Ridge Flatbed (flatbed, Phoenix). Each one gets a five-page site: home, services, lanes, quote and FAQ, plus JSON-LD and a sitemap.

The model step is recorded. The site specs a model would write are stored as JSON fixtures and replayed, so the demo is deterministic, makes no network calls and needs no API keys. Everything after that step (validation, rendering, checks, sitemaps) is real code that runs on every build.

## How the pipeline works

A run moves through eight stages:

| Stage | What happens |
|-|-|
| read | Load the carrier's typed inputs: fleet, equipment, lanes, credentials, hours, contact details. |
| plan | Plan the pages and what each one needs to say. |
| write | Produce the site spec: page copy, design tokens, photo picks and structured data. In this demo the spec is a recorded fixture. |
| schema | Validate the spec shape, the same way a live model response would be validated. |
| render | Render each page to HTML from the spec. Rendering is a pure function, so the checks inspect exactly what ships. |
| checks | Run the page checks on the rendered HTML. |
| grounding | Map every number and claim in the copy back to an input field. |
| publish | Publish only if every check passes. |

The checks are grouped as follows:

- **Structure**: valid spec, one H1 per page, heading order, internal links, sitemap entries.
- **SEO**: title and meta description lengths, local keyword placement, head tags, and JSON-LD that is parsed and compared with the page.
- **Accessibility**: alt text on every image, and colour contrast for sampled text and background pairs.
- **Grounding**: every number on a page (fleet size, miles, years) must match an input field, and claim words such as "insured", "certified" or "award-winning" must be backed by an input fact.

Henley Ridge includes a staged first draft that fails the checks on purpose. It states numbers and claims the inputs do not support and misses some SEO rules. The demo shows each failure, the before and after for each fix, and the rewrite that passes.

Photos come from a small licensed library. A spec picks a photo by id and writes its own alt text; it cannot supply a URL, so a site can only show vetted images.

## Routes

- `/` is the generator workspace.
- `/carrier-sites/<slug>/` is a generated carrier site, for example `/carrier-sites/henley-ridge-freight/`. Each site also has `services/`, `lanes/`, `quote/`, `faq/` and `sitemap.xml`.
- `/carrier-sites/` redirects to `/`.

Canonical URLs, sitemaps and JSON-LD use the live demo host, set as `SITE_ORIGIN` in `src/carrier/render.ts`. To deploy somewhere else, change it together with the `url` field in each recorded spec; the JSON-LD check fails if the two disagree.

## Project layout

```
src/
  carrier/
    types.ts          input and site spec types
    inputs.ts         the fictional carriers' business inputs
    fixtures/         recorded site specs, one file per run
    recorded.ts       the recorded runs, planning notes and the staged draft
    validate.ts       spec validation
    render.ts         spec to HTML, head tags, JSON-LD and sitemap
    site-css.ts       stylesheet for the generated sites, driven by design tokens
    site-client.ts    small progressive enhancements on the generated sites
    media.ts          the licensed photo library
    checks.ts         the checks
    demo.ts           builds the replay data for the generator page at build time
  components/carrier/ the generator workspace (Preact)
  layouts/            page shell for the generator, and the generated sites' own layout
  pages/              the generator at index.astro, carrier sites under carrier-sites/
public/
  carrier-media/      stock photos (see CREDITS.md)
  carrier-shots/      screenshots of the built carrier home pages
tests/                checks and rendering tests
scripts/              screenshot capture
```

## Run locally

Requires Node 24.

```sh
npm install
npm run dev        # dev server at http://localhost:4321
npm run build      # static site in dist/
npm run preview    # serve the built site
npm run check      # astro and typescript checks
```

## Tests

```sh
npm test
```

The tests run the real checks against the recorded specs. They confirm that every published site passes, that the staged draft fails for the expected reasons, and that the checks catch broken headings, unsupported numbers, unsupported claims, missing alt text and low contrast.

## Add a carrier

1. Add the business inputs to `src/carrier/inputs.ts`. Use invented details: phone numbers in the 555-01xx range and emails at example.com.
2. Add a site spec to `src/carrier/fixtures/<id>.run1.json`. The existing fixtures show the shape, and `src/carrier/types.ts` defines it.
3. Register the run in `src/carrier/recorded.ts`.
4. If the site needs a new photo, add the files to `public/carrier-media/`, register them in `src/carrier/media.ts` and credit them in `CREDITS.md`.
5. Add the carrier to the list in `src/pages/index.astro`.
6. Run `npm test`. Fix the spec until every check passes.
7. Optionally refresh the screenshots. Add the slug to `scripts/screenshots.mjs`, then run:

   ```sh
   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core npm run screenshots
   ```

   Playwright is not a project dependency, to keep installs small.

## Credits

Photos are licensed stock from Pexels and Wikimedia Commons, and the fonts are self-hosted through Fontsource. Authors, sources and licenses are listed in [CREDITS.md](CREDITS.md). All carriers, people, addresses, phone numbers, emails and lanes are fictional, and the photos do not show them.

## License

The code and documentation are released under the [MIT License](LICENSE). The photos in `public/carrier-media/` are not covered by it; they stay under their own licenses, as described in [NOTICE](NOTICE) and [CREDITS.md](CREDITS.md).
