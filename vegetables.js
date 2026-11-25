import { localDate, normalizeText, validDate, validPortions } from './core.js';

export const vegetableGoal = 250;
export const vegetableGuide = 'https://www.voedingscentrum.nl/encyclopedie/groente.aspx';
export const maxVegetableEntries = 10000;
export const emptyVegetables = () => ({ heightCm: null, weightKg: null, entries: [] });

// Approximate edible grams per whole item for the measures used in SnackLab's recipes.
// Gram and kilogram entries use their specified weight instead.
const pieceWeights = new Map([['komkommer', 400], ['avocado', 180]]);
const vegetables = new Set(['komkommer','avocado','sla','ijsbergsla','veldsla','romaine','rucola','spinazie','snackwortel',
  'snackwortels','wortel','wortels','winterpeen','bospeen','tomaat','tomaten','cherrytomaat','cherrytomaten','snoeptomaat',
  'snoeptomaten','paprika','paprikas','puntpaprika','broccoli','bloemkool','courgette','aubergine','champignons',
  'champignon','ui','uien','rode ui','bosui','prei','radijs','biet','rode biet','bietjes','bleekselderij','selderij',
  'asperge','asperges','spruiten','pompoen','boerenkool','paksoi','snijbonen','sperziebonen','doperwten',
  'peultjes','taugé','kool','kropsla','rode kool','witte kool','spitskool','savooiekool','venkel'].map(normalizeText));
const otherProduce = new Set(['knoflook','peper','appel','appels','banaan','bananen','mango','mangos','aardbei','aardbeien',
  'framboos','frambozen','blauwe bessen','bosbessen','peer','peren','sinaasappel','mandarijn','kiwi','ananas','druiven',
  'citroen','limoen','gember','aardappel','aardappelen','zoete aardappel','kikkererwten','linzen']);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const range = (value,min,max) => Number.isFinite(value) && value >= min && value <= max;
const clean = value => typeof value === 'string' ? value.trim().slice(0,110) : '';
const fail = message => { throw new Error(message); };

export function vegetableIngredient(item) {
  const name = normalizeText(item.product).replaceAll("'", '').replace(/\s+/g,' ');
  if (!vegetables.has(name)) {
    return { grams: 0, unknown: item.group === 'Groente & fruit' && !otherProduce.has(name), estimated: false };
  }
  if (!Number.isFinite(item.amount)) return { grams: 0, unknown: true, estimated: false };
  if (item.unit === 'g' || item.unit === 'kg') {
    return { grams: item.amount * (item.unit === 'kg' ? 1000 : 1), unknown: false, estimated: false };
  }
  if (item.unit === 'stuk' && pieceWeights.has(name)) return { grams: item.amount * pieceWeights.get(name), unknown: false, estimated: true };
  return { grams: 0, unknown: true, estimated: false };
}

export function recipeVegetables(recipe, portions = 1) {
  if (Number.isFinite(recipe.vegetableGrams)) return { grams: recipe.vegetableGrams * portions, unknown: false, estimated: false };
  const result = { grams: 0, unknown: false, estimated: false };
  for (const item of recipe.ingredients) {
    const contribution = vegetableIngredient(item);
    result.grams += contribution.grams * portions;
    result.unknown ||= contribution.unknown;
    result.estimated ||= contribution.estimated;
  }
  return result;
}

export function groceryVegetables(grocery, catalogue) {
  const result = { grams: 0, unknown: false, estimated: false };
  for (const source of [grocery.recipes, ...Object.values(grocery.weekImports ?? {})]) {
    for (const [id,n] of Object.entries(source)) {
      const recipe = catalogue.get(Number(id));
      if (!recipe) continue;
      const info = recipeVegetables(recipe,n);
      result.grams += info.grams;
      result.unknown ||= info.unknown;
      result.estimated ||= info.estimated;
    }
  }
  return result;
}

export function validateBody(heightCm, weightKg) {
  if (heightCm !== null && !range(heightCm, 50, 260)) fail('Vul een lengte tussen 50 en 260 cm in.');
  if (weightKg !== null && !range(weightKg, 20, 500)) fail('Vul een gewicht tussen 20 en 500 kg in.');
  const round = value => value === null ? null : Math.round(value * 10) / 10;
  return { heightCm: round(heightCm), weightKg: round(weightKg) };
}

export function validateVegetableEntry(entry) {
  if (!plain(entry) || typeof entry.id !== 'string' || !/^[\w-]{1,90}$/.test(entry.id) || !validDate(entry.date) || !clean(entry.name)) {
    fail('Een regel in het groentelogboek is ongeldig.');
  }
  const { id,date,recipeId,portions,grams } = entry;
  const name = clean(entry.name);
  if (recipeId === null) {
    if (!range(grams, 1, 10000)) fail('Vul tussen 1 en 10.000 g groente in.');
    return { id,date,name,recipeId,portions:null,grams:Math.round(grams * 10) / 10, estimated:false };
  }
  if (!Number.isSafeInteger(recipeId) || recipeId < 0 || !validPortions(portions) || !range(grams, .001, 1e9)) {
    fail('Controleer het aantal porties en de groentehoeveelheid.');
  }
  return { id,date,name,recipeId,portions,grams,estimated:entry.estimated === true };
}

export function validateVegetables(input) {
  if (!plain(input) || !Array.isArray(input.entries) || input.entries.length > maxVegetableEntries) fail('De groentemetergegevens zijn ongeldig.');
  const entries = input.entries.map(validateVegetableEntry);
  if (new Set(entries.map(entry => entry.id)).size !== entries.length) fail('De back-up bevat dubbele regels in het groentelogboek.');
  return { ...validateBody(input.heightCm,input.weightKg), entries };
}

// For recipe records, grams stores the amount per serving at the time of logging.
export const entryVegetables = entry => entry.grams * (entry.portions ?? 1);

export function dayVegetables(vegetableState, date = localDate()) {
  const entries = vegetableState.entries.filter(entry => entry.date === date);
  const grams = entries.reduce((sum,entry) => sum + entryVegetables(entry),0);
  return { entries, grams, estimated: entries.some(entry => entry.estimated) };
}

export function vegetableProgress(grams) {
  return { percent: Math.round(grams / vegetableGoal * 100), remaining: Math.max(0,vegetableGoal - grams) };
}
