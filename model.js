import {
  builtinMap, byId, newId, sports, nutrientKeys, validDate, validPortions, parseTime,
  localDate, timing, tasteScore, sportAdvice, hazelnutRisk, scaleNutrition,
  maxPortions, shoppingIngredient, groceryRows, reconcileChecks, normalizeText
} from './core.js';
import { groceryGroups } from './data.js';

export const weekdays = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
export const units = [['g', 'gram'], ['kg', 'kg'], ['ml', 'ml'], ['l', 'liter'], ['stuk', 'stuk'], ['tl', 'tl'], ['el', 'el'], ['teen', 'teen'], ['', 'naar smaak']];
export const moments = [['work', 'Werk'], ['pre', 'Vóór sport'], ['post', 'Na sport']];
export const storageOptions = [['unknown', 'Onbekend'], ['cold', 'Koeling nodig'], ['shelf', 'Kan ongekoeld mee (volg het etiket)']];
export const hazelnutOptions = [['unknown', 'Etiketten of sporen onbekend'], ['checked', 'Etiketten zelf gecontroleerd'], ['traces', 'Mogelijk sporen van hazelnoot'], ['contains', 'Bevat hazelnoot']];
export const allergenOptions = ['gluten', 'ei', 'melk', 'pinda', 'noten', 'hazelnoot', 'soja', 'mosterd', 'sesam', 'selderij', 'vis', 'schaaldieren', 'weekdieren', 'lupine', 'sulfiet'];
export const strategies = [['personal','Persoonlijk'],['efficient','Efficiënt'],['varied','Gevarieerd'],['protein','Eiwitrijk'],['quick','Snel en gemakkelijk']];
export const defaultPrefs = { strategy: 'personal', free: 1, minutes: 20, protein: null, kcal: null };
export const knownRiskText = 'Dit recept noemt hazelnoot of mogelijke sporen. Uitgesloten van automatische suggesties.';
export const labelCheckText = 'Controleer bij ernstige hazelnootallergie alle actuele etiketten, bereidingsmateriaal en mogelijke kruisbesmetting.';
export const coldText = 'Bewaar bederfelijke snacks bij 4 °C. Laat ze nooit langer dan 2 uur buiten de koeling, ook tijdens vervoer. Gebruik een koeltas alleen als de snack koud blijft. Laat eten niet achter in een warme kas of auto.';

export const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const bounded = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
const oneOf = (value, choices) => choices.some(([key]) => key === value);
const idText = value => typeof value === 'string' && /^[\w:-]{1,120}$/.test(value);
export const trimText = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export const numberOrNull = value => value === '' || value === null || value === undefined ? null : Number(value);
const invalid = message => { throw new Error(message); };
export const isJPEG = bytes => bytes instanceof Uint8Array && bounded(bytes.byteLength, 5, 800000) &&
  bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217;

export function newRecipe() {
  return {
    name: '', description: '', servings: 1, minutes: 10, taste: 'hartig', texture: '',
    ingredients: [{ product: '', amount: null, unit: 'g', group: 'Overig' }],
    steps: [{ text: '', minutes: null }], nutrition: Object.fromEntries(nutrientKeys.map(key => [key, null])),
    nutritionSource: 'manual', vegetableGrams: null, allergens: [], labelsReviewed: false, hazelnut: 'unknown',
    storage: 'unknown', keep: '', portable: false, heat: false, moments: [], photo: null, photoVersion: '', archived: false
  };
}

export function validateRecipe(input) {
  if (!isObject(input) || !Number.isSafeInteger(input.id) || input.id < 1000) invalid('Een eigen recept heeft een ongeldig nummer.');
  const name = trimText(input.name, 100);
  const { servings, minutes, taste, texture } = input;
  if (!name || !validPortions(servings) || !Number.isInteger(minutes) || !bounded(minutes, 1, 300) ||
      !['hartig', 'zoet'].includes(taste) || !['','krokant','romig','fris','warm','drinkbaar'].includes(texture)) invalid('Controleer naam, tijd, smaak en aantal porties.');
  if (!Array.isArray(input.ingredients) || !bounded(input.ingredients.length, 1, 45)) invalid('Voeg één tot 45 ingrediënten toe.');
  const ingredients = input.ingredients.map(item => {
    const product = trimText(item?.product, 90);
    if (!product || (item.amount !== null && (!bounded(item.amount, .001, 50000) || !item.unit)) ||
      !oneOf(item.unit, units) || !groceryGroups.includes(item.group)) invalid('Controleer de ingrediënten, hoeveelheden en eenheden.');
    return { product, amount: item.amount, unit: item.amount === null ? '' : item.unit, group: item.group };
  });
  if (!Array.isArray(input.steps) || !bounded(input.steps.length, 1, 35)) invalid('Voeg één tot 35 bereidingsstappen toe.');
  const steps = input.steps.map(step => {
    const text = trimText(step?.text, 550);
    if (!text || (step.minutes !== null && (!Number.isInteger(step.minutes) || !bounded(step.minutes, 1, 240)))) invalid('Vul voor iedere stap een instructie en eventueel een geldige timer in.');
    return { text, minutes: step.minutes };
  });
  if (!isObject(input.nutrition) || !nutrientKeys.every(key =>
    input.nutrition[key] === null || bounded(input.nutrition[key], 0, key === 'kcal' ? 12000 : 1500))) invalid('Controleer de voedingswaarden. Laat onbekende waarden leeg.');
  const vegetableGrams = input.vegetableGrams ?? null;
  if (vegetableGrams !== null && !bounded(vegetableGrams, 0, 10000)) invalid('Vul tussen 0 en 10.000 g groente per portie in of laat dit leeg.');
  if (!Array.isArray(input.allergens) || !input.allergens.every(allergen => allergenOptions.includes(allergen)) ||
    !Array.isArray(input.moments) || !input.moments.every(moment => oneOf(moment, moments)) ||
    !oneOf(input.hazelnut, hazelnutOptions) || !oneOf(input.storage, storageOptions)) invalid('Controleer allergenen en bewaargegevens.');
  if (input.photo !== null && !isJPEG(input.photo)) invalid('De receptfoto heeft een ongeldig formaat.');
  return {
    id: input.id, name, description: trimText(input.description, 340), servings, minutes, taste, texture, ingredients, steps,
    nutrition: Object.fromEntries(nutrientKeys.map(key => [key, input.nutrition[key]])),
    nutritionSource: input.nutritionSource === 'estimate' ? 'estimate' : 'manual', vegetableGrams,
    allergens: [...new Set(input.allergens)], labelsReviewed: input.labelsReviewed === true, hazelnut: input.hazelnut,
    storage: input.storage, keep: trimText(input.keep, 440), portable: input.portable === true,
    heat: input.heat === true, moments: [...new Set(input.moments)],
    photo: input.photo, photoVersion: idText(input.photoVersion) ? input.photoVersion : '',
    archived: input.archived === true
  };
}

export function recipeFromOwn(item, image = '') {
  return {
    ...item, ...item.nutrition, custom: true, image, weight: null,
    tags: item.texture ? [item.texture] : [],
    ingredients: item.ingredients.map(ingredient => ({ ...ingredient, amount: ingredient.amount === null ? null : ingredient.amount / item.servings })),
    steps: item.steps.map(step => step.text), stepTimers: item.steps.map(step => step.minutes)
  };
}

export function catalogueFor(state) {
  return new Map([...builtinMap, ...state.customRecipes.map(item => [item.id, recipeFromOwn(item)])]);
}

export function practical(recipe) {
  if (recipe.custom) return { storage: recipe.storage, portable: recipe.portable, heat: recipe.heat,
    work: recipe.moments.includes('work'), note: recipe.keep, labelsReviewed: recipe.labelsReviewed, checkedHazelnut: recipe.hazelnut === 'checked' };
  return { storage: recipe.id === 5 ? 'shelf' : 'cold', portable: true, heat: false, work: true,
    note: recipe.id === 5 ? 'Neem de banaan heel mee. Bewaar honing en kaneel apart en voeg ze in de pauze toe.' : 'Vervoer gekoeld en volg de bewaarinstructies van de gebruikte producten.',
    labelsReviewed: false, checkedHazelnut: false };
}

export function nextOwnId(state) {
  const next = state.nextRecipeId;
  state.nextRecipeId += 1;
  return next;
}

export function newWorkProfile() {
  return { id: newId(), name: '', days: [], start: '08:00', end: '16:00', breaks: ['10:30', '13:00'], intensity: 'Normaal',
    fridge: false, coolBag: false, microwave: false, prep: 10, hot: false, afterSport: '', sportTime: '18:00', count: 2, active: true,
    goal: 'balanced' };
}

const offsetInShift = (start, time) => (parseTime(time) - parseTime(start) + 1440) % 1440;
export function validateWork(input) {
  if (!isObject(input) || !idText(input.id) || !trimText(input.name, 60) ||
    !Array.isArray(input.days) || !input.days.length || !input.days.every(day => Number.isInteger(day) && bounded(day, 0, 6)) ||
    ![input.start, input.end, input.sportTime].every(t => Number.isFinite(parseTime(t))) ||
    offsetInShift(input.start, input.end) <= 0 || !['Rustig','Normaal','Zwaar'].includes(input.intensity) ||
    !['', ...sports].includes(input.afterSport) || !Number.isInteger(input.prep) || !bounded(input.prep, 1, 180) ||
    !Number.isInteger(input.count) || !bounded(input.count, 0, 4) || !['balanced','protein','light','light-protein'].includes(input.goal)) invalid('Controleer de naam, werkdagen, werktijden en hoeveel snackmomenten je wilt.');
  if (!Array.isArray(input.breaks) || input.breaks.length > 8 || input.breaks.some(t =>
    !Number.isFinite(parseTime(t)) || offsetInShift(input.start, t) >= offsetInShift(input.start, input.end))) invalid('Vul pauzes in als HH:MM binnen je dienst, bijvoorbeeld 10:30, 13:00.');
  if (input.afterSport && offsetInShift(input.start, input.sportTime) < offsetInShift(input.start, input.end)) {
    invalid('Kies voor sport na werk een starttijd buiten je dienst.');
  }
  return {
    id: input.id, name: trimText(input.name, 60), days: [...new Set(input.days)].sort(),
    start: input.start, end: input.end, breaks: [...new Set(input.breaks)].sort((a, b) => offsetInShift(input.start, a) - offsetInShift(input.start, b)),
    intensity: input.intensity, fridge: input.fridge === true, coolBag: input.coolBag === true, microwave: input.microwave === true,
    prep: input.prep, hot: input.hot === true, afterSport: input.afterSport, sportTime: input.sportTime,
    count: input.count, active: input.active === true, goal: input.goal
  };
}
export function checkWorkOverlap(profiles) {
  const days = profiles.filter(profile => profile.active).flatMap(profile => profile.days);
  if (days.length !== new Set(days).size) invalid('Er kan per weekdag één actief werkprofiel zijn. Pauzeer het overlappende profiel of wijzig de werkdagen.');
}

export function addDays(date, count) {
  const time = new Date(date + 'T12:00:00');
  time.setDate(time.getDate() + count);
  return localDate(time);
}
const weekday = date => (new Date(date + 'T12:00:00').getDay() + 6) % 7;
export const monday = date => addDays(date, -weekday(date));
export const workProfile = (state, date) => state.workProfiles.find(profile => profile.active && profile.days.includes(weekday(date)));

function timedSlot(date, minute) {
  const day = Math.floor(minute / 1440);
  const inDay = minute - day * 1440;
  return { date: addDays(date, day), time: [Math.floor(inDay / 60), inDay % 60].map(n => String(n).padStart(2, '0')).join(':') };
}

export function workSlots(profile, date) {
  const duration = offsetInShift(profile.start, profile.end);
  const start = parseTime(profile.start);
  const offsets = profile.breaks.map(time => offsetInShift(profile.start, time));
  for (let i = 1; offsets.length < profile.count && i <= profile.count + 1; i += 1) {
    const proposed = Math.floor(duration * i / (profile.count + 2));
    if (!offsets.includes(proposed)) offsets.push(proposed);
  }
  return offsets.sort((a, b) => a - b).slice(0, profile.count).map((offset, index) => ({
    id: date + ':work:' + index, kind: 'work', profile, ...timedSlot(date, start + offset)
  }));
}

function sportSlots(plan) {
  const times = timing(plan);
  return ['pre', 'post'].filter(phase => plan[phase + 'Enabled'] && plan[phase + 'Pick']?.i !== -1).map(phase => ({
    id: plan.date + ':' + plan.id + ':' + phase, kind: phase, plan, pick: plan[phase + 'Pick'],
    ...timedSlot(plan.date, times[phase])
  }));
}

export function workoutAfterShift(profile, date) {
  if (!profile?.afterSport) return null;
  return { date: addDays(date, profile.sportTime < profile.start ? 1 : 0), time: profile.sportTime, sport: profile.afterSport };
}

export function workEligible(recipe, profile) {
  const info = practical(recipe);
  if (hazelnutRisk(recipe) || recipe.archived || !info.portable || !info.work || recipe.minutes > profile.prep) return false;
  if (info.heat && !profile.microwave) return false;
  return info.storage === 'shelf' || ((profile.fridge || profile.coolBag) && info.storage === 'cold');
}

export function validatePrefs(input) {
  if (!isObject(input) || !oneOf(input.strategy, strategies) || !Number.isInteger(input.free) || !bounded(input.free, 0, 3) ||
    !Number.isInteger(input.minutes) || !bounded(input.minutes, 1, 180) ||
    (input.protein !== null && !bounded(input.protein, 0, 150)) ||
    (input.kcal !== null && !bounded(input.kcal, 0, 2000))) invalid('Controleer de weekstrategie en voedingsvoorkeuren.');
  return { strategy: input.strategy, free: input.free, minutes: input.minutes, protein: input.protein, kcal: input.kcal };
}

export const emptyWeek = () => ({ prefs: { ...defaultPrefs }, entries: [], removed: [] });
const slotKinds = ['work','free','pre','post','manual'];
export function validateWeek(input, start, catalogue) {
  if (!validDate(start) || monday(start) !== start || !isObject(input) || !Array.isArray(input.entries) || input.entries.length > 140 ||
    !Array.isArray(input.removed) || input.removed.length > 280 || !input.removed.every(idText)) invalid('De back-up bevat een ongeldige week.');
  const prefs = validatePrefs(input.prefs);
  const entries = input.entries.map(entry => {
    if (!isObject(entry) || !idText(entry.id) || !validDate(entry.date) || entry.date < start || entry.date > addDays(start, 6) ||
      !Number.isFinite(parseTime(entry.time)) || !slotKinds.includes(entry.kind) ||
      (entry.recipeId !== null && !catalogue.has(entry.recipeId)) || !validPortions(entry.portions)) invalid('Een gepland snackmoment heeft ongeldige gegevens.');
    return { id: entry.id, date: entry.date, time: entry.time, kind: entry.kind, recipeId: entry.recipeId,
      portions: entry.portions, pinned: entry.pinned === true, reason: trimText(entry.reason, 300) };
  });
  if (new Set(entries.map(entry => entry.id)).size !== entries.length) invalid('Deze week bevat dubbele momenten.');
  return { prefs, entries, removed: [...new Set(input.removed)] };
}

export function planSlots(state, start, prefs) {
  const last = addDays(start, 6);
  const workouts = new Set(state.plans.map(plan => plan.date));
  const slots = [];
  for (let d = -1; d < 7; d += 1) {
    const date = addDays(start, d);
    const profile = workProfile(state, date);
    if (profile) {
      slots.push(...workSlots(profile, date));
      const after = workoutAfterShift(profile, date);
      if (after && !workouts.has(after.date)) {
        slots.push({ id: date + ':after-work', kind: 'pre', recurrence: after,
          ...timedSlot(after.date, parseTime(after.time) - 45) });
      }
    } else if (d >= 0 && !workouts.has(date)) {
      for (let i = 0; i < prefs.free; i += 1) slots.push({ id: date + ':free:' + i, date, time: ['11:00','15:30','20:00'][i], kind: 'free' });
    }
  }
  slots.push(...state.plans.filter(plan => plan.date >= addDays(start, -1) && plan.date <= addDays(last, 1)).flatMap(sportSlots));
  return slots.filter(slot => slot.date >= start && slot.date <= last)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) || Number(Boolean(b.plan)) - Number(Boolean(a.plan)));
}

const ingredientProducts = recipe => new Set(recipe.ingredients.map(item => shoppingIngredient(item).product));
function candidatesFor(slot, catalogue, prefs, state) {
  const all = [...catalogue.values()].filter(recipe => !recipe.archived && !hazelnutRisk(recipe));
  if (slot.pick?.i >= 0) {
    const picked = catalogue.get(slot.pick.i);
    if (picked && !hazelnutRisk(picked)) return [{ recipe: picked, n: slot.pick.n, rank: 0, reason: 'Snack gekozen bij je training.' }];
  }
  if (slot.plan) return sportAdvice(slot.plan, state, all)[slot.kind]
    .filter(option => option.recipe.minutes <= prefs.minutes)
    .map((option, index) => ({ ...option, rank: Math.max(0, 22 - index * 2) }));
  return all.filter(recipe => recipe.minutes <= prefs.minutes &&
    (slot.profile ? workEligible(recipe, slot.profile) : slot.kind !== 'pre' || !recipe.custom || recipe.moments.includes('pre')))
    .map(recipe => ({ recipe, n: slot.recurrence ? .5 : 1, rank: 0,
      reason: slot.profile ? practical(recipe).storage === 'shelf' ? 'Mee te nemen volgens het bewaaradvies.' :
        'Mee te nemen als de snack gekoeld blijft.' : slot.recurrence ? 'Kleine suggestie vóór je sport na werk.' : 'Past binnen je voorbereidingstijd.' }));
}

export function generateWeek(state, start, week, catalogue = byId) {
  const { prefs } = week;
  const entries = week.entries.filter(entry => entry.pinned || entry.kind === 'manual');
  const counts = new Map();
  for (const entry of entries) if (entry.recipeId !== null) counts.set(entry.recipeId, (counts.get(entry.recipeId) ?? 0) + 1);
  const taken = new Set(entries.map(entry => entry.id));
  const clock = new Set(entries.map(entry => entry.date + entry.time));
  const removed = new Set(week.removed);
  for (const slot of planSlots(state, start, prefs)) {
    if (taken.has(slot.id) || removed.has(slot.id) || clock.has(slot.date + slot.time)) continue;
    const available = candidatesFor(slot, catalogue, prefs, state);
    const previousProducts = new Set();
    for (const entry of entries) {
      const before = catalogue.get(entry.recipeId);
      if (!before) continue;
      const days = Math.round(Math.abs(new Date(slot.date) - new Date(entry.date)) / 864e5);
      if (days > 6) continue;
      for (const item of before.ingredients) {
        // Proximity favors using up perishables; it does not provide a shelf-life estimate.
        if (days <= (item.group === 'Voorraadkast' ? 6 : 2)) previousProducts.add(shoppingIngredient(item).product);
      }
    }
    const scored = available.map(option => {
      const { recipe, n, rank } = option;
      const nutrition = scaleNutrition(recipe, n);
      const products = ingredientProducts(recipe);
      const overlap = [...products].filter(product => previousProducts.has(product)).length;
      const repeats = counts.get(recipe.id) ?? 0;
      const sharesToday = entries.some(entry => entry.date === slot.date && entry.recipeId === recipe.id);
      let score = tasteScore(recipe, state) * (prefs.strategy === 'personal' ? 1.8 : 1) + rank;
      score += Math.min(4, overlap) * (prefs.strategy === 'efficient' ? 7 : 1.5);
      score -= repeats * (prefs.strategy === 'varied' ? 16 : prefs.strategy === 'efficient' ? 5 : 8);
      score -= sharesToday ? 22 : 0;
      score -= recipe.minutes * (prefs.strategy === 'quick' ? 2.1 : .45);
      if (prefs.strategy === 'protein' || ['protein','light-protein'].includes(slot.profile?.goal) || slot.profile?.intensity === 'Zwaar') score += Math.min(nutrition.protein ?? 0, 35) * 1.1;
      if (['light','light-protein'].includes(slot.profile?.goal) && nutrition.kcal !== null) score -= Math.max(0, nutrition.kcal - 200) / 20;
      if (slot.profile?.hot && recipe.tags.includes('fris')) score += 3;
      if (prefs.protein !== null) score -= nutrition.protein === null ? 24 : Math.max(0, prefs.protein - nutrition.protein) * 2;
      if (prefs.kcal !== null) score -= nutrition.kcal === null ? 24 : Math.max(0, nutrition.kcal - prefs.kcal) / 7;
      return { ...option, score, overlap };
    }).sort((a, b) => b.score - a.score || a.recipe.id - b.recipe.id);
    const winner = scored[0];
    const reason = winner ? [winner.reason, winner.overlap > 0 && winner.reason !== 'Snack gekozen bij je training.' ?
      'Deelt ' + winner.overlap + ' ' + (winner.overlap === 1 ? 'ingrediënt' : 'ingrediënten') + ' met snacks rond deze dag.' : '',
      state.favorites.includes(winner.recipe.id) ? 'Een van je favorieten.' : ''].filter(Boolean).join(' ') :
      'Geen passende suggestie. Bekijk tijd, koeling of je recepten.';
    entries.push({ id: slot.id, date: slot.date, time: slot.time, kind: slot.kind, recipeId: winner?.recipe.id ?? null,
      portions: winner?.n ?? 1, pinned: false, reason });
    clock.add(slot.date + slot.time);
    if (winner) counts.set(winner.recipe.id, (counts.get(winner.recipe.id) ?? 0) + 1);
  }
  return { ...week, entries: entries.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)) };
}

export function workSuggestions(state, profile, catalogue = byId) {
  return [...catalogue.values()].filter(recipe => workEligible(recipe, profile))
    .map(recipe => {
      let score = tasteScore(recipe, state) * 2 - recipe.minutes * .5;
      if (['protein','light-protein'].includes(profile.goal) || profile.intensity === 'Zwaar') score += Math.min(30, recipe.protein ?? 0);
      if (['light','light-protein'].includes(profile.goal) && recipe.kcal !== null) score -= Math.max(0, recipe.kcal - 200) / 20;
      if (profile.hot && recipe.tags.includes('fris')) score += 3;
      return { recipe, score };
    }).sort((a, b) => b.score - a.score || a.recipe.id - b.recipe.id).slice(0, 4).map(item => item.recipe);
}

export function nutritionTotal(entries, catalogue = byId) {
  const result = Object.fromEntries(nutrientKeys.map(key => [key, { amount: 0, missing: 0, known: 0 }]));
  for (const entry of entries) {
    const recipe = catalogue.get(entry.recipeId);
    if (!recipe) continue;
    for (const [key, value] of Object.entries(scaleNutrition(recipe, entry.portions))) {
      if (value === null) result[key].missing += 1;
      else {
        result[key].amount += value;
        result[key].known += 1;
      }
    }
  }
  return result;
}

export function syncWeekGroceries(state, key, catalogue = byId) {
  const week = state.weeks[key];
  if (!week) return 0;
  const previous = groceryRows(state.grocery, catalogue);
  const next = Object.create(null);
  for (const entry of week.entries) if (entry.recipeId !== null && catalogue.has(entry.recipeId) &&
    !hazelnutRisk(catalogue.get(entry.recipeId))) {
    next[entry.recipeId] = (next[entry.recipeId] ?? 0) + entry.portions;
  }
  if (Object.keys(next).length) state.grocery.weekImports[key] = next;
  else delete state.grocery.weekImports[key];
  reconcileChecks(state.grocery, previous, catalogue);
  return Object.values(next).reduce((a, b) => a + b, 0);
}

export function dailyEntries(state, date) {
  return state.weeks[monday(date)]?.entries.filter(entry => entry.date === date) ?? [];
}

export const filterTextKeys = ['include','exclude'];
export const filterFlags = ['favorite','untried','positive','work','pre','post','portable','reviewed','own'];
export const filterRangeKeys = [...nutrientKeys.flatMap(key => [key + 'Min', key + 'Max']), 'minutesMax'];
export function validateFilter(input) {
  if (!isObject(input)) invalid('Dit filterprofiel is ongeldig.');
  const clean = {};
  for (const key of filterRangeKeys) {
    const n = numberOrNull(input[key]);
    if (n !== null && !bounded(n, 0, key.startsWith('kcal') ? 12000 : 1500)) invalid('Gebruik positieve getallen in je filters.');
    if (n !== null) clean[key] = n;
  }
  for (const key of nutrientKeys) if (clean[key + 'Min'] !== undefined && clean[key + 'Max'] !== undefined &&
    clean[key + 'Min'] > clean[key + 'Max']) invalid('Een minimum kan niet hoger zijn dan het maximum.');
  for (const flag of filterFlags) if (input[flag] === true) clean[flag] = true;
  for (const key of filterTextKeys) if (trimText(input[key], 160)) clean[key] = trimText(input[key], 160);
  if (['zoet','hartig'].includes(input.taste)) clean.taste = input.taste;
  if (['cold','shelf','unknown'].includes(input.storage)) clean.storage = input.storage;
  if (Array.isArray(input.allergens) && input.allergens.every(allergen => allergenOptions.includes(allergen)) && input.allergens.length) {
    clean.allergens = [...new Set(input.allergens)];
  }
  return clean;
}

export function matchesFilter(recipe, filter, state) {
  for (const key of nutrientKeys) {
    const min = filter[key + 'Min'];
    const max = filter[key + 'Max'];
    const value = recipe[key];
    if ((min !== undefined || max !== undefined) &&
      (!Number.isFinite(value) || (min !== undefined && value < min) || (max !== undefined && value > max))) return false;
  }
  if (filter.minutesMax !== undefined && recipe.minutes > filter.minutesMax) return false;
  if (filter.taste && recipe.taste !== filter.taste) return false;
  const info = practical(recipe);
  if (filter.storage && filter.storage !== info.storage) return false;
  if ((filter.favorite && !state.favorites.includes(recipe.id)) || (filter.untried && (state.ratings[recipe.id] || state.cooking[recipe.id]?.complete)) ||
    (filter.positive && !(state.ratings[recipe.id] >= 4)) || (filter.portable && !info.portable) ||
    (filter.own && !recipe.custom) || (filter.work && (!info.work || hazelnutRisk(recipe))) ||
    (filter.pre && (hazelnutRisk(recipe) || (recipe.custom && !recipe.moments.includes('pre')))) ||
    (filter.post && (hazelnutRisk(recipe) || (recipe.custom && !recipe.moments.includes('post'))))) return false;
  if ((filter.reviewed || filter.allergens?.length) && !info.labelsReviewed) return false;
  if (filter.allergens?.length) {
    if (filter.allergens.some(allergen => (allergen === 'hazelnoot' || allergen === 'noten') && (!info.checkedHazelnut || hazelnutRisk(recipe)))) return false;
    if (filter.allergens.some(allergen => recipe.allergens.some(found => normalizeText(found).includes(allergen)))) return false;
  }
  const items = [...ingredientProducts(recipe)];
  const terms = key => normalizeText(filter[key] ?? '').split(',').map(x => x.trim()).filter(Boolean);
  return terms('include').every(word => items.some(item => item.includes(word))) &&
    !terms('exclude').some(word => items.some(item => item.includes(word)));
}

export function newCook(servings = 1) {
  return { servings, step: -1, checked: [], timers: [], complete: false };
}

export function validateCook(input) {
  if (!isObject(input) || !validPortions(input.servings) ||
    !Number.isInteger(input.step) || !bounded(input.step, -1, 35) || !Array.isArray(input.checked) ||
    input.checked.length > 45 || !input.checked.every(i => Number.isInteger(i) && bounded(i, 0, 44)) ||
    !Array.isArray(input.timers) || input.timers.length > 8) invalid('Deze back-up bevat ongeldige kookvoortgang.');
  const timers = input.timers.map(timer => {
    if (!isObject(timer) || !idText(timer.id) || !trimText(timer.label, 90) ||
      !bounded(timer.endAt, 0, 864e13) ||
      (timer.remaining !== null && !bounded(timer.remaining, 0, 240 * 60000))) invalid('Een kooktimer heeft ongeldige gegevens.');
    return { id: timer.id, label: trimText(timer.label, 90), endAt: timer.endAt, remaining: timer.remaining };
  });
  if (new Set(timers.map(timer => timer.id)).size !== timers.length) invalid('Deze sessie bevat dubbele timers.');
  return { servings: input.servings, step: input.step, checked: [...new Set(input.checked)], timers, complete: input.complete === true };
}

export const secondsLeft = (timer, now = Date.now()) => Math.ceil(Math.max(0, timer.remaining ?? (timer.endAt - now)) / 1000);
export const timerLabel = seconds => Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
export function makeTimer(label, minutes, now = Date.now()) {
  if (!Number.isInteger(minutes) || !bounded(minutes, 1, 240)) invalid('Kies een timer tussen 1 en 240 minuten.');
  return { id: newId(), label: trimText(label, 90) || 'Timer', endAt: now + minutes * 60000, remaining: null };
}
export function stepMinutes(recipe, index) {
  if (recipe.custom) return recipe.stepTimers[index] ?? null;
  const hints = { 20: { 2: 2 }, 21: { 1: 2 }, 22: { 1: 3 } };
  return hints[recipe.id]?.[index] ?? null;
}

export const maxPlanPortions = maxPortions * 140;
