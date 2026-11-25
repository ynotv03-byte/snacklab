import { recipes, groceryGroups } from './data.js';

export const storageKey = 'snacklab41';
export const legacyKey = 'snacklab41-before-v5';
export const restoreKey = 'snacklab41-before-restore';
export const schemaVersion = 6;
export const builtinRecipes = recipes.slice();
export const builtinMap = new Map(builtinRecipes.map(recipe => [recipe.id, recipe]));
export const byId = new Map(builtinMap);
export function setOwnRecipes(entries) {
  recipes.splice(builtinRecipes.length, recipes.length, ...entries.filter(recipe => !recipe.archived));
  byId.clear();
  for (const recipe of [...builtinRecipes, ...entries]) byId.set(recipe.id, recipe);
}
export const sports = ['Krachttraining', 'Voetbal', 'Hardlopen', 'Padel', 'Fietsen', 'Wandelen'];
export const muscles = ['Borst', 'Biceps', 'Triceps', 'Schouders', 'Rug', 'Benen', 'Buik', 'Billen'];
export const intensities = ['Rustig', 'Normaal', 'Zwaar'];
export const sizes = ['Klein', 'Normaal', 'Groot'];
export const tastes = ['alles', 'hartig', 'zoet'];
export const textures = ['krokant', 'romig', 'fris', 'warm', 'drinkbaar'];
export const maxPortions = 12;
export const phases = [['pre', 'Vooraf'], ['post', 'Achteraf']];
const fmt = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 });
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const idPattern = /^[\w-]{1,80}$/;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

export function localDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function validDate(date) {
  if (typeof date !== 'string' || !datePattern.test(date)) return false;
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === date;
}

export function parseTime(time) {
  if (typeof time !== 'string' || !timePattern.test(time)) return NaN;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function formatTime(minutes) {
  const wrapped = (minutes % 1440 + 1440) % 1440;
  const clock = [Math.floor(wrapped / 60), wrapped % 60].map(x => String(x).padStart(2, '0')).join(':');
  const day = Math.floor(minutes / 1440);
  if (day === -1) return clock + ' (vorige dag)';
  if (day === 1) return clock + ' (volgende dag)';
  if (day !== 0) return clock + ' (' + (day > 0 ? '+' : '') + day + ' dagen)';
  return clock;
}

export function timing(plan) {
  const start = parseTime(plan.time);
  const end = start + plan.duration;
  const pre = start - plan.lead;
  const meal = parseTime(plan.meal) - (plan.mealPreviousDay ? 1440 : 0);
  return { start, end, pre, meal, post: end + plan.delay, sinceMeal: pre - meal };
}

export function planError(plan) {
  const times = timing(plan);
  if (times.meal > times.start) return 'Kies een maaltijd uiterlijk op de starttijd. Vink ‘Vorige dag’ aan als je rond middernacht traint.';
  if (plan.preEnabled && times.sinceMeal < 0) return 'Je snack vooraf valt vóór je laatste maaltijd. Pas de maaltijd of het snackmoment aan.';
  return '';
}

export function validPortions(n) {
  return Number.isFinite(n) && n >= 0.5 && n <= maxPortions && Number.isInteger(n * 2);
}

function validPick(pick, catalogue) {
  return record(pick) && (pick.i === -1 ? pick.n === 0 : catalogue.has(pick.i) && validPortions(pick.n));
}

function validPlan(plan, catalogue) {
  return record(plan) && typeof plan.id === 'string' && idPattern.test(plan.id) &&
    validDate(plan.date) && Number.isFinite(parseTime(plan.time)) && Number.isFinite(parseTime(plan.meal)) &&
    sports.includes(plan.sport) && intensities.includes(plan.intensity) && sizes.includes(plan.size) &&
    Array.isArray(plan.groups) && plan.groups.every(group => muscles.includes(group)) &&
    integer(plan.duration, 10, 300) && integer(plan.lead, 0, 240) && integer(plan.delay, 0, 240) &&
    ['preEnabled', 'postEnabled', 'hungry', 'nextMeal', 'hot', 'done', 'mealPreviousDay'].every(key =>
      plan[key] === undefined || typeof plan[key] === 'boolean') &&
    phases.every(([key]) => plan[key + 'Pick'] === undefined || validPick(plan[key + 'Pick'], catalogue));
}

export function blankState() {
  return {
    schemaVersion, plans: [], ratings: {}, sensitive: false, favorites: [],
    preferences: { taste: 'alles', texture: '' },
    grocery: { recipes: {}, manual: [], checked: {} }
  };
}

export function parseState(raw, catalogue = byId) {
  const data = JSON.parse(raw);
  if (!record(data) || !Array.isArray(data.plans) || !record(data.ratings) ||
    (data.schemaVersion !== undefined && ![5, schemaVersion].includes(data.schemaVersion))) {
    throw new Error('Dit bestand is geen ondersteunde SnackLab-back-up (4.1, 5 of 6).');
  }
  const ids = new Set(data.plans.map(plan => plan?.id));
  if (ids.size !== data.plans.length || !data.plans.every(plan => validPlan(plan, catalogue))) {
    throw new Error('De back-up bevat een training met ongeldige gegevens.');
  }
  const state = { ...blankState(), ...data, schemaVersion };
  if (!Object.entries(state.ratings).every(([id, rating]) => /^\d+$/.test(id) && integer(rating, 0, 5)) ||
    typeof state.sensitive !== 'boolean' || !Array.isArray(state.favorites) || !state.favorites.every(id => catalogue.has(id)) ||
    !record(state.preferences) || !tastes.includes(state.preferences.taste) ||
    !['', ...textures].includes(state.preferences.texture)) {
    throw new Error('De back-up bevat ongeldige beoordelingen of voorkeuren.');
  }
  const list = state.grocery;
  if (!record(list) || !record(list.recipes) || !Array.isArray(list.manual) || !record(list.checked) ||
    !Object.entries(list.recipes).every(([id, n]) => String(Number(id)) === id && catalogue.has(Number(id)) && validPortions(n)) ||
    !list.manual.every(item => record(item) && typeof item.id === 'string' && idPattern.test(item.id) &&
      typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 120 && groceryGroups.includes(item.group)) ||
    new Set(list.manual.map(item => item.id)).size !== list.manual.length ||
    !Object.values(list.checked).every(x => typeof x === 'boolean')) {
    throw new Error('De back-up bevat ongeldige boodschappen.');
  }
  return state;
}

export const newId = () => globalThis.crypto?.randomUUID?.() ?? (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));

export function newPlan(today = localDate()) {
  return {
    id: newId(), date: today, time: '20:00', sport: 'Voetbal', groups: [], duration: 90,
    intensity: 'Normaal', meal: '18:00', mealPreviousDay: false, size: 'Normaal', lead: 45,
    delay: 30, preEnabled: true, postEnabled: true, hungry: false, nextMeal: false, hot: false
  };
}

export const nutrientKeys = ['kcal', 'protein', 'carbs', 'fat', 'fiber'];
export const nutrientLabels = { kcal: 'kcal', protein: 'eiwit', carbs: 'koolhydraten', fat: 'vet', fiber: 'vezels' };

export function scaleNutrition(recipe, portions) {
  return Object.fromEntries(nutrientKeys.map(key => [key, Number.isFinite(recipe[key]) ? recipe[key] * portions : null]));
}

export function formatQuantity(amount, unit) {
  if (amount === null) return '';
  let quantity = fmt.format(amount);
  if (unit === 'stuk' || unit === 'tl' || unit === 'teen') {
    const whole = Math.floor(amount);
    const fractions = ['⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'];
    const eighths = (amount - whole) * 8;
    const part = Number.isInteger(eighths) ? fractions[eighths - 1] : undefined;
    if (part) quantity = (whole ? whole + ' ' : '') + part;
    if (unit === 'teen' && amount > 1) unit = 'tenen';
  }
  return quantity + (unit && unit !== 'stuk' ? ' ' + unit : '');
}

export function formatIngredient(ingredient, portions = 1) {
  const { product, amount, unit, prep } = ingredient;
  const name = product === 'eieren' && amount * portions <= 1 ? 'ei' :
    product === 'volkoren wrap' && amount * portions > 1 ? 'volkoren wraps' : product;
  return {
    name: name + (prep ? ' (' + prep + ')' : ''),
    amount: formatQuantity(amount === null ? null : amount * portions, unit)
  };
}

export const formatNumber = value => Number.isFinite(value) ? fmt.format(Math.round(value * 10) / 10) : '—';
export const metric = (value, unit = 'g') => Number.isFinite(value) ? formatNumber(value) + (unit ? ' ' + unit : '') : '—';
export const formatPortions = n => formatQuantity(n, 'stuk') + (n > 1 ? ' porties' : ' portie');
export const normalizeText = value => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export function shoppingIngredient(item) {
  const product = normalizeText(item.product).replace(/\s+/g, ' ');
  const aliases = { ei: 'eieren', 'volkoren wraps': 'volkoren wrap' };
  const unit = { kg: 'g', l: 'ml' }[item.unit] ?? item.unit;
  return { ...item, product: Object.hasOwn(aliases, product) ? aliases[product] : product, unit,
    amount: item.amount === null ? null : item.amount * (unit === item.unit ? 1 : 1000), prep: '' };
}
const ingredientKey = item => 'ingredient:' + item.product + ':' + item.unit;

export function groceryRows(list, catalogue = byId) {
  const result = new Map();
  const sources = [list.recipes, ...Object.values(list.weekImports ?? {})];
  for (const source of sources) for (const [id, count] of Object.entries(source)) {
    for (const ingredient of catalogue.get(Number(id))?.ingredients ?? []) {
      const item = shoppingIngredient(ingredient);
      const key = ingredientKey(item);
      const row = result.get(key) ?? { ...item, key, amount: null };
      if (item.amount !== null) row.amount = (row.amount ?? 0) + item.amount * count;
      result.set(key, row);
    }
  }
  const rows = [...result.values()].map(row => ({ ...row, quantity: row.amount, ...formatIngredient(row) }));
  for (const item of list.manual) rows.push({ ...item, key: 'manual:' + item.id, amount: '', manualId: item.id });
  return rows.map(row => ({ ...row, checked: list.checked[row.key] === true }))
    .sort((a, b) => groceryGroups.indexOf(a.group) - groceryGroups.indexOf(b.group) || a.name.localeCompare(b.name, 'nl'));
}

export function reconcileChecks(list, previous, catalogue = byId) {
  const before = new Map(previous.map(row => [row.key, row]));
  const after = new Map(groceryRows(list, catalogue).map(row => [row.key, row]));
  for (const key of Object.keys(list.checked)) {
    const old = before.get(key);
    const now = after.get(key);
    if (!now || !old || (now.quantity ?? 0) > (old.quantity ?? 0) + 1e-6) delete list.checked[key];
  }
}

export function setGroceryPortions(list, id, count, catalogue = byId) {
  if (!catalogue.has(id) || (count !== 0 && !validPortions(count))) return false;
  const before = groceryRows(list, catalogue);
  if (count) list.recipes[id] = count;
  else delete list.recipes[id];
  reconcileChecks(list, before, catalogue);
  return true;
}

export function shoppingText(rows) {
  return groceryGroups.map(group => {
    const lines = rows.filter(row => row.group === group && !row.checked)
      .map(row => '☐ ' + [row.amount, row.name].filter(Boolean).join(' '));
    return lines.length ? group + '\n' + lines.join('\n') : '';
  }).filter(Boolean).join('\n\n');
}

export function tasteScore(recipe, state) {
  const { taste, texture } = state.preferences;
  return (taste === recipe.taste ? 5 : 0) + (recipe.tags.includes(texture) ? 4 : 0) +
    (state.favorites.includes(recipe.id) ? 5 : 0) + ((state.ratings[recipe.id] || 3) - 3) * 2;
}

export function searchRecipes(state, { query = '', filter = 'all', sort = 'taste' } = {}) {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  return recipes.filter(recipe => {
    const terms = normalizeText([recipe.name, recipe.description ?? '', recipe.taste, ...recipe.tags, ...recipe.ingredients.map(item => item.product)].join(' '));
    if (!words.every(word => terms.includes(word))) return false;
    if (filter === 'favorites') return state.favorites.includes(recipe.id);
    if (filter === 'quick') return recipe.minutes <= 5;
    if (filter === 'protein') return recipe.protein >= 20;
    return filter === 'all' || filter === recipe.taste;
  }).sort((a, b) => {
    if (sort === 'minutes') return a.minutes - b.minutes || a.id - b.id;
    if (sort === 'protein') return (b.protein ?? -1) - (a.protein ?? -1) || a.id - b.id;
    if (sort === 'name') return a.name.localeCompare(b.name, 'nl');
    return tasteScore(b, state) - tasteScore(a, state) || a.id - b.id;
  });
}

export function hazelnutRisk(recipe) {
  return ['contains', 'traces'].includes(recipe.hazelnut) ||
    [recipe.name, ...recipe.allergens, ...recipe.ingredients.map(item => item.product)].some(value =>
      /hazel[ -]?no(?:ot|ten)|hazelnut/i.test(value));
}

export function sportAdvice(plan, state, available = recipes) {
  const times = timing(plan);
  const endurance = ['Voetbal', 'Hardlopen', 'Padel', 'Fietsen'].includes(plan.sport);
  const long = endurance && plan.duration >= 60 && plan.intensity !== 'Rustig';
  const demanding = long || plan.duration >= 40 && plan.intensity === 'Zwaar';
  const strength = plan.sport === 'Krachttraining';
  const recentlyAte = times.sinceMeal >= 0 && times.sinceMeal < (plan.size === 'Groot' ? 150 : 90) && plan.size !== 'Klein';
  const light = plan.lead <= 45 || (plan.lead <= 90 && (state.sensitive || recentlyAte));
  const preOptional = !plan.hungry && (recentlyAte || (!demanding && plan.duration <= 45));
  const postOptional = plan.nextMeal || (!strength && !demanding && plan.duration <= 45);
  const prioritizeProtein = strength || demanding;
  const candidates = available.filter(recipe => !hazelnutRisk(recipe));
  const pre = candidates.filter(recipe => !recipe.custom || recipe.moments.includes('pre')).map(recipe => {
    const n = light ? 0.5 : 1;
    const nutrition = scaleNutrition(recipe, n);
    const known = [nutrition.carbs, nutrition.fat, nutrition.fiber].every(Number.isFinite);
    const heavy = light && known && (nutrition.fat > 5 || nutrition.fiber > 3 || (recipe.weight ?? 0) * n > 150);
    const reason = !known ? 'Koolhydraten, vet of vezels zijn deels onbekend.' : heavy ? 'Meer vet, vezels of volume voor dit korte tijdsvenster.' :
      nutrition.carbs >= 12 ? 'Levert koolhydraten in deze portie.' : 'Bevat weinig koolhydraten in deze portie.';
    const score = (heavy ? -50 : 0) + Math.min(nutrition.carbs ?? 0, 30) * 1.1 -
      (nutrition.fat ?? 0) * (light ? 4 : 1.3) - (nutrition.fiber ?? 0) * (light ? 3 : .7) -
      (light ? (recipe.weight ?? 0) * n / 35 : 0) - (known ? 0 : 35);
    return { recipe, i: recipe.id, n, reason, score: score + tasteScore(recipe, state) * .7 };
  });
  const post = candidates.filter(recipe => !recipe.custom || recipe.moments.includes('post')).map(recipe => {
    const reason = recipe.protein === null ? 'Eiwitgehalte onbekend.' : recipe.protein >= 20 && demanding && recipe.carbs >= 25 ? 'Combineert eiwit met koolhydraten.' :
      recipe.protein >= 20 && prioritizeProtein ? 'Eiwitrijke optie binnen je recepten.' :
        demanding && recipe.carbs >= 25 ? 'Koolhydraatrijke optie binnen je recepten.' : 'Aanvulling op je gewone maaltijden.';
    const score = Math.min(recipe.protein ?? 0, 30) * (prioritizeProtein ? 2 : .4) +
      Math.min(recipe.carbs ?? 0, 40) * (demanding ? 1.35 : .2) - (postOptional ? (recipe.kcal ?? 0) / 28 : 0) - (recipe.protein === null ? 30 : 0);
    return { recipe, i: recipe.id, n: 1, reason, score: score + tasteScore(recipe, state) * .8 };
  });
  const best = (a, b) => b.score - a.score || a.i - b.i;
  return { times, long, demanding, strength, light, preOptional, postOptional, pre: pre.sort(best), post: post.sort(best) };
}
