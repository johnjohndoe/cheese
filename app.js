// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 The Cheese contributors
(() => {
  'use strict';

  // ---------- Data model (cheese.json) ----------
  // Each entry: { dairy, name, info, milk_type, milk_treatment, edible_rind: true|false|null }
  function normMilk(s) {
    s = (s || '').trim().toLowerCase();
    if (!s) return '';
    if (s.startsWith('roh')) return 'Rohmilch';
    if (s.startsWith('past')) return 'Pasteurisiert';
    if (s.startsWith('therm')) return 'Thermisiert';
    return s;
  }
  const ANIMALS = ['Kuh', 'Schaf', 'Ziege', 'Büffel'];
  function animalsOf(s) {
    return ANIMALS.filter(a => (s || '').toLowerCase().includes(a.toLowerCase()));
  }
  const fold = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const str = v => (v == null ? '' : String(v).trim());

  function toCheeses(entries) {
    const list = entries
      .filter(e => e && str(e.name))
      .map(e => {
        const c = {
          dairy: str(e.dairy),
          name: str(e.name),
          info: str(e.info),
          type: str(e.milk_type),
          animals: animalsOf(e.milk_type),
          milk: normMilk(e.milk_treatment),
          rind: e.edible_rind === true ? 'ja' : e.edible_rind === false ? 'nein' : 'unbekannt',
        };
        c.search = fold([c.name, c.dairy, c.info, c.type, c.milk].join(' '));
        return c;
      });
    const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true });
    return list.sort((a, b) => collator.compare(a.name, b.name));
  }

  // ---------- State & DOM ----------
  const $ = id => document.getElementById(id);
  const els = {
    search: $('search'), clear: $('clear'), list: $('list'), empty: $('empty'),
    count: $('count'), filters: $('filters'), openFilters: $('open-filters'), apply: $('apply'),
    badge: $('filter-badge'), reset: $('reset'), az: $('az'),
  };
  const state = { q: '', animal: new Set(), milk: new Set(), rind: new Set() };
  let cheeses = [];

  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function highlight(text, terms) {
    if (!terms.length) return esc(text);
    // match on folded text, map back to original positions (same length for NFD-stripped Latin chars is not guaranteed, so do char-wise)
    const chars = [...text];
    const folded = chars.map(ch => fold(ch));
    const flat = folded.join('');
    const hit = new Array(flat.length).fill(false);
    for (const t of terms) {
      let i = flat.indexOf(t);
      while (i !== -1) { for (let k = i; k < i + t.length; k++) hit[k] = true; i = flat.indexOf(t, i + 1); }
    }
    let out = '', pos = 0, open = false;
    chars.forEach((ch, idx) => {
      const len = folded[idx].length || 1;
      const on = hit.slice(pos, pos + len).some(Boolean);
      if (on && !open) { out += '<mark>'; open = true; }
      if (!on && open) { out += '</mark>'; open = false; }
      out += esc(ch);
      pos += folded[idx].length;
    });
    return open ? out + '</mark>' : out;
  }

  function letterOf(name) {
    const ch = fold(name).charAt(0).toUpperCase();
    return /[A-Z]/.test(ch) ? ch : '#';
  }

  function matches(c, terms, skip) {
    if (terms.length && !terms.every(t => c.search.includes(t))) return false;
    if (skip !== 'animal' && state.animal.size && !c.animals.some(a => state.animal.has(a))) return false;
    if (skip !== 'milk' && state.milk.size && !state.milk.has(c.milk || 'unbekannt')) return false;
    if (skip !== 'rind' && state.rind.size && !state.rind.has(c.rind)) return false;
    return true;
  }

  // ---------- Filters ----------
  const FILTERS = {
    // `exclusive`: lists of values of which only one may be active at a time
    animal: { values: ANIMALS, get: c => c.animals },
    milk: { values: ['Rohmilch', 'Thermisiert', 'Pasteurisiert', 'unbekannt'], get: c => [c.milk || 'unbekannt'] },
    rind: { values: ['ja', 'nein', 'unbekannt'], get: c => [c.rind], exclusive: [['ja', 'nein']] },
  };

  function renderChips(terms) {
    for (const [key, f] of Object.entries(FILTERS)) {
      const box = els.filters.querySelector(`.group[data-key="${key}"] .chips`);
      const pool = cheeses.filter(c => matches(c, terms, key));
      box.innerHTML = f.values
        .map(v => ({ v, n: pool.filter(c => f.get(c).includes(v)).length, all: cheeses.some(c => f.get(c).includes(v)) }))
        .filter(x => x.all)
        .map(({ v, n }) => `<button type="button" class="chip" data-key="${key}" data-value="${esc(v)}" aria-pressed="${state[key].has(v)}">${esc(v[0].toUpperCase() + v.slice(1))}<span class="n">${n}</span></button>`)
        .join('');
    }
    const active = state.animal.size + state.milk.size + state.rind.size;
    els.badge.hidden = !active;
    els.badge.textContent = active;
    els.openFilters.classList.toggle('active', active > 0);
    els.openFilters.setAttribute('aria-label', active ? `Filter, ${active} aktiv` : 'Filter');
  }

  // ---------- Render ----------
  function render() {
    const terms = fold(state.q).split(/\s+/).filter(Boolean);
    const shown = cheeses.filter(c => matches(c, terms));
    renderChips(terms);

    let html = '', current = '';
    const letters = new Set();
    for (const c of shown) {
      const L = letterOf(c.name);
      if (L !== current) {
        // One <section> per letter: keeps each sticky heading inside its own group,
        // so earlier headings don't stay pinned (which broke jumping upwards)
        if (current) html += '</section>';
        current = L; letters.add(L);
        html += `<section class="letter-group" id="L-${L}" aria-labelledby="H-${L}"><h3 class="letter" id="H-${L}">${L}</h3>`;
      }
      const tags = [];
      if (c.type) tags.push(`<span class="tag">${esc(c.type)}</span>`);
      if (c.milk) tags.push(`<span class="tag">${esc(c.milk)}</span>`);
      if (c.rind === 'ja') tags.push('<span class="tag yes">Rinde essbar</span>');
      if (c.rind === 'nein') tags.push('<span class="tag no">Rinde nicht essbar</span>');
      html += `<article class="card">
        <h2>${highlight(c.name, terms)}</h2>
        ${c.dairy ? `<div class="dairy">${highlight(c.dairy, terms)}</div>` : ''}
        ${c.info ? `<p class="info">${highlight(c.info, terms)}</p>` : ''}
        <div class="tags">${tags.join('')}</div>
      </article>`;
    }
    if (current) html += '</section>';
    els.list.innerHTML = html;
    els.empty.hidden = shown.length > 0;
    els.count.textContent = shown.length === cheeses.length ? `${cheeses.length} Käse` : `${shown.length} von ${cheeses.length}`;
    els.apply.textContent = shown.length ? `${shown.length} Käse anzeigen` : 'Keine Treffer';

    const all = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
    const used = all.filter(l => cheeses.some(c => letterOf(c.name) === l));
    els.az.innerHTML = used.map(l => `<a href="#L-${l}" class="${letters.has(l) ? '' : 'off'}">${l}</a>`).join('');
  }

  // ---------- Events ----------
  let t;
  els.search.addEventListener('input', () => {
    els.clear.hidden = !els.search.value;
    clearTimeout(t);
    t = setTimeout(() => { state.q = els.search.value; render(); window.scrollTo({ top: 0 }); }, 80);
  });
  els.clear.addEventListener('click', () => {
    els.search.value = ''; state.q = ''; els.clear.hidden = true; render(); els.search.focus();
  });
  // ---------- Filter bottom sheet ----------
  const sheet = els.filters;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function openSheet() {
    sheet.classList.remove('closing');
    sheet.style.transform = '';
    sheet.showModal();
    document.documentElement.classList.add('sheet-open');
  }
  function closeSheet() {
    if (!sheet.open || sheet.classList.contains('closing')) return;
    sheet.classList.add('closing');
    setTimeout(() => sheet.close(), reducedMotion.matches ? 0 : 200);
  }
  sheet.addEventListener('close', () => {
    sheet.classList.remove('closing');
    sheet.style.transform = '';
    document.documentElement.classList.remove('sheet-open');
  });
  sheet.addEventListener('cancel', e => { e.preventDefault(); closeSheet(); }); // Esc
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); }); // tap on scrim
  els.openFilters.addEventListener('click', openSheet);
  els.apply.addEventListener('click', closeSheet);

  // Swipe down on the handle/title area to dismiss
  const grab = sheet.querySelector('.sheet-grab');
  let dragStart = null, dragDy = 0;
  grab.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    dragStart = e.clientY; dragDy = 0;
    grab.setPointerCapture(e.pointerId);
    sheet.classList.add('dragging');
  });
  grab.addEventListener('pointermove', e => {
    if (dragStart === null) return;
    dragDy = Math.max(0, e.clientY - dragStart);
    sheet.style.transform = `translateY(${dragDy}px)`;
  });
  const endDrag = () => {
    if (dragStart === null) return;
    dragStart = null;
    sheet.classList.remove('dragging');
    if (dragDy > 80) closeSheet();
    else sheet.style.transform = '';
  };
  grab.addEventListener('pointerup', endDrag);
  grab.addEventListener('pointercancel', endDrag);

  els.filters.addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const key = b.dataset.key, set = state[key], v = b.dataset.value;
    if (set.has(v)) set.delete(v);
    else {
      for (const grp of FILTERS[key].exclusive || []) {
        if (grp.includes(v)) grp.forEach(o => set.delete(o));
      }
      set.add(v);
    }
    render();
  });
  els.reset.addEventListener('click', () => {
    state.animal.clear(); state.milk.clear(); state.rind.clear(); render();
  });

  // A–Z rail: support tap and finger-drag scrubbing
  function jumpTo(a) {
    if (!a || a.parentElement !== els.az || a.classList.contains('off')) return;
    document.getElementById(a.getAttribute('href').slice(1))?.scrollIntoView({ block: 'start' });
  }
  function jumpFromPoint(x, y) {
    const a = document.elementFromPoint(x, y);
    // Highlight the letter under the finger while scrubbing
    els.az.querySelectorAll('.touching').forEach(el => el !== a && el.classList.remove('touching'));
    if (a && a.parentElement === els.az && !a.classList.contains('off')) a.classList.add('touching');
    jumpTo(a);
  }
  const clearTouching = () => els.az.querySelectorAll('.touching').forEach(el => el.classList.remove('touching'));
  els.az.addEventListener('touchend', clearTouching);
  els.az.addEventListener('touchcancel', clearTouching);
  els.az.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault(); // no #hash entries in the browser history
    jumpTo(a);
  });
  els.az.addEventListener('touchmove', e => { const p = e.touches[0]; jumpFromPoint(p.clientX, p.clientY); e.preventDefault(); }, { passive: false });

  function updateHeaderHeight() {
    document.documentElement.style.setProperty('--header-h', document.querySelector('.top').offsetHeight + 'px');
  }
  window.addEventListener('resize', updateHeaderHeight);
  // Header height can change, e.g. when the title row wraps
  if ('ResizeObserver' in window) new ResizeObserver(updateHeaderHeight).observe(document.querySelector('.top'));

  // ---------- Theme: system → light → dark ----------
  const ICONS = {
    system: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18V4a8 8 0 0 1 0 16Z"/></svg>',
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM11 1h2v3h-2zm0 19h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zm12.1 12.1 1.4-1.4 2.1 2.1-1.4 1.4zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.3 2a10 10 0 1 0 9.7 12.6A8 8 0 0 1 12.3 2Z"/></svg>',
  };
  const LABELS = { system: 'Systemeinstellung', light: 'Hell', dark: 'Dunkel' };
  const NEXT = { system: 'light', light: 'dark', dark: 'system' };
  const themeBtn = $('theme');
  function applyTheme(mode) {
    if (mode === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
    themeBtn.innerHTML = ICONS[mode];
    themeBtn.setAttribute('aria-label', `Farbschema: ${LABELS[mode]} (tippen zum Wechseln)`);
    themeBtn.title = `Farbschema: ${LABELS[mode]}`;
    try { mode === 'system' ? localStorage.removeItem('theme') : localStorage.setItem('theme', mode); } catch (_) {}
  }
  themeBtn.addEventListener('click', () => applyTheme(NEXT[document.documentElement.dataset.theme || 'system']));
  applyTheme(document.documentElement.dataset.theme || 'system');

  // ---------- Load data from cheese.json ----------
  async function load() {
    try {
      const res = await fetch('cheese.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      cheeses = toCheeses(await res.json());
    } catch (err) {
      els.empty.hidden = false;
      els.empty.textContent = location.protocol === 'file:'
        ? 'Die Daten können nicht direkt aus der Datei geladen werden. Bitte die Seite über einen Webserver öffnen (z. B. „python3 -m http.server“ im Ordner).'
        : `cheese.json konnte nicht geladen werden (${err.message}).`;
      updateHeaderHeight();
      return;
    }
    render();
    updateHeaderHeight();
  }
  load();
})();
