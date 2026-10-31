// progressive enhancement for the generated carrier sites. every page is complete without this
// script; it only adds the lane explorer, equipment tabs, quote prefill, form checks and a light
// entrance motion that is skipped for reduced motion.

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function reveal(): void {
  if (reduceMotion() || !('IntersectionObserver' in window)) return;
  const targets = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  // sections already on screen stay as they are, so nothing visible flickers on load
  const below = targets.filter((t) => t.getBoundingClientRect().top > window.innerHeight);
  if (below.length === 0) return;
  for (const t of targets) if (!below.includes(t)) t.classList.add('is-in');
  document.documentElement.classList.add('js-reveal');
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        observer.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  for (const t of below) observer.observe(t);
  // a fallback, so a missed observer callback can never leave content hidden
  window.setTimeout(() => targets.forEach((t) => t.classList.add('is-in')), 2500);
}

function laneExplorer(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-explorer]')) {
    const items = [...root.querySelectorAll<HTMLElement>('[data-lane]')];
    if (items.length === 0) continue;
    const quote = root.dataset.quote;
    const panel = document.createElement('div');
    panel.className = 'lx__panel';
    panel.setAttribute('aria-live', 'polite');
    const buttons: HTMLButtonElement[] = [];

    const show = (item: HTMLElement, index: number) => {
      buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
      const from = item.dataset.from ?? '';
      const to = item.dataset.to ?? '';
      panel.replaceChildren();
      const label = document.createElement('p');
      label.className = 'lx__label';
      label.textContent = 'Selected lane';
      const route = document.createElement('p');
      route.className = 'lx__route';
      route.textContent = `${from} to ${to}`;
      const meta = document.createElement('p');
      meta.className = 'lx__meta';
      meta.textContent = item.dataset.meta ?? '';
      const track = document.createElement('div');
      track.className = 'lx__track';
      track.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('span');
      fill.className = 'lx__fill';
      fill.style.width = item.dataset.width ?? '0%';
      track.append(fill);
      const note = document.createElement('p');
      note.className = 'lx__note';
      note.textContent = 'Bar shows this distance against the longest regular lane.';
      panel.append(label, route, meta, track, note);
      if (quote) {
        const link = document.createElement('a');
        link.className = 'btn btn--light';
        link.href = `${quote}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}#quote-form`;
        link.textContent = 'Request a quote for this lane';
        panel.append(link);
      }
    };

    items.forEach((item, index) => {
      const routeEl = item.querySelector('.lane__route');
      if (!routeEl) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lx__pick';
      const name = document.createElement('span');
      name.className = 'lane__route';
      name.innerHTML = routeEl.innerHTML;
      const meta = document.createElement('span');
      meta.className = 'lx__pick-meta';
      meta.textContent = item.dataset.meta ?? '';
      button.append(name, meta);
      button.addEventListener('click', () => show(item, index));
      routeEl.replaceWith(button);
      buttons.push(button);
    });
    root.append(panel);
    root.classList.add('lx--live');
    const first = items[0];
    if (first) show(first, 0);
  }
}

function tabs(): void {
  for (const list of document.querySelectorAll<HTMLElement>('[data-tabs]')) {
    const panels = [...list.querySelectorAll<HTMLElement>('[data-tab-panel]')];
    if (panels.length < 2) continue;
    const bar = document.createElement('div');
    bar.className = 'tabs__list';
    bar.setAttribute('role', 'tablist');
    const id = `tabs-${Math.random().toString(36).slice(2, 8)}`;
    const tabsEls = panels.map((panel, i) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'tabs__tab';
      tab.id = `${id}-tab-${i}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `${id}-panel-${i}`);
      tab.textContent = panel.querySelector('h3')?.textContent ?? `Item ${i + 1}`;
      panel.id = `${id}-panel-${i}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      bar.append(tab);
      return tab;
    });
    const select = (index: number, focus: boolean) => {
      tabsEls.forEach((t, i) => {
        const on = i === index;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = panels[i];
        if (panel) panel.hidden = !on;
      });
      if (focus) tabsEls[index]?.focus();
    };
    tabsEls.forEach((t, i) => {
      t.addEventListener('click', () => select(i, false));
      t.addEventListener('keydown', (e) => {
        const n = tabsEls.length;
        if (e.key === 'ArrowRight') select((i + 1) % n, true);
        else if (e.key === 'ArrowLeft') select((i - 1 + n) % n, true);
        else if (e.key === 'Home') select(0, true);
        else if (e.key === 'End') select(n - 1, true);
        else return;
        e.preventDefault();
      });
    });
    list.parentElement?.insertBefore(bar, list);
    list.classList.add('is-tabbed');
    select(0, false);
  }
}

const messages = {
  valueMissing: 'Fill in this field.',
  typeMismatch: 'Enter an email address, for example name@example.com.',
};

function fieldError(control: Control): string {
  if (control.validity.valueMissing) return messages.valueMissing;
  if (control.validity.typeMismatch) return messages.typeMismatch;
  return '';
}

function show(control: Control, text: string): void {
  const error = document.getElementById(`${control.id}-error`);
  if (!error) return;
  error.textContent = text;
  error.hidden = text === '';
  if (text) {
    control.setAttribute('aria-invalid', 'true');
    control.setAttribute('aria-describedby', error.id);
  } else {
    control.removeAttribute('aria-invalid');
    control.removeAttribute('aria-describedby');
  }
}

function quoteForms(): void {
  const params = new URLSearchParams(window.location.search);
  for (const form of document.querySelectorAll<HTMLFormElement>('form[data-demo-form]')) {
    const controls = [...form.querySelectorAll<Control>('input, select, textarea')];
    const fields = form.querySelector<HTMLElement>('.quote__fields');
    const foot = form.querySelector<HTMLElement>('.quote__foot');
    const result = form.querySelector<HTMLElement>('.form-result');

    // a lane picked in the lane explorer arrives as from and to, so the owner does not retype it
    const from = params.get('from');
    const to = params.get('to');
    const pickup = form.querySelector<HTMLInputElement>('#q-pickup');
    const delivery = form.querySelector<HTMLInputElement>('#q-delivery');
    const note = form.querySelector<HTMLElement>('[data-prefill-note]');
    if (from && to && pickup && delivery && note) {
      pickup.value = from.slice(0, 80);
      delivery.value = to.slice(0, 80);
      note.textContent = `Lane filled in from the lane explorer: ${pickup.value} to ${delivery.value}. You can change it.`;
      note.hidden = false;
    }

    // once a field has shown an error, clear it as soon as the input becomes valid
    for (const control of controls) {
      control.addEventListener('input', () => {
        if (control.getAttribute('aria-invalid') === 'true') show(control, fieldError(control));
      });
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const invalid = controls.filter((c) => {
        const text = fieldError(c);
        show(c, text);
        return text !== '';
      });
      if (invalid.length > 0) {
        invalid[0]?.focus();
        return;
      }
      if (fields) fields.hidden = true;
      if (foot) foot.hidden = true;
      if (!result) return;
      result.hidden = false;
      result.focus();
    });

    form.querySelector('[data-form-edit]')?.addEventListener('click', () => {
      if (fields) fields.hidden = false;
      if (foot) foot.hidden = false;
      if (result) result.hidden = true;
      controls[0]?.focus();
    });
  }
}

export function enhanceSite(): void {
  laneExplorer();
  tabs();
  quoteForms();
  reveal();
}
