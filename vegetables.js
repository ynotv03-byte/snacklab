import { hazelnutRisk, localDate, normalizeText, validDate, validPortions } from './core.js';

export const produceGoals = { vegetable: 250, fruit: 200 };
export const produceGuides = {
  vegetable: 'https://www.voedingscentrum.nl/encyclopedie/groente.aspx',
  fruit: 'https://www.voedingscentrum.nl/encyclopedie/fruit.aspx'
};
export const maxProduceEntries = 10000;
export const emptyVegetables = () => ({ heightCm: null, weightKg: null, entries: [] });

// Approximate edible grams per item. The fruit weights use the examples in
// Voedingscentrum's Schijf van Vijf (https://www.voedingscentrum.nl/adh).
const pieceWeights = new Map([['komkommer', 400], ['avocado', 180],
  ['banaan', 130], ['bananen', 130], ['appel', 135], ['appels', 135], ['peer', 180], ['peren', 180], ['mandarijn', 60], ['mandarijnen', 60]]);
const vegetables = new Set(['komkommer','avocado','sla','ijsbergsla','veldsla','romaine','rucola','spinazie','snackwortel',
  'snackwortels','wortel','wortels','winterpeen','bospeen','tomaat','tomaten','cherrytomaat','cherrytomaten','snoeptomaat',
  'snoeptomaten','paprika','paprikas','puntpaprika','broccoli','bloemkool','courgette','aubergine','champignons',
  'champignon','ui','uien','rode ui','bosui','prei','radijs','biet','rode biet','bietjes','bleekselderij','selderij',
  'asperge','asperges','spruiten','pompoen','boerenkool','paksoi','snijbonen','sperziebonen','doperwten',
  'peultjes','taugé','kool','kropsla','rode kool','witte kool','spitskool','savooiekool','venkel'].map(normalizeText));
const fruits = new Set(['appel','appels','banaan','bananen','mango','mangos','aardbei','aardbeien','framboos','frambozen',
  'blauwe bessen','blauwe bes','blauwe bosbessen','bosbessen','rodebessen','rode bessen','bramen','braam','kers','kersen',
  'peer','peren','sinaasappel','sinaasappels','mandarijn','mandarijnen','kiwi','kiwis','ananas','druif','druiven',
  'citroen','citroenen','limoen','limoenen','perzik','perziken','nectarine','nectarines','pruim','pruimen','abrikoos',
  'abrikozen','meloen','watermeloen','galia meloen','grapefruit','papaja','passievrucht','granaatappel','vijg','vijgen']);
const otherProduce = new Set(['knoflook','peper','gember','aardappel','aardappelen','zoete aardappel','kikkererwten','linzen']);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const range = (value,min,max) => Number.isFinite(value) && value >= min && value <= max;
const clean = value => typeof value === 'string' ? value.trim().slice(0,110) : '';
const fail = message => { throw new Error(message); };
const info = (grams = 0, unknown = false, estimated = false) => ({ grams, unknown, estimated });
const totals = () => ({ vegetable:info(), fruit:info() });

function ingredientProduce(item) {
  const name = normalizeText(item.product).replace(/['’]/g,'').replace(/\s+/g,' ')
    .replace(/^(?:(?:vers(?:e)?|diepvries|bevroren) )+/,'');
  const kind = vegetables.has(name) ? 'vegetable' : fruits.has(name) ? 'fruit' : null;
  if (!kind) {
    const unknown = item.group === 'Groente & fruit' && !otherProduce.has(name);
    return { vegetable:info(0,unknown), fruit:info(0,unknown) };
  }
  let measurement = info(0,true);
  if (Number.isFinite(item.amount)) {
    if (item.unit === 'g' || item.unit === 'kg') measurement = info(item.amount * (item.unit === 'kg' ? 1000 : 1));
    if (item.unit === 'stuk' && pieceWeights.has(name)) measurement = info(item.amount * pieceWeights.get(name),false,true);
  }
  return { ...totals(), [kind]:measurement };
}

function accumulate(target, source, factor = 1) {
  for (const kind of Object.keys(produceGoals)) {
    target[kind].grams += source[kind].grams * factor;
    target[kind].unknown ||= source[kind].unknown;
    target[kind].estimated ||= source[kind].estimated;
  }
}

export function recipeProduce(recipe, portions = 1) {
  const result = totals();
  for (const item of recipe.ingredients) accumulate(result,ingredientProduce(item),portions);
  const fields = { vegetable:recipe.vegetableGrams, fruit:recipe.fruitGrams };
  for (const kind of Object.keys(fields)) {
    if (Number.isFinite(fields[kind])) result[kind] = info(fields[kind] * portions);
  }
  return { ...result, drinkable:recipe.tags?.includes('drinkbaar') === true };
}

export function loggableProduce(produce) {
  const grams = produce.vegetable.unknown ? 0 : produce.vegetable.grams;
  const fruitGrams = produce.drinkable || produce.fruit.unknown ? 0 : produce.fruit.grams;
  return { grams, fruitGrams,
    estimated:grams > 0 && produce.vegetable.estimated, fruitEstimated:fruitGrams > 0 && produce.fruit.estimated };
}

export const canLogSnack = recipe => Boolean(recipe && !recipe.archived && !hazelnutRisk(recipe));

export function recentSnacks(entries, catalogue, date) {
  const recent = [];
  const seen = new Set();
  // Stable sort preserves newest insertion first within each day, including backdated entries.
  for (const entry of [...entries].reverse().sort((a,b) => b.date.localeCompare(a.date))) {
    if (entry.date > date || seen.has(entry.recipeId) || !canLogSnack(catalogue.get(entry.recipeId))) continue;
    seen.add(entry.recipeId);
    recent.push(entry);
    if (recent.length === 3) break;
  }
  return recent;
}

export function groceryProduce(grocery, catalogue) {
  const result = totals();
  for (const source of [grocery.recipes, ...Object.values(grocery.weekImports ?? {})]) {
    for (const [id,n] of Object.entries(source)) {
      const recipe = catalogue.get(Number(id));
      if (recipe) accumulate(result,recipeProduce(recipe,n));
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

export function validateProduceEntry(entry) {
  if (!plain(entry) || typeof entry.id !== 'string' || !/^[\w-]{1,90}$/.test(entry.id) || !validDate(entry.date) || !clean(entry.name)) {
    fail('Een regel in het eetlogboek is ongeldig.');
  }
  const { id,date,recipeId,portions,grams,slotId } = entry;
  const name = clean(entry.name);
  // SnackLab 6.3 stored only the vegetable amount. Preserve those entries verbatim.
  const fruitGrams = entry.fruitGrams === undefined ? 0 : entry.fruitGrams;
  if (recipeId === null) {
    if (!range(grams,0,10000) || !range(fruitGrams,0,10000) || Math.max(grams,fruitGrams) < 1) {
      fail('Vul minstens 1 g groente of fruit in, met maximaal 10.000 g per soort.');
    }
    return { id,date,name,recipeId,portions:null,grams:Math.round(grams * 10) / 10,
      fruitGrams:Math.round(fruitGrams * 10) / 10,estimated:false,fruitEstimated:false };
  }
  if (!Number.isSafeInteger(recipeId) || recipeId < 0 || !validPortions(portions) ||
      !range(grams,0,1e9) || !range(fruitGrams,0,1e9) || (slotId !== undefined &&
        (typeof slotId !== 'string' || !/^[\w:-]{1,120}$/.test(slotId)))) {
    fail('Controleer het aantal porties en de hoeveelheid groente of fruit.');
  }
  return { id,date,name,recipeId,portions,grams,fruitGrams, ...(slotId === undefined ? {} : {slotId}),
    estimated:grams > 0 && entry.estimated === true, fruitEstimated:fruitGrams > 0 && entry.fruitEstimated === true };
}

export function validateVegetables(input) {
  if (!plain(input) || !Array.isArray(input.entries) || input.entries.length > maxProduceEntries) fail('De dagmetergegevens zijn ongeldig.');
  const entries = input.entries.map(validateProduceEntry);
  if (new Set(entries.map(entry => entry.id)).size !== entries.length) fail('De back-up bevat dubbele regels in het eetlogboek.');
  return { ...validateBody(input.heightCm,input.weightKg), entries };
}

// A recipe entry stores the amount per serving as it was when the user logged it.
export function entryProduce(entry) {
  const n = entry.portions ?? 1;
  return { vegetable:info(entry.grams * n,false,entry.estimated),
    fruit:info((entry.fruitGrams ?? 0) * n,false,entry.fruitEstimated === true) };
}

export function dayProduce(vegetableState, date = localDate()) {
  const entries = vegetableState.entries.filter(entry => entry.date === date);
  const result = totals();
  for (const entry of entries) accumulate(result,entryProduce(entry));
  return { entries, ...result };
}

export function produceProgress(grams, kind) {
  const goal = produceGoals[kind];
  return { percent: Math.round(grams / goal * 100), remaining: Math.max(0,goal - grams) };
}
