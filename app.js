import { recipes, groceryGroups } from './data.js';
import {
  blankState, loadState, saveState, parseState, storageKey, legacyKey, restoreKey, newId, newPlan,
  byId, sports, muscles, intensities, sizes, textures, phases, maxPortions, localDate, planError, timing,
  formatTime, formatNumber, formatPortions, formatIngredient, scaleNutrition, searchRecipes,
  groceryRows, setGroceryPortions, shoppingText, sportAdvice
} from './core.js';

const main = document.querySelector('main');
const nav = document.querySelector('nav');
const toast = document.querySelector('#toast');
const issues = { read: '', write: '' };
let db = blankState();
let initialized = false;
let current = { name: 'home', id: null };
let activePlan;
let recipeBack = '#recipes';
let recipePlanContext;
let portions = {};
let groceryView = 'all';
let catalogue = { query: '', filter: 'all', sort: 'taste' };
let toastTimer;
let pendingWorker;

const icons = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
  book: '<path d="M3 5c3-2 6-2 9 0 3-2 6-2 9 0v15c-3-2-6-2-9 0-3-2-6-2-9 0ZM12 5v15"/>',
  basket: '<path d="M2 10h20l-2.2 9a2 2 0 0 1-2 1.5H6.2a2 2 0 0 1-2-1.5ZM7 10l3-6m7 6-3-6M9 14v3m6-3v3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2"/>',
  settings: '<circle cx="12" cy="8" r="3.3"/><path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/>',
  heart: '<path d="M20.8 5.9a4.7 4.7 0 0 0-6.6 0L12 8.1 9.8 5.9a4.7 4.7 0 0 0-6.6 6.6L12 21l8.8-8.5a4.7 4.7 0 0 0 0-6.6Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  back: '<path d="m14 6-6 6 6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none"
  stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
document.querySelector('#header-profile').innerHTML = icon('settings');
const navItems = [
  ['home', 'home', 'Vandaag'], ['recipes', 'book', 'Recepten'], ['grocery', 'basket', 'Boodschappen'],
  ['agenda', 'calendar', 'Agenda'], ['profile', 'settings', 'Profiel']
];
const filters = [
  ['all', 'Alles'], ['hartig', 'Hartig'], ['zoet', 'Zoet'], ['quick', 'Binnen 5 min'],
  ['protein', '20 g eiwit of meer'], ['favorites', 'Favorieten']
];
const sorts = [['taste', 'Voor jou'], ['minutes', 'Snelste eerst'], ['protein', 'Meeste eiwit'], ['name', 'Naam A–Z']];
const dateLong = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
const dateShort = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
const dateLabel = date => dateShort.format(new Date(date + 'T12:00:00'));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const cap = value => value ? value[0].toUpperCase() + value.slice(1) : '';
const attrChecked = value => value ? ' checked' : '';
const selected = value => value ? ' selected' : '';
const disabled = value => value ? ' disabled' : '';
const planById = id => db.plans.find(plan => plan.id === id);
const options = (items, value) => items.map(([key, title]) => `<option value="${escapeHtml(key)}"${selected(key === value)}>${escapeHtml(title)}</option>`).join('');
const box = (name, text, checked) => `<label class="checkbox"><input type="checkbox" name="${name}"${attrChecked(checked)}>${text}</label>`;
const primaryLink = (href, label, symbol) => `<a href="${href}" class="button primary">${symbol ? icon(symbol) : ''}${label}</a>`;
const button = (action, label, data = '', cls = '') => `<button type="button" class="button ${cls}" data-action="${action}" ${data}>${label}</button>`;
const empty = (title, message, action = '') => `<div class="empty"><h2>${title}</h2><p>${message}</p>${action}</div>`;
const section = (title, href, label) => `<div class="section-head"><h2>${title}</h2>${href ? `<a href="${href}">${label}</a>` : ''}</div>`;
const heading = (title, subtitle = '') => `<div class="page-heading"><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div>`;
const sortedPlans = () => [...db.plans].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
const nutritionNote = 'Geschat voor deze portie. Merken en gebruikte hoeveelheden kunnen de waarden veranderen.';
const allergenNote = 'Controleer de verpakking op hazelnoot en andere allergenen, ook bij whey, wraps en beleg. Let op waarschuwingen voor kruisbesmetting.';

function announce(message) {
  toast.hidden = false;
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4300);
}

function refreshState() {
  try {
    db = loadState(localStorage);
    issues.read = '';
  } catch (error) {
    if (error.name === 'SecurityError') {
      issues.read = '';
      issues.write = 'Lokale opslag is geblokkeerd. Wijzigingen blijven in deze sessie beschikbaar. Exporteer een back-up.';
    } else {
      issues.read = 'De opgeslagen gegevens konden niet worden gelezen. Download het oorspronkelijke bestand via Profiel vóór je een back-up herstelt.';
    }
  }
}

function update(change, message) {
  if (!issues.write) refreshState();
  if (issues.read) {
    announce(issues.read);
    return false;
  }
  if (change(db) === false) return false;
  try {
    saveState(localStorage, db);
    issues.write = '';
  } catch {
    issues.write = 'Wijzigingen zijn alleen in deze sessie beschikbaar. Exporteer eerst een back-up.';
    announce(issues.write);
  }
  if (message && !issues.write) announce(message);
  return true;
}

function storageNotice() {
  return issues.read || issues.write ?
    `<div class="notice" role="alert">${escapeHtml(issues.read || issues.write)} <a href="#profile">Naar Profiel</a></div>` : '';
}

function route() {
  const [name, id] = location.hash.slice(1).split('/');
  if (name === 'main') return current;
  if (name === 'recipe' && id !== undefined && byId.has(Number(id))) return { name, id: Number(id) };
  if (['home', 'recipes', 'grocery', 'agenda', 'profile', 'food', 'edit'].includes(name)) return { name, id };
  return { name: 'home', id: null };
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function render({ focus = false, actionFocus = null } = {}) {
  let selectedTab = current.name;
  if (selectedTab === 'recipe') selectedTab = 'recipes';
  if (['food', 'edit'].includes(selectedTab)) selectedTab = 'agenda';
  const count = groceryRows(db.grocery).filter(item => !item.checked).length;
  nav.innerHTML = `<div class="nav-inner">${navItems.map(([name, glyph, label]) =>
    `<a href="#${name}"${name === selectedTab ? ' aria-current="page"' : ''}>${icon(glyph)}
    ${name === 'grocery' && count ? `<span class="nav-count" aria-hidden="true">${count}</span>` : ''}
    <span>${label}</span></a>`).join('')}</div>`;
  const views = { home, recipes: catalogueView, recipe: recipeView, grocery, agenda, food, edit, profile };
  main.innerHTML = storageNotice() + views[current.name]();
  document.title = (main.querySelector('h1')?.textContent || 'Vandaag') + ' · SnackLab';
  if (focus) {
    scrollTo(0, 0);
    main.focus({ preventScroll: true });
  } else if (actionFocus) {
    const { action, id, phase, n, key } = actionFocus;
    const same = [...main.querySelectorAll('[data-action]')].find(el => {
      const d = el.dataset;
      return d.action === action && d.id === id && d.phase === phase && d.n === n && d.key === key;
    });
    if (same && !same.disabled) same.focus({ preventScroll: true });
  }
}

function photo(recipe, { priority = false, cls = '' } = {}) {
  return `<img class="${cls}" src="${recipe.image}" alt="" width="480" height="480"
    ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

function favourite(recipe) {
  const marked = db.favorites.includes(recipe.id);
  return `<button type="button" class="favorite${marked ? ' marked' : ''}" data-action="favorite" data-id="${recipe.id}"
    aria-label="Favoriet: ${escapeHtml(recipe.name)}" aria-pressed="${marked}">${icon('heart')}</button>`;
}

function recipeCard(recipe) {
  const meta = `${recipe.minutes} min · ${recipe.protein} g eiwit`;
  return `<article class="recipe-card">
    <a href="#recipe/${recipe.id}" class="recipe-card-link" data-recipe-link>
      ${photo(recipe)}
      <div class="recipe-copy"><h3>${escapeHtml(recipe.name)}</h3><p>${meta}</p></div>
    </a>${favourite(recipe)}
  </article>`;
}

function home() {
  const filtered = searchRecipes(db);
  const personalized = db.favorites.length || db.preferences.taste !== 'alles' || db.preferences.texture ||
    Object.values(db.ratings).some(rating => rating > 0);
  const featured = personalized ? filtered[0] : byId.get(22);
  const suggestions = personalized ? filtered.filter(recipe => recipe !== featured).slice(0, 4) :
    [20, 6, 21, 5].map(id => byId.get(id));
  const today = localDate();
  const plans = sortedPlans();
  const todayPlans = plans.filter(plan => plan.date === today);
  const next = plans.find(plan => plan.date > today && !plan.done);
  const shown = todayPlans.length ? todayPlans : next ? [next] : [];
  return `<div class="page-heading intro"><p class="date-label">${cap(dateLong.format(new Date()))}</p><h1>Vandaag</h1></div>
    <article class="hero">
      <div class="hero-copy"><span class="eyebrow">${personalized ? 'Voor jou' : 'Receptsuggestie'}</span>
        <h2>${escapeHtml(featured.name)}</h2>
        <p>${icon('clock')} ${featured.minutes} min <span>·</span> ${featured.protein} g eiwit</p>
        ${primaryLink('#recipe/' + featured.id, 'Bekijk recept')}
      </div><div class="hero-photo">${photo(featured, { priority: true, cls: 'hero-image' })}</div>
    </article>
    <section class="block">${section('Snacks om te proberen', '#recipes', 'Alle recepten')}
      <div class="recipe-grid home-grid">${suggestions.map(recipeCard).join('')}</div>
    </section>
    <section class="block">${section(todayPlans.length ? 'Training vandaag' : 'Je volgende training', '#agenda', 'Naar agenda')}
    ${shown.length ? shown.map(planCard).join('') :
      empty('Nog geen training gepland', 'Plan een training om snacks vóór en na het sporten te kiezen.', primaryLink('#edit', 'Training plannen', 'plus'))}</section>`;
}

function catalogueView() {
  return heading('Recepten', 'Zoek op recept, ingrediënt of smaak.') +
    `<div class="catalogue-bar">
      <label class="search-box">${icon('search')}<span class="sr-only">Zoek een snack</span>
      <input id="recipe-search" type="search" placeholder="Zoek een snack" value="${escapeHtml(catalogue.query)}" autocomplete="off"></label>
      <label class="sort-label"><span class="sr-only">Sorteer recepten</span><select id="recipe-sort">${options(sorts, catalogue.sort)}</select></label>
    </div>
    <div class="filters" aria-label="Receptfilters">
      ${filters.map(([key, title]) => `<button type="button" class="chip" data-action="filter" data-id="${key}" aria-pressed="${key === catalogue.filter}">${title}</button>`).join('')}
    </div>
    <p class="result-count" id="result-count" aria-live="polite"></p>
    <div id="recipe-results" class="recipe-grid"></div>`;
}

function catalogueResults() {
  const result = document.getElementById('recipe-results');
  if (!result) return;
  const found = searchRecipes(db, catalogue);
  document.getElementById('result-count').textContent = found.length + (found.length === 1 ? ' recept' : ' recepten');
  result.innerHTML = found.length ? found.map(recipeCard).join('') :
    empty(catalogue.filter === 'favorites' && !catalogue.query ? 'Nog geen favorieten' : 'Geen recepten gevonden',
      catalogue.filter === 'favorites' && !catalogue.query ? 'Tik op een hartje om een recept te bewaren.' : 'Pas je zoekterm of filter aan.');
}

function recipeView() {
  const recipe = byId.get(current.id);
  const n = portions[recipe.id] ?? 1;
  const nutrition = scaleNutrition(recipe, n);
  const inList = db.grocery.recipes[recipe.id] ?? 0;
  const measurements = recipe.ingredients.map(item => formatIngredient(item, n));
  return `<a href="${escapeHtml(recipeBack)}" class="back">${icon('back')} Terug</a>
    <div class="detail-top">${photo(recipe, { priority: true })}
      <div class="detail-copy"><div class="detail-tags"><span class="badge">${cap(recipe.taste)}</span>
      <span>${icon('clock')} ${recipe.minutes} min</span></div>
      <h1>${escapeHtml(recipe.name)}</h1>${favourite(recipe)}</div></div>
    <div class="detail-grid">
      <section class="panel">
        <div class="section-head"><h2>Ingrediënten</h2><div class="stepper" aria-label="Porties">
          ${button('portion', icon('minus'), `data-id="${recipe.id}" data-n="-0.5" aria-label="Halve portie minder"${disabled(n <= .5)}`)}
          <output aria-live="polite">${formatPortions(n)}</output>
          ${button('portion', icon('plus'), `data-id="${recipe.id}" data-n="0.5" aria-label="Halve portie meer"${disabled(n >= maxPortions)}`)}
        </div></div>
        <ul class="ingredient-list">${measurements.map(({ name, amount }) =>
          `<li><span>${escapeHtml(cap(name))}</span><strong>${escapeHtml(amount || 'Naar smaak')}</strong></li>`).join('')}</ul>
        ${button('grocery-add', icon('basket') + ' Voeg toe aan boodschappen', `data-id="${recipe.id}" data-n="${n}"${disabled(inList + n > maxPortions)}`, 'primary')}
        ${inList ? `<p class="note"><a href="#grocery">${formatPortions(inList)} op je boodschappenlijst</a>${inList + n > maxPortions ? ' · maximaal 12 porties per recept' : ''}</p>` : ''}
        ${recipePlanContext && planById(recipePlanContext.id) ? `<div class="button-row head-actions">
          ${button('save-recipe-pick', recipePlanContext.phase === 'pre' ? 'Bewaar als snack vooraf' : 'Bewaar als snack achteraf',
            `data-id="${recipePlanContext.id}" data-phase="${recipePlanContext.phase}" data-n="${recipe.id}" data-portions="${n}"`)}</div>` : ''}
      </section>
      <section class="panel">
        <h2>Bereiding</h2>
        <ol class="steps">${recipe.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
        <p class="note">${recipe.allergens.length ? 'Op basis van de ingrediënten: ' + escapeHtml(recipe.allergens.join(', ')) + '. ' : ''}${allergenNote}</p>
        <label class="field rating"><span>Jouw beoordeling</span><select id="rating-select">
          ${options([[0, 'Nog te proberen'], ...[1, 2, 3, 4, 5].map(n => [n, n + (n === 1 ? ' ster' : ' sterren')])], db.ratings[recipe.id] ?? 0)}
        </select></label>
      </section>
    </div>
    <section class="panel block"><h2>Voedingswaarden</h2><div class="nutrition">
      ${[['kcal', 'kcal'], ['protein', 'eiwit'], ['carbs', 'koolhydraten'], ['fat', 'vet'], ['fiber', 'vezels']].map(([key, label]) =>
        `<div><strong>${formatNumber(nutrition[key])}${key !== 'kcal' ? ' g' : ''}</strong><small>${label}</small></div>`).join('')}
    </div><p class="note">${nutritionNote}</p></section>`;
}

function grocery() {
  const rows = groceryRows(db.grocery);
  const remaining = rows.filter(item => !item.checked);
  const visible = groceryView === 'open' ? remaining : rows;
  const sources = Object.entries(db.grocery.recipes);
  return heading('Boodschappen', rows.length ? `${rows.length - remaining.length} van ${rows.length} afgevinkt` : 'Voeg ingrediënten toe vanuit een recept of schrijf zelf iets op.') +
    `<div class="shop-grid"><section class="panel">
      <form id="grocery-form" class="grocery-form">
        <label class="field"><span>Product toevoegen</span><input name="name" placeholder="Bijv. halfvolle melk" required maxlength="120"></label>
        <label class="field"><span>Categorie</span><select name="group">${options(groceryGroups.map(x => [x, x]), 'Overig')}</select></label>
        <button class="button primary" type="submit">${icon('plus')} Toevoegen</button>
      </form>
      ${rows.length ? `<div class="shop-tools">
        ${button('shop-filter', groceryView === 'open' ? 'Toon ook afgevinkt' : 'Toon alleen open')}
        ${button('share', 'Deel open lijst', disabled(!remaining.length))}
      </div>` : ''}
      ${visible.length ? groceryGroups.map(group => groupRows(group, visible)).join('') :
        empty(rows.length ? 'Alles afgevinkt' : 'Je lijst is leeg', rows.length ? 'Je hebt alle producten gehaald.' : 'Ingrediënten uit recepten komen hier bij elkaar.')}</section>
      <section class="panel source-panel"><h2>Recepten op je lijst</h2>
        ${sources.length ? sources.map(([id, n]) => {
          const recipe = byId.get(Number(id));
          return `<div class="source"><a href="#recipe/${id}" data-recipe-link>${escapeHtml(recipe.name)}</a>
            <div class="source-controls">
              <label class="field"><span class="sr-only">Porties voor ${escapeHtml(recipe.name)}</span><select class="source-portions" data-id="${id}">
                ${options(Array.from({ length: maxPortions * 2 }, (_, i) => [(i + 1) / 2, formatPortions((i + 1) / 2)]), n)}
              </select></label>
              ${button('grocery-remove', 'Verwijder', `data-id="${id}" aria-label="Verwijder ${escapeHtml(recipe.name)} uit boodschappen"`, 'text-button')}
            </div></div>`;
        }).join('') : `<p class="note">Voeg een recept toe om hier de porties aan te passen.</p><a href="#recipes">Naar recepten</a>`}
      </section></div>`;
}

function groupRows(group, rows) {
  const items = rows.filter(row => row.group === group);
  if (!items.length) return '';
  return `<div class="grocery-group"><h3>${group}</h3><ul>${items.map(row =>
    `<li class="${row.checked ? 'bought' : ''}">
      <label><input class="grocery-check" type="checkbox" data-key="${escapeHtml(row.key)}"${attrChecked(row.checked)}>
      <span>${escapeHtml(cap(row.name))}</span><strong>${escapeHtml(row.amount)}</strong></label>
      ${row.manualId ? button('manual-remove', 'Verwijder', `data-id="${escapeHtml(row.manualId)}" aria-label="Verwijder ${escapeHtml(row.name)}"`, 'text-button') : ''}
    </li>`).join('')}</ul></div>`;
}

function planCard(plan) {
  const times = timing(plan);
  return `<article class="panel plan-card">
    <div class="plan-top"><div><p class="date-label">${cap(dateLabel(plan.date))} · ${plan.time}</p>
      <h3>${escapeHtml(plan.sport)}</h3></div>${plan.done ? '<span class="badge">Afgerond</span>' : ''}</div>
    <p class="muted">${plan.duration} min · ${plan.intensity}${plan.groups.length ? ' · ' + escapeHtml(plan.groups.join(', ')) : ''}</p>
    <div class="plan-snacks">${phases.filter(([key]) => plan[key + 'Enabled']).map(([key, title]) => {
      const pick = plan[key + 'Pick'];
      const recipe = pick && byId.get(pick.i);
      const name = recipe ? recipe.name + ' · ' + formatPortions(pick.n) : pick ? 'Geen extra snack' : 'Nog te kiezen';
      return `<div><small>${title} · ${formatTime(times[key])}</small>
        ${recipe ? `<a href="#recipe/${pick.i}" data-recipe-link data-portions="${pick.n}" data-plan="${plan.id}" data-phase="${key}">${escapeHtml(name)}</a>` : `<span>${name}</span>`}</div>`;
    }).join('')}</div>
    <div class="button-row">
      ${primaryLink('#food/' + plan.id, 'Sportvoeding', 'bolt')}
      <a class="button" href="#edit/${plan.id}">Aanpassen</a>
      ${button('plan-toggle', plan.done ? 'Heropen' : 'Afronden', `data-id="${plan.id}"`, 'text-button')}
      ${button('plan-remove', 'Verwijder', `data-id="${plan.id}" aria-label="Verwijder training ${escapeHtml(plan.sport)}"`, 'text-button danger')}
    </div></article>`;
}

function agenda() {
  const plans = sortedPlans();
  const upcoming = plans.filter(plan => plan.date >= localDate() && !plan.done);
  const other = plans.filter(plan => !upcoming.includes(plan)).reverse();
  return heading('Agenda', 'Plan je trainingen en bewaar je snackkeuzes.') +
    `<div class="button-row head-actions">${primaryLink('#edit', 'Training plannen', 'plus')}
      ${plans.length ? '<a class="button" href="#food">Sportvoeding bekijken</a>' : ''}</div>
    <section class="block">${section('Gepland')}
      ${upcoming.length ? upcoming.map(planCard).join('') : empty('Geen komende trainingen', 'Nieuwe trainingen verschijnen hier.')}</section>
    ${other.length ? `<section class="block">${section('Geschiedenis')}${other.map(planCard).join('')}</section>` : ''}`;
}

function edit() {
  const old = planById(current.id);
  if (current.id && !old) return heading('Training aanpassen') + empty('Training niet gevonden', 'Open een bestaande training vanuit je agenda.', primaryLink('#agenda', 'Naar agenda'));
  const p = old ?? newPlan();
  const pairs = values => values.map(value => [value, value]);
  const back = old ? '#food/' + old.id : '#agenda';
  const field = (name, title, type, attrs = '') => `<label class="field"><span>${title}</span><input name="${name}" type="${type}" required value="${escapeHtml(p[name])}" ${attrs}></label>`;
  const select = (name, title, values) => `<label class="field"><span id="label-${name}">${title}</span><select name="${name}" aria-labelledby="label-${name}">${options(pairs(values), p[name])}</select></label>`;
  return `<a class="back" href="${back}">${icon('back')} Terug</a>${heading(old ? 'Training aanpassen' : 'Training plannen')}
    <form id="plan-form" class="stack" data-id="${p.id}">
      <section class="panel"><h2>Training</h2><div class="fields">
        ${field('date', 'Datum', 'date', 'min="0001-01-01" max="9999-12-31"')}${field('time', 'Starttijd', 'time')}
        ${select('sport', 'Sport', sports)}${field('duration', 'Duur (minuten)', 'number', 'min="10" max="300"')}
        ${select('intensity', 'Intensiteit', intensities)}
      </div>
      <fieldset id="groups" ${p.sport === 'Krachttraining' ? '' : 'hidden'}><legend>Spiergroepen</legend>
        <div class="fields">${muscles.map(group => `<label class="checkbox"><input type="checkbox" name="groups" value="${group}"${attrChecked(p.groups.includes(group))}>${group}</label>`).join('')}</div>
      </fieldset>
      ${box('hot', 'Warm weer of veel zweten', p.hot)}
      </section>
      <section class="panel"><h2>Eetmomenten</h2>
        <div class="fields">${field('meal', 'Laatste maaltijd vóór training', 'time')}${select('size', 'Maaltijdgrootte', sizes)}</div>
        ${box('mealPreviousDay', 'Maaltijd was op de vorige dag', p.mealPreviousDay)}
        <div class="fields food-times"><div>${box('preEnabled', 'Snack vooraf', p.preEnabled)}
          <div id="pre-time" ${p.preEnabled ? '' : 'hidden'}>${field('lead', 'Minuten vóór de start', 'number', `min="0" max="240"${disabled(!p.preEnabled)}`)}${box('hungry', 'Ik verwacht trek vooraf', p.hungry)}</div>
        </div><div>${box('postEnabled', 'Snack achteraf', p.postEnabled)}
          <div id="post-time" ${p.postEnabled ? '' : 'hidden'}>${field('delay', 'Minuten na het einde', 'number', `min="0" max="240"${disabled(!p.postEnabled)}`)}${box('nextMeal', 'Volledige maaltijd binnen een uur na afloop', p.nextMeal)}</div>
        </div></div>
        <p id="form-error" class="error" role="alert" hidden></p>
        <div class="button-row head-actions"><button class="button primary" type="submit">Opslaan en snacks kiezen</button><a href="${back}" class="button">Annuleren</a></div>
      </section></form>`;
}

function food() {
  const all = sortedPlans();
  const today = localDate();
  const plan = planById(current.id) ?? planById(activePlan) ?? all.find(p => !p.done && p.date >= today) ?? all.at(-1);
  if (!plan) return heading('Sportvoeding') + empty('Nog geen training gepland', 'Je snackopties verschijnen zodra je een training plant.', primaryLink('#edit', 'Training plannen', 'plus'));
  activePlan = plan.id;
  const advice = sportAdvice(plan, db);
  const source = 'https://www.voedingscentrum.nl/nl/thema/eten-bij-sport-en-beweging/planning-eten-en-drinken-rond-sportmomenten.aspx';
  return `<a href="#agenda" class="back">${icon('back')} Agenda</a>${heading('Sportvoeding')}
    <section class="panel">
      <label class="field"><span id="label-food-plan">Training</span><select id="food-plan" aria-labelledby="label-food-plan">
        ${options(all.map(p => [p.id, cap(dateLabel(p.date)) + ' · ' + p.time + ' · ' + p.sport]), plan.id)}
      </select></label>
      <p class="note">${formatTime(advice.times.start)} tot ${formatTime(advice.times.end)} · ${plan.duration} min · ${plan.intensity}
        <br>Laatste maaltijd om ${formatTime(advice.times.meal)} · ${plan.size.toLowerCase()}</p>
      <a class="button" href="#edit/${plan.id}">Timing aanpassen</a>
    </section>
    <div class="advice-grid">
      ${plan.preEnabled ? adviceSection(plan, advice, 'pre') : ''}
      ${plan.postEnabled ? adviceSection(plan, advice, 'post') : ''}
      ${!plan.preEnabled && !plan.postEnabled ? empty('Snackmomenten staan uit', 'Je kunt vooraf en achteraf apart aanzetten.', primaryLink('#edit/' + plan.id, 'Timing aanpassen')) : ''}
    </div>
    <section class="panel block"><h2>Drinken tijdens het sporten</h2><p>Neem water mee en drink naar behoefte. ${plan.hot ?
      'Plan drinkpauzes en pas de hoeveelheid aan hoeveel je zweet.' : 'Bij een korte of rustige training is water doorgaans voldoende.'}</p>
    ${advice.long ? '<p>Bij langdurige, intensieve inspanning kunnen koolhydraten tijdens het sporten nuttig zijn. Hoeveel je verdraagt hangt af van je inspanning en wat je gewend bent.</p>' : ''}
    <p class="note">Dit zijn algemene snackopties. Voedingswaarden zijn schattingen. <a href="${source}" target="_blank" rel="noopener">Voedingscentrum</a></p>
    <p class="note">${allergenNote}</p></section>`;
}

function adviceSection(plan, advice, phase) {
  const pre = phase === 'pre';
  const title = pre ? 'Vóór de training' : 'Na de training';
  const text = pre ? advice.preOptional ? 'Een extra snack is waarschijnlijk optioneel na je laatste maaltijd of bij deze korte training.' :
    advice.light ? 'Kies bij weinig tijd een kleinere portie die je goed verdraagt. Onderstaande opties starten met een halve portie.' :
      'Kies iets dat past bij je trek. Koolhydraten kunnen energie leveren voor je training.' :
    plan.nextMeal ? 'Je geplande maaltijd kan de herstelsnack vervangen.' :
      advice.postOptional ? 'Na deze training zijn je normale maaltijden meestal voldoende.' :
        advice.demanding ? 'Als je maaltijd nog op zich laat wachten, kun je eiwit en koolhydraten combineren.' :
          'Als je maaltijd nog op zich laat wachten, kun je kiezen voor een snack met eiwit.';
  const active = plan[phase + 'Pick'];
  const ranked = advice[phase];
  const selectedSnack = active?.i >= 0 ? ranked.find(item => item.i === active.i) : null;
  const top = ranked.filter(item => item.i !== selectedSnack?.i);
  return `<section class="block advice-section"><div class="section-head"><h2>${title}</h2><span class="badge">${formatTime(advice.times[phase])}</span></div>
    <p class="muted">${text}</p>
    ${foodChoice(plan, phase, { i: -1, n: 0, reason: 'Sla dit snackmoment over.' })}
    ${selectedSnack ? foodChoice(plan, phase, { ...selectedSnack, n: active.n, reason: 'Je bewaarde portie.' }) : ''}
    ${top.slice(0, 3).map(item => foodChoice(plan, phase, item)).join('')}
    <details class="panel more-advice"><summary>Meer snackopties</summary>${top.slice(3).map(item => foodChoice(plan, phase, item)).join('')}</details></section>`;
}

function foodChoice(plan, phase, option) {
  const { recipe, i, n, reason } = option;
  const chosen = plan[phase + 'Pick']?.i === i;
  const attrs = `data-id="${plan.id}" data-phase="${phase}" data-n="${i}" data-portions="${n}" aria-pressed="${chosen}"`;
  const nutrition = recipe ? scaleNutrition(recipe, n) : null;
  const inList = recipe ? db.grocery.recipes[recipe.id] ?? 0 : 0;
  return `<article class="food-choice${chosen ? ' chosen' : ''}">
    <h3>${recipe ? `<a href="#recipe/${i}" data-recipe-link data-portions="${n}" data-plan="${plan.id}" data-phase="${phase}">${escapeHtml(recipe.name)}</a>` : 'Geen extra snack'}</h3>
    ${recipe ? `<p><strong>${formatPortions(n)}</strong> · ±${formatNumber(nutrition.kcal)} kcal · ${formatNumber(nutrition.carbs)} g KH · ${formatNumber(nutrition.protein)} g eiwit</p>` : ''}
    <p class="note">${reason}</p>
    <div class="button-row">
      ${button('food-pick', chosen ? icon('check') + ' Gekozen' : recipe ? 'Kies snack' : 'Kies geen snack', attrs + disabled(chosen))}
      ${recipe && chosen ? button('grocery-add', icon('basket') + ' Naar boodschappen', `data-id="${i}" data-phase="${phase}" data-n="${n}"${disabled(inList + n > maxPortions)}`) : ''}
    </div></article>`;
}

function profile() {
  const preference = db.preferences;
  let recovered = false;
  let legacy = false;
  try {
    recovered = localStorage.getItem(restoreKey) !== null;
    legacy = localStorage.getItem(legacyKey) !== null;
  } catch { /* The status message above gives the recovery path. */ }
  return heading('Profiel', 'Beheer je smaakvoorkeuren, gegevens en installatie.') +
    `<div class="detail-grid">
      <section class="panel"><h2>Mijn smaak</h2>
        <div class="fields">
          <label class="field"><span>Voorkeur voor smaak</span><select id="taste">
            ${options([['alles', 'Geen voorkeur'], ['hartig', 'Hartig'], ['zoet', 'Zoet']], preference.taste)}
          </select></label>
          <label class="field"><span>Waar heb je vaak zin in?</span><select id="texture">
            ${options([['', 'Geen voorkeur'], ...textures.map(x => [x, cap(x)])], preference.texture)}
          </select></label>
        </div>
        <p class="note">Je voorkeuren, favorieten en sterren bepalen wat hoger staat bij ‘Voor jou’.</p>
        <p class="note">${db.favorites.length} ${db.favorites.length === 1 ? 'favoriet' : 'favorieten'} · ${Object.values(db.ratings).filter(n => n > 0).length} beoordeeld</p>
        ${box('sensitive', 'Gevoelige maag tijdens sporten', db.sensitive)}
        <p class="note">Bij een kort tijdsvenster krijgt een kleine, lichtere portie voorrang.</p>
      </section>
      <section class="panel"><h2>Mijn gegevens</h2>
        <p>Je trainingen, beoordelingen en boodschappen staan lokaal op dit apparaat. Met een JSON-back-up kun je ze ook op een ander apparaat openen.</p>
        <div class="button-row">
          ${button('backup', 'Exporteer back-up', '', 'primary')}
          ${issues.read ? button('download-raw', 'Download oorspronkelijke gegevens') : ''}
          ${legacy ? button('download-legacy', 'Download 4.1-back-up') : ''}
          ${recovered ? button('download-restore', 'Download vorige gegevens') : ''}
        </div>
        <label class="field import"><span>Back-up herstellen</span><input type="file" id="backup-file" accept="application/json,.json"></label>
        <p class="note">Herstellen vervangt je huidige gegevens na bevestiging. Download eerst een back-up van deze versie als je die wilt bewaren.</p>
      </section>
      <section class="panel"><h2>Op je iPhone installeren</h2>
        <ol class="steps"><li>Open SnackLab in Safari.</li><li>Tik op Deel en kies ‘Zet op beginscherm’.</li><li>Zet ‘Open als webapp’ aan en tik op ‘Voeg toe’.</li></ol>
        <p id="offline-status" class="note" aria-live="polite">${navigator.serviceWorker?.controller ? 'Offline cache is actief.' : 'Open SnackLab online om offline gebruik voor te bereiden.'}</p>
      </section>
      <section class="panel"><h2>Ingrediënten & allergenen</h2><p>${allergenNote}</p><p class="note">${nutritionNote}</p></section>
    </div>`;
}

function download(filename, data) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function restore(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    announce('Kies een SnackLab-back-up van maximaal 5 MB.');
    return;
  }
  try {
    const incoming = parseState(await file.text());
    if (!confirm(`Back-up met ${incoming.plans.length} trainingen herstellen? Je huidige gegevens worden vervangen.`)) return;
    saveState(localStorage, incoming, true);
    db = incoming;
    issues.read = '';
    issues.write = '';
    activePlan = undefined;
    portions = {};
    announce('Back-up hersteld.');
    redraw();
  } catch (error) {
    announce(error instanceof SyntaxError ? 'Dit bestand bevat geen geldige JSON.' : error.message || 'Herstellen is mislukt.');
  }
}

async function share() {
  const text = shoppingText(groceryRows(db.grocery));
  if (!text) return;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'SnackLab-boodschappen', text });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      announce('Open boodschappen gekopieerd.');
      return;
    } catch { /* Offer a selectable text field if the clipboard is unavailable. */ }
  }
  const shared = document.createElement('textarea');
  shared.className = 'share-text';
  shared.readOnly = true;
  shared.setAttribute('aria-label', 'Kopieer de boodschappenlijst');
  shared.value = text;
  const existing = main.querySelector('.share-text');
  if (existing) existing.replaceWith(shared);
  else main.querySelector('.shop-tools').after(shared);
  shared.focus();
  shared.select();
}

function redraw(options) {
  const open = [...main.querySelectorAll('.more-advice')].map(item => item.open);
  render(options);
  catalogueResults();
  if (!options?.focus) [...main.querySelectorAll('.more-advice')].forEach((item, index) => {
    item.open = open[index] ?? false;
  });
  if (!options?.focus && options?.actionFocus && current.name === 'recipes') {
    const data = options.actionFocus;
    const focus = [...main.querySelectorAll('button[data-action]')].find(el => el.dataset.action === data.action && el.dataset.id === data.id);
    (focus ?? main.querySelector('#recipe-search'))?.focus({ preventScroll: true });
  }
}

function syncRoute() {
  if (location.hash === '#main') return;
  current = route();
  if (current.id !== recipePlanContext?.recipeId) recipePlanContext = undefined;
  if (initialized && !issues.write) refreshState();
  redraw({ focus: initialized });
  initialized = true;
}

main.addEventListener('click', event => {
  const link = event.target.closest('a[data-recipe-link]');
  if (link) {
    recipeBack = location.hash || (current.name === 'home' ? '#home' : '#recipes');
    const recipeId = Number(link.hash.split('/')[1]);
    if (link.dataset.portions) portions[recipeId] = Number(link.dataset.portions);
    recipePlanContext = link.dataset.plan ? { recipeId, id: link.dataset.plan, phase: link.dataset.phase } : undefined;
  }
  const control = event.target.closest('button[data-action]');
  if (!control) return;
  const { action, id, n, phase } = control.dataset;
  const recipeId = Number(id);
  const amount = Number(n);
  let changed = true;
  switch (action) {
    case 'favorite':
      changed = update(state => {
        state.favorites = state.favorites.includes(recipeId) ?
          state.favorites.filter(value => value !== recipeId) : [...state.favorites, recipeId];
      });
      break;
    case 'filter':
      catalogue.filter = id;
      break;
    case 'portion':
      portions[recipeId] = Math.min(maxPortions, Math.max(.5, (portions[recipeId] ?? 1) + amount));
      break;
    case 'grocery-add':
      changed = update(state => {
        const count = (state.grocery.recipes[recipeId] ?? 0) + amount;
        if (count > maxPortions) {
          announce('Maximaal 12 porties per recept op je boodschappenlijst.');
          return false;
        }
        return setGroceryPortions(state.grocery, recipeId, count);
      }, 'Ingrediënten toegevoegd aan boodschappen.');
      break;
    case 'grocery-remove':
      changed = update(state => setGroceryPortions(state.grocery, recipeId, 0), 'Recept verwijderd uit boodschappen.');
      break;
    case 'manual-remove':
      changed = update(state => {
        state.grocery.manual = state.grocery.manual.filter(item => item.id !== id);
        delete state.grocery.checked['manual:' + id];
      }, 'Product verwijderd.');
      break;
    case 'shop-filter':
      groceryView = groceryView === 'open' ? 'all' : 'open';
      break;
    case 'share':
      void share();
      return;
    case 'plan-toggle':
      changed = update(state => {
        const plan = state.plans.find(item => item.id === id);
        if (!plan) return false;
        plan.done = !plan.done;
      });
      break;
    case 'plan-remove':
      if (!confirm('Deze training verwijderen?')) return;
      changed = update(state => { state.plans = state.plans.filter(item => item.id !== id); }, 'Training verwijderd.');
      break;
    case 'save-recipe-pick':
    case 'food-pick':
      changed = update(state => {
        const plan = state.plans.find(item => item.id === id);
        if (!plan) return false;
        plan[phase + 'Pick'] = { i: amount, n: Number(control.dataset.portions) };
      }, 'Snackkeuze opgeslagen.');
      if (changed && action === 'save-recipe-pick') {
        go('#food/' + id);
        return;
      }
      break;
    case 'backup':
      download('snacklab-backup-' + localDate() + '.json', JSON.stringify(db, null, 2));
      return;
    case 'download-raw':
    case 'download-legacy':
    case 'download-restore': {
      const key = { 'download-raw': storageKey, 'download-legacy': legacyKey, 'download-restore': restoreKey }[action];
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) download(key + '.json', raw);
      } catch {
        announce('De opgeslagen gegevens zijn niet toegankelijk.');
      }
      return;
    }
    default:
      return;
  }
  if (changed) redraw({ actionFocus: control.dataset });
});

main.addEventListener('input', event => {
  if (event.target.id !== 'recipe-search') return;
  catalogue.query = event.target.value;
  catalogueResults();
});

main.addEventListener('change', event => {
  const input = event.target;
  if (input.id === 'recipe-sort') {
    catalogue.sort = input.value;
    catalogueResults();
  } else if (input.id === 'rating-select') {
    update(state => { state.ratings[current.id] = Number(input.value); }, 'Beoordeling opgeslagen.');
  } else if (input.id === 'food-plan') {
    go('#food/' + input.value);
  } else if (input.id === 'taste' || input.id === 'texture') {
    update(state => { state.preferences[input.id] = input.value; }, 'Voorkeur opgeslagen.');
  } else if (input.name === 'sensitive') {
    update(state => { state.sensitive = input.checked; }, 'Voorkeur opgeslagen.');
  } else if (input.id === 'backup-file') {
    const file = input.files[0];
    input.value = '';
    void restore(file);
  } else if (input.classList.contains('source-portions')) {
    update(state => setGroceryPortions(state.grocery, Number(input.dataset.id), Number(input.value)));
    redraw();
    [...main.querySelectorAll('.source-portions')].find(el => el.dataset.id === input.dataset.id)?.focus({ preventScroll: true });
  } else if (input.classList.contains('grocery-check')) {
    const { key } = input.dataset;
    update(state => {
      if (input.checked) state.grocery.checked[key] = true;
      else delete state.grocery.checked[key];
    });
    redraw();
    const target = [...main.querySelectorAll('.grocery-check')].find(el => el.dataset.key === key) ??
      main.querySelector('.grocery-check') ?? main.querySelector('button[data-action="shop-filter"]');
    target?.focus({ preventScroll: true });
  } else if (input.name === 'sport') {
    document.querySelector('#groups').hidden = input.value !== 'Krachttraining';
  } else if (input.name === 'preEnabled' || input.name === 'postEnabled') {
    const phase = input.name === 'preEnabled' ? 'pre' : 'post';
    const section = document.querySelector('#' + phase + '-time');
    section.hidden = !input.checked;
    section.querySelector('input[type="number"]').disabled = !input.checked;
  }
  if (issues.write && !main.querySelector('.notice')) main.insertAdjacentHTML('afterbegin', storageNotice());
});

main.addEventListener('submit', event => {
  const form = event.target;
  const values = new FormData(form);
  if (form.id === 'grocery-form') {
    event.preventDefault();
    const name = values.get('name').trim();
    if (!name) {
      announce('Vul een productnaam in.');
      return;
    }
    if (update(state => { state.grocery.manual.push({ id: newId(), name, group: values.get('group') }); }, 'Product toegevoegd.')) {
      redraw();
      formFocus('grocery-form', 'name');
    }
    return;
  }
  if (form.id !== 'plan-form') return;
  event.preventDefault();
  const id = form.dataset.id;
  const validated = update(state => {
    const at = state.plans.findIndex(plan => plan.id === id);
    if (current.id && at < 0) {
      announce('Deze training is intussen verwijderd.');
      return false;
    }
    const plan = at >= 0 ? { ...state.plans[at] } : { ...newPlan(), id };
    for (const key of ['date', 'time', 'sport', 'intensity', 'meal', 'size']) plan[key] = values.get(key);
    for (const key of ['duration', 'lead', 'delay']) if (values.has(key)) plan[key] = Number(values.get(key));
    for (const key of ['preEnabled', 'postEnabled', 'mealPreviousDay', 'hot']) plan[key] = values.has(key);
    if (plan.preEnabled) plan.hungry = values.has('hungry');
    if (plan.postEnabled) plan.nextMeal = values.has('nextMeal');
    plan.groups = plan.sport === 'Krachttraining' ? values.getAll('groups') : [];
    const message = planError(plan);
    const error = document.querySelector('#form-error');
    error.hidden = !message;
    error.textContent = message;
    if (message) {
      form.querySelector('[name="meal"]').focus();
      return false;
    }
    if (at >= 0) state.plans[at] = plan;
    else state.plans.push(plan);
    return true;
  }, 'Training opgeslagen.');
  if (validated) go('#food/' + id);
});

function formFocus(formId, name) {
  document.getElementById(formId)?.elements.namedItem(name)?.focus();
}

window.addEventListener('hashchange', syncRoute);
window.addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== null) return;
  if (issues.write || current.name === 'edit') return;
  refreshState();
  redraw();
});

function showUpdate(worker) {
  pendingWorker = worker;
  if (document.querySelector('#update-banner')) return;
  const banner = document.createElement('aside');
  banner.id = 'update-banner';
  banner.className = 'update-banner';
  banner.innerHTML = '<span>Er is een nieuwe versie.</span><button class="button" type="button">Vernieuwen</button>';
  banner.querySelector('button').addEventListener('click', () => pendingWorker?.postMessage({ type: 'ACTIVATE_UPDATE' }));
  document.querySelector('.site-head').after(banner);
}

if ('serviceWorker' in navigator && window.isSecureContext) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(registration => {
    if (registration.waiting && navigator.serviceWorker.controller) showUpdate(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) showUpdate(installing);
      });
    });
  }).catch(() => {
    const status = document.querySelector('#offline-status');
    if (status) status.textContent = 'Offline gebruik kon niet worden voorbereid. Probeer opnieuw met internet.';
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (pendingWorker || hadController) location.reload();
    else {
      const status = document.querySelector('#offline-status');
      if (status) status.textContent = 'Offline cache is actief.';
    }
  });
}

refreshState();
syncRoute();
