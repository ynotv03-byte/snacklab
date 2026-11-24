import { blankState, builtinMap, parseState, setOwnRecipes, storageKey, validDate } from './core.js';
import { validateRecipe, validateWork, validateWeek, validateCook, validateFilter, maxPlanPortions,
  checkWorkOverlap, catalogueFor, isObject, isJPEG, recipeFromOwn, trimText, monday } from './model.js';

export const maxOwnRecipes = 100;
export const maxBackupBytes = 120 * 1024 * 1024;
const snapshotFormat = 'SnackLab';
const validKey = value => /^[\w:-]{1,120}$/.test(value);

export function blankSnapshot(base = blankState()) {
  return {
    ...base, schemaVersion: 6, customRecipes: [], nextRecipeId: 1000,
    workProfiles: [], weeks: {}, cooking: {}, filterProfiles: [],
    grocery: { ...base.grocery, weekImports: {} }
  };
}

function unique(list, key, message) {
  if (new Set(list.map(item => item[key])).size !== list.length) throw new Error(message);
}

export function validateSnapshot(input) {
  if (!isObject(input)) throw new Error('Deze back-up bevat geen SnackLab-gegevens.');
  if (input.schemaVersion === undefined || input.schemaVersion === 5) {
    const base = parseState(JSON.stringify(input), builtinMap);
    return blankSnapshot(base);
  }
  if (input.schemaVersion !== 6 || !Array.isArray(input.customRecipes) || input.customRecipes.length > maxOwnRecipes ||
      !Array.isArray(input.workProfiles) || input.workProfiles.length > 24 ||
      !Array.isArray(input.filterProfiles) || input.filterProfiles.length > 40 ||
      !isObject(input.weeks) || !isObject(input.cooking)) throw new Error('Deze back-up is geen ondersteunde SnackLab 6-back-up.');
  const customRecipes = input.customRecipes.map(validateRecipe);
  unique(customRecipes, 'id', 'Dubbele receptnummers in de back-up.');
  const catalogue = catalogueFor({ customRecipes });
  const workProfiles = input.workProfiles.map(validateWork);
  unique(workProfiles, 'id', 'Dubbele werkprofielen in de back-up.');
  checkWorkOverlap(workProfiles);
  const filterProfiles = input.filterProfiles.map(item => {
    if (!isObject(item) || typeof item.id !== 'string' || !validKey(item.id) || !trimText(item.name, 55)) throw new Error('Een bewaard filterprofiel is ongeldig.');
    return { id: item.id, name: trimText(item.name, 55), values: validateFilter(item.values) };
  });
  unique(filterProfiles, 'id', 'Dubbele filterprofielen in de back-up.');
  const weeks = Object.fromEntries(Object.entries(input.weeks).map(([key, week]) => [key, validateWeek(week, key, catalogue)]));
  const cooking = Object.fromEntries(Object.entries(input.cooking).map(([key, cook]) => {
    if (String(Number(key)) !== key || !catalogue.has(Number(key))) throw new Error('Een kooksessie verwijst naar een onbekend recept.');
    return [key, validateCook(cook)];
  }));
  const { weekImports = {}, ...groceryBase } = input.grocery ?? {};
  if (!isObject(weekImports)) throw new Error('Een weekboodschappenlijst is ongeldig.');
  for (const [date, recipes] of Object.entries(weekImports)) {
    if (!validDate(date) || date !== monday(date) || !isObject(recipes) ||
        !Object.entries(recipes).every(([key, n]) => String(Number(key)) === key && catalogue.has(Number(key)) &&
          Number.isInteger(n * 2) && n >= .5 && n <= maxPlanPortions)) throw new Error('Een weekboodschappenlijst is ongeldig.');
  }
  const floor = Math.max(999, ...customRecipes.map(item => item.id)) + 1;
  if (!Number.isSafeInteger(input.nextRecipeId) || input.nextRecipeId < floor || input.nextRecipeId >= Number.MAX_SAFE_INTEGER) throw new Error('Receptnummerreeks is ongeldig.');
  const {
    customRecipes: _recipes, workProfiles: _work, filterProfiles: _filters, cooking: _cook, weeks: _weeks, ...baseFields
  } = input;
  const base = parseState(JSON.stringify({ ...baseFields, grocery: groceryBase }), catalogue);
  return { ...base, customRecipes, workProfiles, filterProfiles, weeks, cooking,
    grocery: { ...base.grocery, weekImports }, nextRecipeId: input.nextRecipeId };
}

export function loadLegacy() {
  const raw = localStorage.getItem(storageKey);
  return raw === null ? blankSnapshot() : validateSnapshot(JSON.parse(raw));
}

export function openStore(indexed = globalThis.indexedDB, name = 'snacklab6:' + new URL('./', location.href).pathname) {
  let connection;
  function connect() {
    if (!connection) connection = new Promise((resolve, reject) => {
      if (!indexed) { reject(new Error('IndexedDB is op dit apparaat niet beschikbaar.')); return; }
      const request = indexed.open(name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); connection = undefined; };
        db.onclose = () => { connection = undefined; };
        resolve(db);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Sluit andere tabbladen met SnackLab en probeer opnieuw.'));
    }).catch(error => { connection = undefined; throw error; });
    return connection;
  }

  async function transaction(mode, key, operate) {
    const db = await connect();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', mode);
      const bucket = tx.objectStore('snapshots');
      let result;
      let failure;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure ?? tx.error ?? new Error('Opslag is onderbroken.'));
      const request = bucket.get(key);
      request.onsuccess = () => {
        try {
          result = operate(request.result, bucket);
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
    });
  }
  return {
    init: () => transaction('readwrite', 'current', (stored, bucket) => {
      if (stored !== undefined) return validateSnapshot(stored);
      const initial = loadLegacy();
      bucket.put(initial, 'current');
      return initial;
    }),
    read: () => transaction('readonly', 'current', stored => stored === undefined ? undefined : validateSnapshot(stored)),
    write: change => transaction('readwrite', 'current', (stored, bucket) => {
      if (stored === undefined) throw new Error('Eigen gegevens zijn nog niet geopend.');
      const state = validateSnapshot(stored);
      if (change(state, catalogueFor(state)) === false) return false;
      const next = validateSnapshot(state);
      bucket.put(next, 'current');
      return next;
    }),
    replace: incoming => transaction('readwrite', 'current', (stored, bucket) => {
      if (stored !== undefined) bucket.put(stored, 'previous');
      bucket.put(incoming, 'current');
      return incoming;
    }),
    previous: () => transaction('readonly', 'previous', stored => stored === undefined ? null : validateSnapshot(stored))
  };
}

// Keep compressed bytes in IndexedDB. Blob storage relies on browser-specific file backing.
const imageURLs = new Map();
const jpegBlob = bytes => new Blob([bytes], { type: 'image/jpeg' });
export function displayCatalogue(state) {
  const active = new Set(state.customRecipes.map(item => item.id));
  for (const [id, previous] of imageURLs) if (!active.has(id)) {
    URL.revokeObjectURL(previous.url);
    imageURLs.delete(id);
  }
  setOwnRecipes(state.customRecipes.map(item => {
    const previous = imageURLs.get(item.id);
    if (previous && (!item.photo || item.photoVersion !== previous.version)) {
      URL.revokeObjectURL(previous.url);
      imageURLs.delete(item.id);
    }
    if (item.photo && !imageURLs.has(item.id)) imageURLs.set(item.id, { version: item.photoVersion, url: URL.createObjectURL(jpegBlob(item.photo)) });
    return recipeFromOwn(item, imageURLs.get(item.id)?.url);
  }));
}

function toDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function serializeBackup(state) {
  const customRecipes = [];
  for (const item of state.customRecipes) customRecipes.push({ ...item, photo: item.photo ? await toDataURL(jpegBlob(item.photo)) : null });
  return JSON.stringify({ format: snapshotFormat, version: 6, exportedAt: new Date().toISOString(),
    data: { ...state, customRecipes } });
}

export function deserializeBackup(raw) {
  const parsed = JSON.parse(raw);
  if (parsed?.format !== snapshotFormat) return validateSnapshot(parsed);
  const { data } = parsed;
  if (parsed.version !== 6 || !isObject(data) || data.schemaVersion !== 6 ||
      !Array.isArray(data.customRecipes) || data.customRecipes.length > maxOwnRecipes) throw new Error('Deze back-upversie wordt niet ondersteund.');
  const customRecipes = data.customRecipes.map(item => {
    if (!isObject(item)) throw new Error('Een recept is ongeldig.');
    if (item.photo === null) return item;
    const prefix = 'data:image/jpeg;base64,';
    if (typeof item.photo !== 'string' || !item.photo.startsWith(prefix) || item.photo.length > 1066700 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(item.photo.slice(prefix.length))) throw new Error('Een receptfoto is ongeldig.');
    const bytes = Uint8Array.from(atob(item.photo.slice(prefix.length)), char => char.charCodeAt(0));
    if (!isJPEG(bytes)) throw new Error('Een receptfoto is geen geldig JPEG-bestand.');
    return { ...item, photo: bytes };
  });
  return validateSnapshot({ ...data, customRecipes });
}

async function readImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      // Keep original orientation and aspect ratio. Fall back to HTMLImageElement if native decode fails.
      return { image: bitmap, release: () => bitmap.close() };
    } catch { /* Some photo formats are decoded only by the image element. */ }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    return { image, release: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('Deze foto kan niet worden geopend. Probeer een JPEG-, PNG- of WebP-bestand.');
  }
}

export async function compressPhoto(file) {
  if (!file?.size || file.size > 18 * 1024 * 1024 || !['image/jpeg','image/png','image/webp','image/heic','image/heif',''].includes(file.type)) {
    throw new Error('Kies een receptfoto van maximaal 18 MB.');
  }
  const { image, release } = await readImage(file);
  try {
    const width = image.naturalWidth ?? image.width;
    const height = image.naturalHeight ?? image.height;
    if (!width || !height) throw new Error('De foto kon niet worden geopend.');
    const scale = Math.min(1, 960 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Fotobewerking is op dit apparaat niet beschikbaar.');
    context.fillStyle = '#fffdf8';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [.84, .71, .58]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob?.type === 'image/jpeg' && blob.size <= 800000) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (isJPEG(bytes)) return bytes;
      }
    }
    throw new Error('De foto blijft te groot. Kies een kleinere foto.');
  } finally {
    release();
  }
}
