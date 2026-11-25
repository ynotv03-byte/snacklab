import { recipes, groceryGroups } from './data.js';
import {
  storageKey, legacyKey, restoreKey, newId, newPlan, validDate, parseTime, hazelnutRisk, metric,
  byId, sports, muscles, intensities, sizes, textures, phases, maxPortions, localDate, planError, timing,
  formatTime, formatPortions, formatIngredient, scaleNutrition, nutrientLabels, searchRecipes,
  groceryRows, setGroceryPortions, shoppingText, sportAdvice
} from './core.js';

import { blankSnapshot, openStore, loadLegacy, displayCatalogue, serializeBackup, deserializeBackup, maxBackupBytes } from './store.js';
import { monday, matchesFilter, workProfile, workoutAfterShift, practical, newCook, labelCheckText } from './model.js';
import { personalToday, workView, workProfilesView, workEditor, weekView, weekEditor, ownEditor, ownList, cookingView, filterDialog, safety } from './screens.js';
import { attachFeatures } from './features.js';
import { attachGym, gymPages, gymView } from './gym-ui.js';
import { liveSession, chronological, syncGymAgenda } from './gym-model.js';
import { snackUse } from './snack-use.js';

const main = document.querySelector('main');
const nav = document.querySelector('nav');
const toast = document.querySelector('#toast');
const issues = { read: '', write: '' };
let db = blankSnapshot();
const store = openStore();
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('snacklab6:' + new URL('./', location.href).pathname) : null;
let hasPrevious = false;
let advancedFilter = {};
let featureRendered = () => {};
let gymRendered = () => {};
let initialized = false;
let current = { name: 'home', id: null };
let activePlan;
let recipeVisit;
let portions = {};
let groceryView = 'open';
let groceryDraft = { name: '', group: 'Overig' };
let agendaView = 'upcoming';
let foodPhase = 'pre';
const catalogue = { query: '', taste: '', filters: new Set(), sort: 'taste' };
let toastTimer;
let pendingWorker;
let exportURL;

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
  check: '<path d="m5 12 4 4L19 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  sliders: '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="2" fill="currentColor"/><circle cx="16" cy="17" r="2" fill="currentColor"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  share: '<path d="M12 15V3m-4 4 4-4 4 4M7 11H5v10h14V11h-2"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none"
  stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
document.querySelector('#header-favorites').innerHTML = icon('heart');
const navItems = [
  ['home', 'home', 'Vandaag'], ['recipes', 'book', 'Recepten'], ['grocery', 'basket', 'Boodschappen'],
  ['agenda', 'calendar', 'Agenda'], ['profile', 'settings', 'Profiel']
];
const filters = [
  ['all', 'Alles'], ['hartig', 'Hartig'], ['zoet', 'Zoet'], ['quick', 'Binnen 5 min'],
  ['protein', 'Eiwitrijk'], ['favorites', 'Favorieten']
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
const allergenNote = labelCheckText;
const activeFilters = () => Boolean(catalogue.taste || catalogue.filters.size);
const upcomingPlan = plan => plan.date >= localDate() && !plan.done;
const segments = (action, label, items, value) => `<div class="segments" role="group" aria-label="${label}">${items.map(([id, name]) =>
  button(action, name, `data-id="${id}" aria-pressed="${id === value}"`, 'segment')).join('')}</div>`;

function announce(message) {
  toast.hidden = false;
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4300);
}

function adopt(state) {
  db = state;
  displayCatalogue(db);
}

async function refreshState() {
  try {
    const state = await store.read();
    if (state) adopt(state);
  } catch { /* Keep the last usable snapshot until the next explicit read or write. */ }
}

async function update(change, message, form) {
  try {
    const saved = await store.write(change);
    if (!saved) return false;
    adopt(saved);
    issues.read = issues.write = '';
    channel?.postMessage('changed');
    if (message) announce(message);
    return true;
  } catch (error) {
    const text = error.name === 'QuotaExceededError' ? 'De opslag is vol. De eerdere gegevens zijn bewaard.' :
      'Opslaan lukt niet. ' + (error.message || 'Probeer opnieuw.');
    const status = form?.querySelector('.form-message');
    if (status) status.textContent = text;
    else announce(text);
    return false;
  }
}

function storageNotice() {
  return issues.read || issues.write ?
    `<div class="notice" role="alert">${escapeHtml(issues.read || issues.write)} <a href="#profile">Naar Profiel</a></div>` : '';
}

function route() {
  const [name, id, sub, set] = location.hash.slice(1).split('/');
  if (gymPages.includes(name) && [id, sub, set].every(key => !key || /^[\w-]{1,90}$/.test(key))) return { name, id, sub, set };
  if (['recipe', 'cook'].includes(name) && id !== undefined && byId.has(Number(id))) return { name, id: Number(id) };
  if (name === 'work') return { name, id: validDate(id) ? id : localDate() };
  if (name === 'week' || name === 'weekedit') return { name, id: monday(validDate(id) ? id : localDate()), sub };
  if (['recipeedit','recipecopy'].includes(name)) return { name, id: Number(id) || null };
  if (['home', 'recipes', 'grocery', 'agenda', 'profile', 'food', 'edit', 'workprofiles', 'workedit', 'own'].includes(name)) return { name, id };
  return { name: 'home', id: null };
}

function go(hash) {
  if (location.hash === hash) redraw();
  else location.hash = hash;
}

function render() {
  let selectedTab = current.name;
  if (['recipe','recipeedit','recipecopy','own','cook'].includes(selectedTab)) selectedTab = 'recipes';
  if (['food','edit','week','weekedit','work',...gymPages].includes(selectedTab)) selectedTab = 'agenda';
  if (['workprofiles','workedit'].includes(selectedTab)) selectedTab = 'profile';
  const count = groceryRows(db.grocery).filter(item => !item.checked).length;
  nav.innerHTML = `<div class="nav-inner">${navItems.map(([name, glyph, label]) =>
    `<a href="#${name}"${name === selectedTab ? ' aria-current="page"' : ''}><span class="nav-icon">${icon(glyph)}
    ${name === 'grocery' && count ? `<span class="nav-count" aria-hidden="true">${count}</span>` : ''}</span>
    <span>${label}</span></a>`).join('')}</div>`;
  const views = { home, recipes: catalogueView, recipe: recipeView, grocery, agenda, food, edit, profile,
    work: () => workView(db,current.id), workprofiles: () => workProfilesView(db), workedit: () => workEditor(db,current.id),
    week: () => weekView(db,current.id), weekedit: () => weekEditor(db,current.id,current.sub ?? 'new'),
    own: () => ownList(db), recipeedit: () => ownEditor(db,current.id), recipecopy: () => ownEditor(db,current.id,true),
    cook: () => cookingView(byId.get(current.id), db, db.cooking[current.id] ?? newCook(portions[current.id] ?? 1))
  };
  document.body.classList.toggle('cooking', current.name === 'cook');
  main.dataset.page = current.name;
  main.innerHTML = storageNotice() + (gymPages.includes(current.name) ? gymView(current,db) : views[current.name]());
  document.title = (main.querySelector('h1')?.textContent || 'Vandaag') + ' · SnackLab';
}

function photo(recipe, { priority = false, cls = '' } = {}) {
  if (!recipe.image) return `<div class="recipe-placeholder ${cls}" aria-hidden="true">${icon('book')}</div>`;
  return `<img class="${cls}" src="${escapeHtml(recipe.image)}" alt="" width="480" height="480"
    ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

function favourite(recipe) {
  const marked = db.favorites.includes(recipe.id);
  return `<button type="button" class="favorite${marked ? ' marked' : ''}" data-action="favorite" data-id="${recipe.id}"
    aria-label="Favoriet: ${escapeHtml(recipe.name)}" aria-pressed="${marked}">${icon('heart')}</button>`;
}

function recipeCard(recipe) {
  const title = current.name === 'recipes' ? 'h2' : 'h3';
  return `<article class="recipe-card">
    <a href="#recipe/${recipe.id}" class="recipe-card-link" data-recipe-link>
      <div class="recipe-frame">${photo(recipe)}</div>
      <div class="recipe-copy"><${title}>${escapeHtml(recipe.name)}</${title}>
        <p>${icon('clock')} ${recipe.minutes} min <span aria-hidden="true">·</span> ${Number.isFinite(recipe.protein) ? metric(recipe.protein) + ' eiwit' : 'Eiwit onbekend'}</p>
        ${hazelnutRisk(recipe) ? '<small class="allergen-tag">Hazelnoot of sporen genoemd</small>' : ''}</div>
    </a>${favourite(recipe)}
  </article>`;
}

function home() {
  const filtered = searchRecipes(db).filter(recipe => !hazelnutRisk(recipe));
  const personalized = db.favorites.length || db.preferences.taste !== 'alles' || db.preferences.texture ||
    Object.values(db.ratings).some(rating => rating > 0);
  const featured = personalized ? filtered[0] ?? byId.get(22) : byId.get(22);
  const suggestions = personalized ? filtered.filter(recipe => recipe !== featured).slice(0, 4) :
    [20, 6, 21, 5].map(id => byId.get(id));
  const today = localDate();
  const plans = sortedPlans();
  const todayPlans = plans.filter(plan => plan.date === today);
  const next = plans.find(plan => plan.date > today && !plan.done);
  const shown = todayPlans.length ? todayPlans : next ? [next] : [];
  const openItems = groceryRows(db.grocery).filter(item => !item.checked).length;
  const nextPlan = todayPlans.find(plan => !plan.done) ?? next;
  const activeWorkout = liveSession(db.gym);
  const nextWorkout = db.gym.sessions.filter(item => item.status === 'planned' && item.date >= today).sort(chronological)[0];
  const shortcuts = [
    ['#recipes/quick', 'clock', 'Snel iets maken', 'Recepten binnen 5 min'],
    ['#grocery', 'basket', 'Boodschappen', openItems ? `${openItems} ${openItems === 1 ? 'product' : 'producten'} open` : 'Bekijk je lijst'],
    [nextPlan ? '#food/' + nextPlan.id : '#edit', 'calendar', nextPlan ? 'Sportvoeding' : 'Training plannen',
      nextPlan ? (nextPlan.date === today ? 'Vandaag' : cap(dateLabel(nextPlan.date))) + ' · ' + nextPlan.time : 'Kies snacks rond je training'],
    [activeWorkout ? '#gymlog/' + activeWorkout.id : '#gym', 'bolt', activeWorkout ? 'Workout hervatten' : 'Workouts',
      activeWorkout?.name ?? nextWorkout?.name ?? 'Plan en log je krachttraining']
  ];
  return `<div class="page-heading intro"><p class="date-label">${cap(dateLong.format(new Date()))}</p><h1>Vandaag</h1></div>
    ${personalToday(db,today)}
    <article class="hero">
      <div class="hero-photo" data-recipe="${featured.id}">${photo(featured, { priority: true, cls: 'hero-image' })}</div>
      <div class="hero-copy"><span class="eyebrow">${personalized ? 'Voor jou' : 'Receptsuggestie'}</span>
        <h2>${escapeHtml(featured.name)}</h2>
        <p>${icon('clock')} ${featured.minutes} min <span>·</span> ${Number.isFinite(featured.protein) ? metric(featured.protein) + ' eiwit' : 'Eiwit onbekend'}</p>
        <a class="button primary" href="#recipe/${featured.id}" data-recipe-link>Bekijk recept ${icon('right')}</a>
      </div>
    </article>
    <div class="shortcuts">${shortcuts.map(([href, glyph, label, caption]) =>
      `<a class="shortcut" href="${href}"${href === '#edit' ? ' data-edit-link' : ''}><span class="shortcut-icon">${icon(glyph)}</span>
        <span class="shortcut-copy"><strong>${label}</strong><small>${escapeHtml(caption)}</small></span>${icon('right', 'shortcut-arrow')}</a>`).join('')}</div>
    <section class="block">${section('Snacks om te proberen', '#recipes', 'Alle recepten')}
      <div class="recipe-grid home-grid">${suggestions.map(recipeCard).join('')}</div>
    </section>
    ${shown.length ? `<section class="block">${section(todayPlans.length ? 'Training vandaag' : 'Je volgende training', '#agenda', 'Naar agenda')}
      ${shown.map(planCard).join('')}</section>` : ''}`;
}

function catalogueView() {
  return `<div class="page-heading with-action"><h1>Recepten</h1><a class="button" href="#own">${icon('book')} Eigen recepten</a></div>` +
    `<div class="catalogue-controls">
      <div class="search-box">
        <label for="recipe-search" class="sr-only">Zoek een snack</label>${icon('search')}
        <input id="recipe-search" type="search" placeholder="Zoek op recept of ingrediënt" value="${escapeHtml(catalogue.query)}" autocomplete="off" enterkeyhint="search">
        <button type="button" class="search-clear" data-action="clear-query" aria-label="Wis zoekterm"${catalogue.query ? '' : ' hidden'}>${icon('close')}</button>
      </div>
      <div class="filters" role="group" aria-label="Receptfilters">
        ${filters.map(([key, title]) => {
          const pressed = key === 'all' ? !activeFilters() : key === catalogue.taste || catalogue.filters.has(key);
          return `<button type="button" class="chip" data-action="filter" data-id="${key}" aria-pressed="${pressed}"${key === 'protein' ? ' aria-description="20 g eiwit of meer per portie"' : ''}>${title}</button>`;
        }).join('')}
      </div>
    </div>
    <div class="catalogue-results-bar">
      ${`<button class="button advanced-button" type="button" data-v6="filter-open">${icon('sliders')} Filters${Object.keys(advancedFilter).length ? ' · actief' : ''}</button>`}
      <p class="result-count" id="result-count" aria-live="polite"></p>
      <label class="sort-label">${icon('sliders')}<span class="sr-only">Sorteer recepten</span><select id="recipe-sort">${options(sorts, catalogue.sort)}</select></label>
    </div>
    <div id="recipe-results" class="recipe-grid"></div>${filterDialog(db,advancedFilter)}`;
}

function findRecipes(filter = advancedFilter) {
  return searchRecipes(db, { query: catalogue.query, filter: catalogue.taste || 'all', sort: catalogue.sort })
    .filter(recipe => (!catalogue.filters.has('favorites') || db.favorites.includes(recipe.id))
      && (!catalogue.filters.has('quick') || recipe.minutes <= 5)
      && (!catalogue.filters.has('protein') || recipe.protein >= 20)
      && matchesFilter(recipe, filter, db));
}

function catalogueResults() {
  const result = document.getElementById('recipe-results');
  if (!result) return;
  const found = findRecipes();
  const onlyFavorites = catalogue.filters.has('favorites') && catalogue.filters.size === 1 && !catalogue.query && !catalogue.taste && !Object.keys(advancedFilter).length;
  document.getElementById('result-count').textContent = found.length + (found.length === 1 ? ' recept' : ' recepten');
  result.innerHTML = found.length ? found.map(recipeCard).join('') :
    empty(onlyFavorites ? 'Nog geen favorieten' : 'Geen recepten gevonden',
      onlyFavorites ? 'Tik op een hartje om een recept te bewaren.' : 'Probeer een andere zoekterm of filter.',
      button('reset-search', 'Toon alle recepten'));
}

function snackUseCard(recipe, nutrition, n) {
  const use = snackUse(recipe, nutrition);
  if (!use) return '';
  const portion = formatPortions(n);
  const factHeading = recipe.custom && recipe.nutritionSource !== 'estimate' ?
    'Jouw invoer · ' + portion : 'Geschat voor ' + portion;
  return `<section class="panel snack-use" aria-labelledby="snack-use-title">
    <div class="snack-use-copy">
      <h2 id="snack-use-title">Wanneer past deze snack?</h2>
      <h3>${escapeHtml(use.moment)}</h3>
      <p>${escapeHtml(use.explanation)}</p>
      ${use.source ? `<a class="snack-use-source" href="${escapeHtml(use.source.url)}" target="_blank" rel="noopener">Voedingscentrum · ${escapeHtml(use.source.label)}</a>` : ''}
    </div>
    ${use.keys.length ? `<div class="snack-use-facts">
      <p>${escapeHtml(factHeading)}</p>
      <ul role="list">${use.keys.map(key => `<li>${key === 'kcal' ? metric(nutrition.kcal, 'kcal') :
        metric(nutrition[key]) + ' ' + nutrientLabels[key]}</li>`).join('')}</ul>
      ${!recipe.custom && n !== 1 ? '<p class="snack-use-portion-note">De tip gaat uit van 1 portie.</p>' : ''}
    </div>` : ''}
  </section>`;
}

function recipeView() {
  const recipe = byId.get(current.id);
  const n = portions[recipe.id] ?? 1;
  const nutrition = scaleNutrition(recipe, n);
  const inList = db.grocery.recipes[recipe.id] ?? 0;
  const measurements = recipe.ingredients.map(item => formatIngredient(item, n));
  const back = recipeVisit?.back ?? '#recipes';
  const backLabel = { home: 'Vandaag', recipes: 'Recepten', grocery: 'Boodschappen', agenda: 'Agenda', food: 'Sportvoeding', work: 'Werkdag', week: 'Weekplanner', own: 'Eigen recepten' }[back.split('/')[0].slice(1)] ?? 'Recepten';
  const plan = recipeVisit?.plan && planById(recipeVisit.plan);
  return `<a href="${escapeHtml(back)}" class="back" data-recipe-back>${icon('back')} ${backLabel}</a>
    <div class="detail-top">${photo(recipe, { priority: true })}
      <div class="detail-copy"><div class="detail-tags"><span class="badge">${cap(recipe.taste)}</span>
      <span>${icon('clock')} ${recipe.minutes} min</span></div>
      <h1>${escapeHtml(recipe.name)}</h1>${recipe.description ? `<p class="recipe-description">${escapeHtml(recipe.description)}</p>` : ''}${favourite(recipe)}</div></div>
    <div class="button-row recipe-actions">
      <button class="button primary" type="button" data-v6="cook-open" data-id="${recipe.id}">${icon('book')} ${db.cooking[recipe.id] ? 'Kookmodus hervatten' : 'Start kookmodus'}</button>
      ${recipe.custom && !recipe.archived ? `<a class="button" href="#recipeedit/${recipe.id}">Bewerken</a>
        <a class="button" href="#recipecopy/${recipe.id}">Dupliceren</a>
        <button class="button text-button danger" type="button" data-v6="recipe-archive" data-id="${recipe.id}">Verwijderen</button>` : ''}
    </div>
    ${hazelnutRisk(recipe) ? safety(recipe) : ''}
    <div class="jump-links" role="group" aria-label="In dit recept">
      ${[['ingredients', 'Ingrediënten'], ['preparation', 'Bereiding'], ['nutrition', 'Voedingswaarden']].map(([id, title]) =>
        button('jump', title, `data-id="${id}"`, 'jump')).join('')}
    </div>
    ${snackUseCard(recipe, nutrition, n)}
    <div class="detail-grid">
      <section class="panel" id="ingredients" tabindex="-1">
        <div class="section-head"><h2>Ingrediënten</h2><div class="stepper" role="group" aria-label="Porties">
          ${button('portion', icon('minus'), `data-id="${recipe.id}" data-n="-0.5" aria-label="Halve portie minder"${disabled(n <= .5)}`)}
          <output aria-live="polite">${formatPortions(n)}</output>
          ${button('portion', icon('plus'), `data-id="${recipe.id}" data-n="0.5" aria-label="Halve portie meer"${disabled(n >= maxPortions)}`)}
        </div></div>
        <ul class="ingredient-list">${measurements.map(({ name, amount }) =>
          `<li><span>${escapeHtml(cap(name))}</span><strong>${escapeHtml(amount || 'Naar smaak')}</strong></li>`).join('')}</ul>
        ${button('grocery-add', icon('basket') + ' Voeg toe aan boodschappen', `data-id="${recipe.id}" data-n="${n}"${disabled(inList + n > maxPortions)}`, 'primary ingredient-action')}
        ${inList ? `<p class="note"><a href="#grocery">${formatPortions(inList)} op je boodschappenlijst</a>${inList + n > maxPortions ? ' · maximaal 12 porties per recept' : ''}</p>` : ''}
        ${plan && !hazelnutRisk(recipe) ? `<div class="button-row head-actions">
          ${button('save-recipe-pick', recipeVisit.phase === 'pre' ? 'Bewaar als snack vooraf' : 'Bewaar als snack achteraf',
            `data-id="${plan.id}" data-phase="${recipeVisit.phase}" data-n="${recipe.id}" data-portions="${n}"`)}</div>` : ''}
      </section>
      <section class="panel" id="preparation" tabindex="-1">
        <h2>Bereiding</h2>
        <ol class="steps">${recipe.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
        <p class="note">${recipe.allergens.length ? 'Op basis van de ingrediënten: ' + escapeHtml(recipe.allergens.join(', ')) + '. ' : 'Geen allergenen opgegeven. '}${allergenNote}</p>
        ${recipe.custom ? `<p class="note">${practical(recipe).storage === 'cold' ? 'Koeling nodig. ' : practical(recipe).storage === 'shelf' ? 'Door jou als ongekoeld meeneembaar ingevoerd. ' : 'Koeling onbekend. '}${escapeHtml(practical(recipe).note)}</p>` : ''}
        <label class="field rating"><span>Jouw beoordeling</span><select id="rating-select">
          ${options([[0, 'Nog te proberen'], ...[1, 2, 3, 4, 5].map(n => [n, n + (n === 1 ? ' ster' : ' sterren')])], db.ratings[recipe.id] ?? 0)}
        </select></label>
      </section>
    </div>
    <section class="panel block" id="nutrition" tabindex="-1"><h2>Voedingswaarden</h2><div class="nutrition">
      ${[['kcal', 'kcal'], ['protein', 'eiwit'], ['carbs', 'koolhydraten'], ['fat', 'vet'], ['fiber', 'vezels']].map(([key, label]) =>
        `<div><strong>${metric(nutrition[key], key === 'kcal' ? '' : 'g')}</strong><small>${label}</small></div>`).join('')}
    </div><p class="note">${nutritionNote}${recipe.custom && recipe.nutritionSource === 'estimate' ? ' Berekend met de lokale USDA-bibliotheek.' : ''}</p></section>`;
}

function grocery() {
  const rows = groceryRows(db.grocery);
  const remaining = rows.filter(item => !item.checked);
  const visible = groceryView === 'open' ? remaining : rows;
  const sources = Object.entries(db.grocery.recipes);
  const bought = rows.length - remaining.length;
  return heading('Boodschappen') +
    `<div class="shop-grid"><section class="panel shop-panel" aria-label="Boodschappen toevoegen en filteren">
      <form id="grocery-form" class="grocery-form">
        <label class="field"><span>Product toevoegen</span><input name="name" placeholder="Bijv. halfvolle melk" value="${escapeHtml(groceryDraft.name)}" required maxlength="120"></label>
        <label class="field"><span>Categorie</span><select name="group">${options(groceryGroups.map(x => [x, x]), groceryDraft.group)}</select></label>
        <button class="button primary" type="submit">${icon('plus')} Toevoegen</button>
      </form>
      ${rows.length ? `<div class="shopping-progress">
        <label for="shop-progress">${bought} van ${rows.length} afgevinkt</label>
        <progress id="shop-progress" value="${bought}" max="${rows.length}"></progress>
      </div><div class="shop-tools">
        ${segments('shop-filter', 'Getoonde boodschappen', [['open', 'Open'], ['all', 'Alles']], groceryView)}
        ${button('share', icon('share') + ' Deel open lijst', disabled(!remaining.length), 'share-button')}
      </div>` : ''}
      </section>
      <div class="shop-sources stack"${!sources.length && !Object.keys(db.grocery.weekImports).length ? ' hidden' : ''}>
      ${sources.length ? `<details class="panel source-panel" id="grocery-sources" data-keep-open>
        <summary><span>${icon('book')} Recepten op je lijst</span><span class="source-count">${sources.length}</span>${icon('down', 'toggle-icon')}</summary>
        ${sources.map(([id, n]) => {
          const recipe = byId.get(Number(id));
          return `<div class="source"><a href="#recipe/${id}" data-recipe-link>${escapeHtml(recipe.name)}</a>
            <div class="source-controls">
              <label class="field"><span class="sr-only">Porties voor ${escapeHtml(recipe.name)}</span><select class="source-portions" data-id="${id}">
                ${options(Array.from({ length: maxPortions * 2 }, (_, i) => [(i + 1) / 2, formatPortions((i + 1) / 2)]), n)}
              </select></label>
              ${button('grocery-remove', 'Verwijder', `data-id="${id}" aria-label="Verwijder ${escapeHtml(recipe.name)} uit boodschappen"`, 'text-button')}
            </div></div>`;
        }).join('')}
      </details>` : ''}
      ${Object.keys(db.grocery.weekImports).length ? `<details class="panel form-section" id="grocery-weeks" data-keep-open>
        <summary>Weekboodschappen</summary><div class="section-body"><ul class="clean-list">
        ${Object.keys(db.grocery.weekImports).sort().map(key => `<li><a href="#week/${key}">Week van ${escapeHtml(dateLabel(key))}</a>
          <button class="button text-button danger" type="button" data-v6="week-unimport" data-key="${key}">Haal van lijst</button></li>`).join('')}
        </ul></div></details>` : ''}
      </div>
      <section class="grocery-list${visible.length ? ' panel' : ''}" aria-label="Boodschappenlijst">
      ${visible.length ? groceryGroups.map(group => groupRows(group, visible)).join('') :
        empty(rows.length ? 'Alles afgevinkt' : 'Je lijst is leeg', rows.length ? 'Tik op Alles om je volledige lijst te bekijken.' : 'Voeg hierboven een product toe of kies ingrediënten uit een recept.',
          rows.length ? '' : primaryLink('#recipes', 'Bekijk recepten', 'book'))}</section>
    </div>`;
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
  const workout = db.gym.sessions.find(item => item.agenda === plan.id);
  return `<article class="panel plan-card">
    <div class="plan-top"><span class="plan-icon">${icon('calendar')}</span><div><p class="date-label">${cap(dateLabel(plan.date))} · ${plan.time}</p>
      <h3>${escapeHtml(plan.sport)}</h3></div>${plan.done ? '<span class="badge">Afgerond</span>' : ''}</div>
    <p class="muted">${plan.duration} min · ${plan.intensity}${plan.groups.length ? ' · ' + escapeHtml(plan.groups.join(', ')) : ''}</p>
    <div class="plan-snacks">${phases.filter(([key]) => plan[key + 'Enabled']).map(([key, title]) => {
      const pick = plan[key + 'Pick'];
      const recipe = pick && byId.get(pick.i);
      const name = recipe ? recipe.name + ' · ' + formatPortions(pick.n) : pick ? 'Geen extra snack' : 'Nog te kiezen';
      return `<div><small>${title} · ${formatTime(times[key])}</small>
        ${recipe ? `<a href="#recipe/${pick.i}" data-recipe-link data-portions="${pick.n}" data-plan="${plan.id}" data-phase="${key}">${escapeHtml(name)}</a>` : `<span>${name}</span>`}</div>`;
    }).join('')}</div>
    <div class="plan-actions">
      ${primaryLink('#food/' + plan.id, 'Sportvoeding', 'bolt')}
      ${workout ? primaryLink('#gymlog/' + workout.id, 'Open workout') : ''}
      <a class="button" href="#edit/${plan.id}" data-edit-link>Aanpassen</a>
    </div>
    <details class="plan-options" id="options-${plan.id}" data-keep-open>
      <summary>${icon('more')} Meer opties ${icon('down', 'toggle-icon')}</summary>
      <div class="button-row">
        ${button('plan-toggle', plan.done ? 'Heropen' : 'Afronden', `data-id="${plan.id}"`)}
        ${button('plan-remove', 'Verwijder', `data-id="${plan.id}" aria-label="Verwijder training ${escapeHtml(plan.sport)}"`, 'text-button danger')}
      </div>
    </details></article>`;
}

function agenda() {
  const plans = sortedPlans();
  const upcoming = plans.filter(upcomingPlan);
  const other = plans.filter(plan => !upcoming.includes(plan)).reverse();
  const history = agendaView === 'history';
  const visible = history ? other : upcoming;
  return `<div class="page-heading with-action"><h1>Agenda</h1><a class="button primary" href="#edit" data-edit-link>${icon('plus')} Training plannen</a></div>
    <div class="agenda-tools button-row">
      ${primaryLink('#gym', 'Workouts', 'bolt')}
      ${primaryLink('#week/' + monday(localDate()), 'Weekplanner', 'calendar')}
      <a class="button" href="#work/${localDate()}">Werkdag</a><a class="button" href="#workprofiles">Werkprofielen</a>
    </div>
    ${segments('agenda-filter', 'Getoonde trainingen', [['upcoming', `Gepland (${upcoming.length})`], ['history', `Geschiedenis (${other.length})`]], agendaView)}
    <section class="agenda-list" aria-label="${history ? 'Geschiedenis' : 'Geplande trainingen'}">
      ${visible.length ? visible.map(planCard).join('') : history ?
        empty('Nog geen trainingsgeschiedenis', 'Afgelopen en afgeronde trainingen verschijnen hier.') :
        empty('Geen komende trainingen', 'Voeg een training toe en kies je snacks vóór en na inspanning.')}</section>`;
}

function edit() {
  const old = planById(current.id);
  const workDate = current.id?.startsWith('work-') ? current.id.slice(5) : '';
  const suggested = validDate(workDate) ? workoutAfterShift(workProfile(db,workDate),workDate) : null;
  if (current.id && !old && !suggested) return heading('Training aanpassen') + empty('Training niet gevonden', 'Open een bestaande training vanuit je agenda.', primaryLink('#agenda', 'Naar agenda'));
  const p = old ?? newPlan();
  if (suggested) {
    const previous = parseTime(suggested.time) - 120;
    Object.assign(p, suggested, { meal: formatTime((previous + 1440) % 1440), mealPreviousDay: previous < 0 });
  }
  const pairs = values => values.map(value => [value, value]);
  const editVisit = history.state?.snacklabEdit;
  const back = editVisit ?? (suggested ? '#work/' + workDate : old ? '#food/' + old.id : '#agenda');
  const backLabel = back === '#home' ? 'Vandaag' : back.startsWith('#food') ? 'Sportvoeding' : back.startsWith('#work') ? 'Werkdag' : 'Agenda';
  const field = (name, title, type, attrs = '') => `<label class="field"><span>${title}</span><input name="${name}" type="${type}" required value="${escapeHtml(p[name])}" ${attrs}></label>`;
  const select = (name, title, values) => `<label class="field"><span id="label-${name}">${title}</span><select name="${name}" aria-labelledby="label-${name}">${options(pairs(values), p[name])}</select></label>`;
  return `<a class="back" href="${escapeHtml(back)}" data-edit-back>${icon('back')} ${backLabel}</a>${heading(old ? 'Training aanpassen' : 'Training plannen')}
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
        <div class="button-row head-actions"><button class="button primary" type="submit">Opslaan en snacks kiezen</button><a href="${escapeHtml(back)}" class="button" data-edit-back>Annuleren</a></div>
      </section></form>`;
}

function food() {
  const all = sortedPlans();
  const today = localDate();
  const plan = planById(current.id) ?? planById(activePlan) ?? all.find(p => !p.done && p.date >= today) ?? all.at(-1);
  if (!plan) return heading('Sportvoeding') + empty('Nog geen training gepland', 'Je snackopties verschijnen zodra je een training plant.', primaryLink('#edit', 'Training plannen', 'plus'));
  if (activePlan !== plan.id) foodPhase = 'pre';
  activePlan = plan.id;
  const advice = sportAdvice(plan, db);
  const workout = db.gym.sessions.find(item => item.agenda === plan.id);
  const moments = phases.filter(([phase]) => plan[phase + 'Enabled']);
  const visible = moments.some(([phase]) => phase === foodPhase) ? foodPhase : moments[0]?.[0];
  const source = 'https://www.voedingscentrum.nl/nl/thema/eten-bij-sport-en-beweging/planning-eten-en-drinken-rond-sportmomenten.aspx';
  return `<a href="#agenda" class="back">${icon('back')} Agenda</a>${heading('Sportvoeding')}
    <section class="panel training-summary">
      <label class="field"><span id="label-food-plan">Training</span><select id="food-plan" aria-labelledby="label-food-plan">
        ${options(all.map(p => [p.id, cap(dateLabel(p.date)) + ' · ' + p.time + ' · ' + p.sport]), plan.id)}
      </select></label>
      <p class="note">${formatTime(advice.times.start)} tot ${formatTime(advice.times.end)} · ${plan.duration} min · ${plan.intensity}
        <br>Laatste maaltijd om ${formatTime(advice.times.meal)} · ${plan.size.toLowerCase()}</p>
      <div class="button-row"><a class="button text-button" href="#edit/${plan.id}" data-edit-link>Timing aanpassen</a>
        ${workout ? primaryLink('#gymlog/' + workout.id, 'Open workout') : ''}</div>
    </section>
    <div class="advice-grid">
      ${moments.length > 1 ? segments('food-phase', 'Snackmoment', moments.map(([phase, title]) => [phase,
        `<span>${title}${plan[phase + 'Pick'] ? icon('check') : ''}</span><small>${formatTime(advice.times[phase])}</small>`]), visible) : ''}
      ${visible ? adviceSection(plan, advice, visible) :
        empty('Snackmomenten staan uit', 'Je kunt vooraf en achteraf apart aanzetten.', primaryLink('#edit/' + plan.id, 'Timing aanpassen'))}
    </div>
    <details class="panel hydration" id="hydration" data-keep-open><summary>Drinken tijdens het sporten ${icon('down', 'toggle-icon')}</summary><p>Neem water mee en drink naar behoefte. ${plan.hot ?
      'Plan drinkpauzes en pas de hoeveelheid aan hoeveel je zweet.' : 'Bij een korte of rustige training is water doorgaans voldoende.'}</p>
    ${advice.long ? '<p>Bij langdurige, intensieve inspanning kunnen koolhydraten tijdens het sporten nuttig zijn. Hoeveel je verdraagt hangt af van je inspanning en wat je gewend bent.</p>' : ''}
    <p class="note">Dit zijn algemene snackopties. Voedingswaarden zijn schattingen. <a href="${source}" target="_blank" rel="noopener">Voedingscentrum</a></p>
    <p class="note">${allergenNote}</p></details>`;
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
  const storedRecipe = active?.i >= 0 ? byId.get(active.i) : null;
  const selectedSnack = storedRecipe ? { recipe: storedRecipe, i: storedRecipe.id, n: active.n } : null;
  const top = ranked.filter(item => item.i !== selectedSnack?.i);
  const skip = foodChoice(plan, phase, { i: -1, n: 0, reason: '' });
  const suggestSkip = active?.i === -1 || (!selectedSnack && (pre ? advice.preOptional : advice.postOptional));
  return `<section class="advice-section"><div class="section-head"><h2>${title}</h2><span class="badge">${formatTime(advice.times[phase])}</span></div>
    <p class="muted advice-note">${text}</p>
    ${selectedSnack ? foodChoice(plan, phase, { ...selectedSnack, n: active.n, reason: hazelnutRisk(selectedSnack.recipe) ? 'Hazelnoot of mogelijke sporen opgegeven. Kies een ander recept.' : 'Je bewaarde portie.' }) : ''}
    ${suggestSkip ? skip : ''}
    ${top.slice(0, 3).map(item => foodChoice(plan, phase, item)).join('')}
    <details class="panel more-advice" id="advice-${plan.id}-${phase}" data-keep-open>
      <summary>Meer snackopties ${icon('down', 'toggle-icon')}</summary>
      ${top.slice(3).map(item => foodChoice(plan, phase, item)).join('')}</details>
    ${suggestSkip ? '' : skip}
  </section>`;
}

function foodChoice(plan, phase, option) {
  const { recipe, i, n, reason } = option;
  const chosen = plan[phase + 'Pick']?.i === i;
  const attrs = `data-id="${plan.id}" data-phase="${phase}" data-n="${i}" data-portions="${n}" aria-pressed="${chosen}"`;
  const nutrition = recipe ? scaleNutrition(recipe, n) : null;
  const inList = recipe ? db.grocery.recipes[recipe.id] ?? 0 : 0;
  return `<article class="food-choice${chosen ? ' chosen' : ''}${recipe ? '' : ' skip-snack'}" tabindex="-1">
    ${recipe ? photo(recipe, { cls: 'choice-image' }) : ''}
    <div class="choice-copy">
    <h3>${recipe ? `<a href="#recipe/${i}" data-recipe-link data-portions="${n}" data-plan="${plan.id}" data-phase="${phase}">${escapeHtml(recipe.name)}</a>` : 'Geen extra snack'}</h3>
    ${recipe ? `<p><strong>${formatPortions(n)}</strong> ·  ${nutrition.kcal === null ? 'kcal onbekend' : '±' + metric(nutrition.kcal,'kcal')} · ${metric(nutrition.carbs)} KH · ${metric(nutrition.protein)} eiwit</p>` : ''}
    ${reason ? `<p class="note">${reason}</p>` : ''}
    </div>
    <div class="button-row">
      ${button('food-pick', chosen ? icon('check') + ' Gekozen' : recipe ? 'Kies snack' : 'Kies geen snack', attrs + disabled(chosen))}
      ${recipe && chosen && !hazelnutRisk(recipe) ? button('grocery-add', icon('basket') + ' Naar boodschappen', `data-id="${i}" data-phase="${phase}" data-n="${n}"${disabled(inList + n > maxPortions)}`) : ''}
    </div></article>`;
}

function profile() {
  const preference = db.preferences;
  let recovered = hasPrevious;
  let legacy = false;
  try {
    recovered ||= localStorage.getItem(restoreKey) !== null;
    legacy = localStorage.getItem(legacyKey) !== null;
  } catch { /* The status message above gives the recovery path. */ }
  return heading('Profiel') +
    `<div class="detail-grid profile-grid">
      <section class="panel profile-work"><h2>Werkprofielen</h2><p>Stel je diensten, pauzes, koeling en voorbereidingstijd in voor persoonlijke suggesties.</p>
        <a class="button primary" href="#workprofiles">Werkprofielen beheren</a></section>
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
        <a class="profile-favorites" href="#recipes/favorites">${icon('heart')} ${db.favorites.length} ${db.favorites.length === 1 ? 'favoriet' : 'favorieten'}</a>
        ${box('sensitive', 'Gevoelige maag tijdens sporten', db.sensitive)}
        <p class="note">Bij een kort tijdsvenster krijgt een kleine, lichtere portie voorrang.</p>
      </section>
      <section class="panel"><h2>Mijn gegevens</h2>
        <p>Je recepten, foto’s, weekplannen, trainingen en instellingen staan op dit apparaat. Exporteer een JSON-back-up om ze te bewaren of naar een ander apparaat te verplaatsen.</p>
        <div class="button-row">
          ${button('backup', 'Exporteer back-up', '', 'primary')}
          ${issues.read ? button('download-raw', 'Download oorspronkelijke gegevens') : ''}
          ${legacy ? button('download-legacy', 'Download 4.1-back-up') : ''}
          ${recovered ? button('download-restore', 'Download vorige gegevens') : ''}
        </div>
        <div id="backup-download"></div>
        <label class="field import"><span>Back-up herstellen</span><input type="file" id="backup-file" accept="application/json,.json"></label>
        <p class="note">Herstellen vervangt je huidige gegevens na bevestiging. Download eerst een back-up van deze versie als je die wilt bewaren.</p>
      </section>
      <details class="panel profile-details" id="install-help" data-keep-open>
        <summary>Op je iPhone installeren ${icon('down', 'toggle-icon')}</summary>
        <ol class="steps"><li>Open SnackLab in Safari.</li><li>Tik op Deel en kies ‘Zet op beginscherm’.</li><li>Zet ‘Open als webapp’ aan en tik op ‘Voeg toe’.</li></ol>
        <p id="offline-status" class="note" aria-live="polite">${navigator.serviceWorker?.controller ? 'Offline cache is actief.' : 'Open SnackLab online om offline gebruik voor te bereiden.'}</p>
      </details>
      <details class="panel profile-details" id="allergen-help" data-keep-open>
        <summary>Ingrediënten & allergenen ${icon('down', 'toggle-icon')}</summary><p>${allergenNote}</p><p class="note">${nutritionNote}</p>
      </details>
    </div>`;
}

function download(filename, data) {
  if (exportURL) URL.revokeObjectURL(exportURL);
  exportURL = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = exportURL;
  anchor.download = filename;
  const target = document.querySelector('#backup-download');
  if (target) {
    anchor.className = 'manual-download';
    anchor.textContent = 'Download bestand';
    target.replaceChildren(anchor);
  } else document.body.append(anchor);
  anchor.click();
  if (!target) anchor.remove();
}

async function restore(file) {
  if (!file) return;
  if (file.size > maxBackupBytes) { announce('Kies een SnackLab-back-up van maximaal 120 MB.'); return; }
  try {
    const incoming = deserializeBackup(await file.text());
    if (!confirm(`Back-up met ${incoming.plans.length} agendatrainingen, ${incoming.gym.sessions.length} workouts en ${incoming.customRecipes.length} eigen recepten terugzetten? Je huidige gegevens worden eerst als vorige back-up bewaard.`)) return;
    adopt(await store.replace(incoming));
    hasPrevious = true;
    issues.read = issues.write = '';
    activePlan = undefined;
    portions = {};
    channel?.postMessage('changed');
    announce('Back-up hersteld.');
    syncRoute();
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

function openPanels() {
  return [...main.querySelectorAll('details[data-keep-open][open]')].map(item => item.id);
}

function redraw({ focus = false, returnVisit, actionFocus } = {}) {
  const open = new Set(returnVisit?.panels ?? (focus ? [] : openPanels()));
  render();
  catalogueResults();
  featureRendered();
  gymRendered();
  for (const item of main.querySelectorAll('details[data-keep-open]')) item.open = open.has(item.id);
  if (focus) {
    const source = returnVisit && [...main.querySelectorAll('a[data-recipe-link]')].find(link =>
      link.hash === '#recipe/' + returnVisit.recipeId &&
      (!returnVisit.plan || (link.dataset.plan === returnVisit.plan && link.dataset.phase === returnVisit.phase)));
    scrollTo(0, returnVisit?.scroll ?? 0);
    (source ?? main).focus({ preventScroll: true });
    return;
  }
  if (actionFocus) {
    const { action, id, phase, n, key } = actionFocus;
    const buttons = [...main.querySelectorAll('button[data-action]:enabled')];
    const target = buttons.find(({ dataset: d }) =>
      d.action === action && d.id === id && d.phase === phase && d.n === n && d.key === key)
      ?? (action === 'portion' ? buttons.find(el => el.dataset.action === 'portion') : null)
      ?? (action === 'food-pick' ? main.querySelector('.food-choice.chosen') : null)
      ?? (current.name === 'recipes' ? main.querySelector('#recipe-search') : null);
    target?.focus({ preventScroll: action !== 'food-pick' });
  }
}

function syncRoute() {
  if (location.hash === '#main') return;
  const lastVisit = recipeVisit;
  current = route();
  if (current.name !== 'profile' && exportURL) {
    const previous = exportURL;
    exportURL = undefined;
    setTimeout(() => URL.revokeObjectURL(previous), 10000);
  }
  const visit = history.state?.snacklabRecipe;
  recipeVisit = current.name === 'recipe' && visit?.recipeId === current.id ? visit : undefined;
  if (recipeVisit?.portions && portions[current.id] === undefined) portions[current.id] = recipeVisit.portions;
  if (current.name === 'recipes' && ['quick', 'favorites'].includes(current.id)) {
    resetSearch();
    catalogue.filters.add(current.id);
    current.id = undefined;
    history.replaceState(null, '', '#recipes');
  }
  const target = location.hash || '#home';
  redraw({ focus: initialized, returnVisit: lastVisit?.back === target ? lastVisit : undefined });
  initialized = true;
}

function resetSearch() {
  catalogue.query = '';
  catalogue.taste = '';
  catalogue.filters.clear();
  advancedFilter = {};
}

main.addEventListener('click', async event => {
  const link = event.target.closest('a[data-recipe-link]');
  const navigate = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  if (link && navigate) {
    event.preventDefault();
    const recipeId = Number(link.hash.split('/')[1]);
    if (link.dataset.portions) portions[recipeId] = Number(link.dataset.portions);
    const visit = {
      recipeId, back: location.hash || '#home', scroll: scrollY, panels: openPanels(), plan: link.dataset.plan,
      phase: link.dataset.phase, portions: portions[recipeId]
    };
    history.pushState({ snacklabRecipe: visit }, '', link.hash);
    syncRoute();
    return;
  }
  if (recipeVisit && navigate && event.target.closest('a[data-recipe-back]')) {
    event.preventDefault();
    history.back();
    return;
  }
  const editLink = event.target.closest('a[data-edit-link]');
  if (navigate && editLink) {
    event.preventDefault();
    history.pushState({ snacklabEdit: location.hash || '#home' }, '', editLink.hash);
    syncRoute();
    return;
  }
  if (navigate && history.state?.snacklabEdit && event.target.closest('a[data-edit-back]')) {
    event.preventDefault();
    history.back();
    return;
  }
  const control = event.target.closest('button[data-action]');
  if (!control) return;
  const { action, id, n, phase } = control.dataset;
  const recipeId = Number(id);
  const amount = Number(n);
  let changed = true;
  switch (action) {
    case 'favorite':
      changed = await update(state => {
        state.favorites = state.favorites.includes(recipeId) ?
          state.favorites.filter(value => value !== recipeId) : [...state.favorites, recipeId];
      });
      break;
    case 'filter':
      if (id === 'all') {
        catalogue.taste = '';
        catalogue.filters.clear();
      } else if (id === 'hartig' || id === 'zoet') catalogue.taste = catalogue.taste === id ? '' : id;
      else if (catalogue.filters.has(id)) catalogue.filters.delete(id);
      else catalogue.filters.add(id);
      break;
    case 'clear-query': {
      const search = main.querySelector('#recipe-search');
      search.value = catalogue.query = '';
      control.hidden = true;
      catalogueResults();
      search.focus();
      return;
    }
    case 'reset-search':
      resetSearch();
      break;
    case 'jump': {
      const target = document.getElementById(id);
      target.scrollIntoView({ block: 'start' });
      target.focus({ preventScroll: true });
      return;
    }
    case 'food-phase':
      foodPhase = id;
      break;
    case 'agenda-filter':
      agendaView = id;
      break;
    case 'portion':
      portions[recipeId] = Math.min(maxPortions, Math.max(.5, (portions[recipeId] ?? 1) + amount));
      break;
    case 'grocery-add':
      changed = await update(state => {
        const count = (state.grocery.recipes[recipeId] ?? 0) + amount;
        if (count > maxPortions) {
          announce('Maximaal 12 porties per recept op je boodschappenlijst.');
          return false;
        }
        return setGroceryPortions(state.grocery, recipeId, count);
      }, 'Ingrediënten toegevoegd aan boodschappen.');
      break;
    case 'grocery-remove':
      changed = await update(state => setGroceryPortions(state.grocery, recipeId, 0), 'Recept verwijderd uit boodschappen.');
      break;
    case 'manual-remove':
      changed = await update(state => {
        state.grocery.manual = state.grocery.manual.filter(item => item.id !== id);
        delete state.grocery.checked['manual:' + id];
      }, 'Product verwijderd.');
      break;
    case 'shop-filter':
      groceryView = id;
      break;
    case 'share':
      void share();
      return;
    case 'plan-toggle':
      changed = await update(state => {
        const plan = state.plans.find(item => item.id === id);
        if (!plan) return false;
        plan.done = !plan.done;
        if (current.name === 'agenda') agendaView = upcomingPlan(plan) ? 'upcoming' : 'history';
      });
      break;
    case 'plan-remove':
      if (!confirm('Deze training verwijderen?')) return;
      changed = await update(state => {
        state.plans = state.plans.filter(item => item.id !== id);
        for (const session of state.gym.sessions) if (session.agenda === id) session.agenda = null;
      }, 'Training verwijderd.');
      break;
    case 'save-recipe-pick':
    case 'food-pick':
      changed = await update((state, catalogue) => {
        const plan = state.plans.find(item => item.id === id);
        if (!plan) return false;
        if (amount >= 0) {
          const recipe = catalogue.get(amount);
          if (!recipe || recipe.archived) throw new Error('Dit recept is niet meer beschikbaar.');
          if (hazelnutRisk(recipe)) throw new Error('Dit recept noemt hazelnoot of mogelijke sporen.');
        }
        plan[phase + 'Pick'] = { i: amount, n: Number(control.dataset.portions) };
      }, 'Snackkeuze opgeslagen.');
      if (changed && action === 'save-recipe-pick') {
        activePlan = id;
        foodPhase = phase;
        if (recipeVisit?.back === '#food/' + id) history.back();
        else go('#food/' + id);
        return;
      }
      break;
    case 'backup':
      control.disabled = true;
      try { download('snacklab6-backup-' + localDate() + '.json', await serializeBackup(db)); }
      catch { announce('De back-up kon niet worden gemaakt.'); }
      finally { control.disabled = false; }
      return;
    case 'download-raw':
    case 'download-legacy':
    case 'download-restore': {
      const key = { 'download-raw': storageKey, 'download-legacy': legacyKey, 'download-restore': restoreKey }[action];
      try {
        if (action === 'download-restore' && hasPrevious) {
          const previous = await store.previous();
          if (previous) { download('snacklab-vorige-backup.json', await serializeBackup(previous)); return; }
        }
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
  const input = event.target;
  if (input.id === 'recipe-search') {
    catalogue.query = input.value;
    main.querySelector('.search-clear').hidden = !catalogue.query;
    catalogueResults();
  }
  if (input.form?.id === 'grocery-form' && input.name === 'name') groceryDraft.name = input.value;
});

main.addEventListener('change', async event => {
  const input = event.target;
  if (input.id === 'recipe-sort') {
    catalogue.sort = input.value;
    catalogueResults();
  } else if (input.id === 'rating-select') {
    await update(state => { state.ratings[current.id] = Number(input.value); }, 'Beoordeling opgeslagen.');
  } else if (input.id === 'food-plan') {
    go('#food/' + input.value);
  } else if (input.form?.id === 'grocery-form' && input.name === 'group') {
    groceryDraft.group = input.value;
  } else if (input.id === 'taste' || input.id === 'texture') {
    await update(state => { state.preferences[input.id] = input.value; }, 'Voorkeur opgeslagen.');
  } else if (input.name === 'sensitive') {
    await update(state => { state.sensitive = input.checked; }, 'Voorkeur opgeslagen.');
  } else if (input.id === 'backup-file') {
    const file = input.files[0];
    input.value = '';
    void restore(file);
  } else if (input.classList.contains('source-portions')) {
    await update(state => setGroceryPortions(state.grocery, Number(input.dataset.id), Number(input.value)));
    redraw();
    [...main.querySelectorAll('.source-portions')].find(el => el.dataset.id === input.dataset.id)?.focus({ preventScroll: true });
  } else if (input.classList.contains('grocery-check')) {
    const { key } = input.dataset;
    const index = [...main.querySelectorAll('.grocery-check')].indexOf(input);
    await update(state => {
      if (input.checked) state.grocery.checked[key] = true;
      else delete state.grocery.checked[key];
    });
    redraw();
    const checks = [...main.querySelectorAll('.grocery-check')];
    const target = checks.find(el => el.dataset.key === key) ?? checks[Math.min(index, checks.length - 1)] ??
      main.querySelector('button[data-action="shop-filter"]');
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

main.addEventListener('submit', async event => {
  const form = event.target;
  if (form.dataset.feature) return;
  const values = new FormData(form);
  if (form.id === 'grocery-form') {
    event.preventDefault();
    const name = values.get('name').trim();
    if (!name) {
      announce('Vul een productnaam in.');
      return;
    }
    if (await update(state => { state.grocery.manual.push({ id: newId(), name, group: values.get('group') }); }, 'Product toegevoegd.')) {
      groceryDraft.name = '';
      redraw();
      formFocus('grocery-form', 'name');
    }
    return;
  }
  if (form.id !== 'plan-form') return;
  event.preventDefault();
  const id = form.dataset.id;
  const validated = await update(state => {
    const at = state.plans.findIndex(plan => plan.id === id);
    if (current.id && !current.id.startsWith('work-') && at < 0) {
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
    syncGymAgenda(state,plan);
    return true;
  }, 'Training opgeslagen.');
  if (validated) {
    if (!current.id) foodPhase = 'pre';
    go('#food/' + id);
  }
});

function formFocus(formId, name) {
  document.getElementById(formId)?.elements.namedItem(name)?.focus();
}

history.scrollRestoration = 'manual';
window.addEventListener('hashchange', syncRoute);
channel?.addEventListener('message', async () => {
  if (!initialized || ['edit','recipeedit','recipecopy','workedit','weekedit','week','gymedit','gymset'].includes(current.name) || main.querySelector('dialog[open]')) return;
  await refreshState();
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

featureRendered = attachFeatures(main, {
  getState: () => db, update, redraw, go, announce, route: () => current,
  getPortions: id => portions[id] ?? 1,
  getFilter: () => advancedFilter,
  filterCount: filter => findRecipes(filter).length,
  applyFilter: filter => { advancedFilter = filter; redraw(); }
});

gymRendered = attachGym(main,{getState: () => db,update,redraw,go,announce,route: () => current});

async function start() {
  try {
    adopt(await store.init());
    hasPrevious = Boolean(await store.previous());
  } catch (error) {
    try { adopt(loadLegacy()); } catch { /* Raw legacy data remains available for export. */ }
    issues.read = 'Lokale gegevens konden niet volledig worden geopend. Exporteer je gegevens in Profiel. ' + (error.message || '');
  }
  syncRoute();
}
void start();
