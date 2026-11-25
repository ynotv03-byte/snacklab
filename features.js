import { newId, nutrientKeys, hazelnutRisk, setGroceryPortions,
  reconcileChecks, groceryRows, validPortions } from './core.js';
import {
  validateRecipe, validateWork, checkWorkOverlap, trimText, numberOrNull, nextOwnId, validateFilter,
  filterFlags, filterTextKeys, filterRangeKeys, validatePrefs, validateWeek, emptyWeek, generateWeek, syncWeekGroceries,
  setWeekSportChoice, syncSportWeeks,
  newCook, makeTimer, secondsLeft, timerLabel, workEligible, workProfile, planSlots, catalogueFor
} from './model.js';
import { compressPhoto, maxOwnRecipes } from './store.js';
import { estimateIngredients } from './ingredients.js';
import { ingredientRow, stepRow, filterPresets } from './screens.js';

const fieldValue = (root, key) => root.querySelector('[name="' + key + '"]')?.value ?? '';
const message = (form, text) => { if (form.querySelector('.form-message')) form.querySelector('.form-message').textContent = text; };
const fail = text => { throw new Error(text); };
const selectOptions = form => [...form.querySelectorAll('input, select')];
const ingredientsFrom = form => [...form.querySelectorAll('[data-ingredient]')].map(row => ({
  product: fieldValue(row, 'product').trim(), amount: numberOrNull(fieldValue(row, 'amount')), unit: fieldValue(row, 'unit'),
  group: fieldValue(row, 'group')
})).filter(item => item.product || item.amount !== null);
const stepsFrom = form => [...form.querySelectorAll('[data-step]')].map(row => ({
  text: fieldValue(row, 'step').trim(), minutes: numberOrNull(fieldValue(row, 'stepMinutes'))
})).filter(step => step.text || step.minutes !== null);

function readFilter(form) {
  const values = new FormData(form);
  return validateFilter({
    ...Object.fromEntries([...filterTextKeys, ...filterRangeKeys, 'taste', 'storage'].map(key => [key, values.get(key)])),
    ...Object.fromEntries(filterFlags.map(key => [key, values.has(key)])),
    allergens: values.getAll('allergens')
  });
}

export function attachFeatures(main, api) {
  const { getState, update, redraw, announce, go, route, getPortions, applyFilter, getFilter, filterCount, openCook } = api;
  let wakeLock;
  let wakePending = false;
  let cookTimerLoop;
  let shownTimers = new Set();

  function updateTimerReadout() {
    for (const el of main.querySelectorAll('[data-timer-id]')) {
      const { timerEnd, timerRemaining, timerId } = el.dataset;
      const remaining = secondsLeft({ endAt: Number(timerEnd), remaining: numberOrNull(timerRemaining) });
      const text = remaining ? timerLabel(remaining) : 'Klaar';
      if (el.textContent !== text) el.textContent = text;
      if (!remaining && !shownTimers.has(timerId) && !document.hidden) {
        shownTimers.add(timerId);
        const row = el.closest('li');
        row.querySelector('[data-v6="cook-toggle-timer"]')?.remove();
        announce('Timer klaar · ' + row.querySelector('strong').textContent);
      }
    }
  }

  async function wake() {
    const status = main.querySelector('#wake-status');
    if (!status || document.hidden || !navigator.wakeLock?.request) {
      if (status) status.textContent = 'Gebruik tikken om je scherm actief te houden.';
      if (!status && wakeLock) {
        void wakeLock.release().catch(() => {});
        wakeLock = undefined;
      }
      return;
    }
    if (wakeLock && !wakeLock.released) { status.textContent = 'Scherm blijft actief'; return; }
    if (wakePending) return;
    wakePending = true;
    try {
      const held = await navigator.wakeLock.request('screen');
      if (route().name !== 'cook') await held.release();
      else {
        wakeLock = held;
        if (main.querySelector('#wake-status')) main.querySelector('#wake-status').textContent = 'Scherm blijft actief';
        held.addEventListener('release', () => {
          if (wakeLock === held) wakeLock = undefined;
          const node = main.querySelector('#wake-status');
          if (node) node.textContent = 'Schermvergrendeling is weer actief.';
        });
      }
    } catch {
      const node = main.querySelector('#wake-status');
      if (node) node.textContent = 'Gebruik tikken om je scherm actief te houden.';
    } finally {
      wakePending = false;
    }
  }

  function rendered() {
    if (route().name === 'cook') {
      updateTimerReadout();
      cookTimerLoop ??= setInterval(updateTimerReadout, 750);
    } else {
      clearInterval(cookTimerLoop);
      cookTimerLoop = undefined;
    }
    void wake();
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { void wake(); updateTimerReadout(); }
  });

  function openDialog(dialog) {
    if (!dialog.open) {
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!dialog.dataset.closeBound) {
      dialog.dataset.closeBound = 'true';
      dialog.addEventListener('close', () => main.querySelector('[data-v6="filter-open"]')?.focus());
    }
    refreshFilter(dialog.querySelector('form'));
  }

  function closeDialog(dialog) {
    if (dialog.close) dialog.close();
    else {
      dialog.removeAttribute('open');
      main.querySelector('[data-v6="filter-open"]')?.focus();
    }
  }

  function refreshFilter(form) {
    const output = form.querySelector('#filter-count');
    try {
      const n = filterCount(readFilter(form));
      output.textContent = n + (n === 1 ? ' recept' : ' recepten');
      form.querySelector('[type=submit]').disabled = false;
      message(form, '');
    } catch (error) {
      output.textContent = 'Controleer je filters';
      form.querySelector('[type=submit]').disabled = true;
      message(form, error.message);
    }
  }

  function fillFilter(form, filter) {
    for (const el of selectOptions(form)) {
      if (el.name === 'preset' || el.name === 'profileName') continue;
      if (el.type === 'checkbox') el.checked = el.name === 'allergens' ?
        Boolean(filter.allergens?.includes(el.value)) : Boolean(filter[el.name]);
      else if (el.name) el.value = filter[el.name] ?? '';
    }
    refreshFilter(form);
  }

  async function saveRecipe(form, values) {
    const id = Number(form.dataset.id);
    const copy = form.dataset.copy === 'true';
    const file = values.get('photo');
    const image = file?.size ? await compressPhoto(file) : undefined;
    let savedId;
    const saved = await update(state => {
      const previous = state.customRecipes.find(item => item.id === id);
      if (id && (!previous || previous.archived)) fail('Dit recept is intussen verwijderd.');
      if ((!id || copy) && state.customRecipes.length >= maxOwnRecipes) fail('Er zijn maximaal 100 eigen recepten inclusief verwijderde recepten mogelijk.');
      const record = validateRecipe({
        id: !id || copy ? nextOwnId(state) : id, name: values.get('name'), description: values.get('description'),
        servings: Number(values.get('servings')), minutes: Number(values.get('minutes')), taste: values.get('taste'), texture: values.get('texture'),
        ingredients: ingredientsFrom(form), steps: stepsFrom(form),
        nutrition: Object.fromEntries(nutrientKeys.map(key => [key, numberOrNull(values.get(key))])),
        nutritionSource: values.get('nutritionSource'), vegetableGrams: numberOrNull(values.get('vegetableGrams')),
        fruitGrams: numberOrNull(values.get('fruitGrams')),
        allergens: values.getAll('allergens'),
        labelsReviewed: values.has('labelsReviewed'), hazelnut: values.get('hazelnut'), storage: values.get('storage'),
        keep: values.get('keep'), portable: values.has('portable'), heat: values.has('heat'), moments: values.getAll('moments'),
        photo: image ?? (values.has('removePhoto') ? null : previous?.photo ?? null),
        photoVersion: image ? newId() : previous?.photoVersion ?? '', archived: false
      });
      const before = groceryRows(state.grocery, catalogueFor(state));
      if (previous && !copy) {
        state.customRecipes[state.customRecipes.indexOf(previous)] = record;
        if (previous.hazelnut !== record.hazelnut || previous.labelsReviewed !== record.labelsReviewed ||
          JSON.stringify(previous.ingredients) !== JSON.stringify(record.ingredients) ||
          JSON.stringify(previous.allergens) !== JSON.stringify(record.allergens)) delete state.allergenReviews[id];
      }
      else state.customRecipes.push(record);
      reconcileChecks(state.grocery, before, catalogueFor(state));
      savedId = record.id;
    }, 'Eigen recept opgeslagen.', form);
    if (saved && form.isConnected) go('#recipe/' + savedId);
  }

  async function saveWork(form, values) {
    const profile = validateWork({
      id: form.dataset.id, name: values.get('name'), days: values.getAll('days').map(Number), start: values.get('start'),
      end: values.get('end'), breaks: String(values.get('breaks')).split(/[,;\s]+/).filter(Boolean), intensity: values.get('intensity'),
      fridge: values.has('fridge'), coolBag: values.has('coolBag'), microwave: values.has('microwave'), prep: Number(values.get('prep')),
      hot: values.has('hot'), afterSport: values.get('afterSport'), sportTime: values.get('sportTime'),
      count: Number(values.get('count')), active: values.has('active'), goal: values.get('goal')
    });
    const saved = await update(state => {
      const at = state.workProfiles.findIndex(item => item.id === profile.id);
      if (at < 0) state.workProfiles.push(profile);
      else state.workProfiles[at] = profile;
      checkWorkOverlap(state.workProfiles);
    }, 'Werkprofiel opgeslagen.', form);
    if (saved && form.isConnected) go('#workprofiles');
  }

  async function saveWeekSlot(form, values) {
    const { key, id } = form.dataset;
    const saved = await update((state, catalogue) => {
      const week = state.weeks[key] ?? emptyWeek();
      const old = week.entries.find(entry => entry.id === id);
      if (id !== 'new' && !old) fail('Dit snackmoment is intussen verwijderd.');
      const recipeId = numberOrNull(values.get('recipeId'));
      const recipe = catalogue.get(recipeId);
      if (recipeId !== null && (!recipe || hazelnutRisk(recipe) || (recipe.archived && recipeId !== old?.recipeId))) {
        fail('Kies een beschikbaar recept en controleer de allergenen.');
      }
      const date = values.get('date');
      const slot = old?.kind === 'work' ? planSlots(state, key, week.prefs).find(item => item.id === old.id) : null;
      if (slot?.profile && recipe && !workEligible(recipe, slot.profile) && recipe.id !== old.recipeId) fail('Dit recept past niet binnen je werkprofiel.');
      const entry = { id: old?.id ?? newId(), date, time: values.get('time'), kind: old?.kind ?? 'manual', recipeId,
        portions: Number(values.get('portions')), pinned: values.has('pinned'), reason: 'Zelf aangepast.' };
      if (old?.planId) {
        if (!entry.pinned && (entry.date !== old.date || entry.time !== old.time)) {
          fail('Wijzig het tijdstip via je training of zet dit moment vast als eigen alternatief.');
        }
        entry.planId = old.planId;
      }
      const entries = week.entries.filter(item => item.id !== entry.id).concat(entry)
        .sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
      state.weeks[key] = validateWeek({ ...week, entries }, key, catalogue);
      if (entry.planId && !entry.pinned && !setWeekSportChoice(state,entry,catalogue)) syncSportWeeks(state,entry.planId,catalogue);
      if (Object.hasOwn(state.grocery.weekImports,key)) syncWeekGroceries(state,key,catalogue);
    }, 'Snackmoment opgeslagen.', form);
    if (saved && form.isConnected) go('#week/' + key);
  }

  async function mutateCook(change) {
    const id = route().id;
    const saved = await update((state, catalogue) => {
      const recipe = catalogue.get(id);
      if (!recipe) return false;
      const session = state.cooking[id] ?? newCook(getPortions(id));
      if (change(session, recipe, state) === false) return false;
      state.cooking[id] = session;
    });
    if (saved && route().name === 'cook' && route().id === id) redraw();
    return saved;
  }

  function openTimers() {
    const panel = main.querySelector('#cook-timers');
    if (panel) panel.open = true;
  }

  main.addEventListener('submit', async event => {
    const form = event.target;
    const feature = form.dataset.feature;
    if (!feature) return;
    event.preventDefault();
    if (form.dataset.saving) return;
    form.dataset.saving = 'true';
    const values = new FormData(form);
    const submit = form.querySelector('[type=submit]');
    if (submit) submit.disabled = true;
    message(form, '');
    try {
      if (feature === 'recipe') await saveRecipe(form, values);
      else if (feature === 'work') await saveWork(form, values);
      else if (feature === 'week-slot') await saveWeekSlot(form, values);
      else if (feature === 'generate') {
        const key = form.dataset.key;
        const prefs = validatePrefs({ strategy: values.get('strategy'), free: Number(values.get('free')), minutes: Number(values.get('minutes')),
          protein: numberOrNull(values.get('protein')), kcal: numberOrNull(values.get('kcal')) });
        const ok = await update((state, catalogue) => {
          state.weeks[key] = generateWeek(state, key, { ...(state.weeks[key] ?? emptyWeek()), prefs }, catalogue);
          if (Object.hasOwn(state.grocery.weekImports,key)) syncWeekGroceries(state,key,catalogue);
        }, 'Weekplanning bijgewerkt.', form);
        if (ok && form.isConnected) redraw();
      } else if (feature === 'timer') {
        const timer = makeTimer(values.get('label'), Number(values.get('minutes')));
        if (await mutateCook(session => {
          if (session.timers.length >= 8) fail('Verwijder eerst een timer. Je kunt maximaal acht timers bewaren.');
          session.timers.push(timer);
        })) openTimers();
      } else if (feature === 'filters') {
        const filter = readFilter(form);
        closeDialog(form.closest('dialog'));
        applyFilter(filter);
        main.querySelector('[data-v6="filter-open"]')?.focus({ preventScroll: true });
      }
    } catch (error) { message(form, error.message); }
    finally {
      delete form.dataset.saving;
      if (submit) submit.disabled = false;
    }
  });

  main.addEventListener('input', event => {
    const input = event.target;
    const form = input.form;
    if (form?.dataset.feature === 'filters') refreshFilter(form);
    if (form?.dataset.feature === 'recipe' && nutrientKeys.includes(input.name)) form.elements.namedItem('nutritionSource').value = 'manual';
  });

  main.addEventListener('change', async event => {
    const input = event.target;
    const form = input.form;
    if (form?.dataset.feature === 'filters' && input.name === 'preset') {
      const saved = getState().filterProfiles.find(item => item.id === input.value);
      const preset = filterPresets[input.value]?.[1];
      form.elements.namedItem('profileName').value = saved?.name ?? '';
      form.querySelector('[data-v6="filter-delete"]').hidden = !saved;
      if (saved || preset) fillFilter(form, saved?.values ?? preset);
    }
    if (input.hasAttribute('data-cook-check')) {
      const index = Number(input.dataset.cookCheck);
      const checked = input.checked;
      const id = route().id;
      const ok = await update(state => {
        const session = state.cooking[id] ?? newCook(getPortions(id));
        session.checked = session.checked.filter(item => item !== index);
        if (checked) session.checked.push(index);
        state.cooking[id] = session;
      });
      if (!ok && input.isConnected) input.checked = !checked;
    }
    if (input.hasAttribute('data-cook-servings')) {
      const value = Number(input.value);
      if (validPortions(value)) await mutateCook(session => { session.servings = value; });
      main.querySelector('[data-cook-servings]')?.focus({ preventScroll: true });
    }
    if (input.hasAttribute('data-cook-rating')) {
      const id = route().id;
      const value = Number(input.value);
      await update(state => { state.ratings[id] = value; }, 'Beoordeling opgeslagen.');
    }
  });

  main.addEventListener('click', async event => {
    const control = event.target.closest('button[data-v6]');
    if (!control) return;
    const { v6: action, key, id } = control.dataset;
    const form = control.form;
    try {
      switch (action) {
        case 'filter-open':
          if (route().name === 'recipes') {
            const dialogue = main.querySelector('#advanced-filters');
            fillFilter(dialogue.querySelector('form'), getFilter());
            openDialog(dialogue);
          }
          break;
        case 'filter-close':
          closeDialog(form.closest('dialog'));
          break;
        case 'filter-reset':
          closeDialog(form.closest('dialog'));
          applyFilter({},true);
          main.querySelector('[data-v6="filter-open"]')?.focus();
          break;
        case 'filter-save': {
          const name = trimText(fieldValue(form, 'profileName'),55);
          if (!name) fail('Geef je filterprofiel een naam.');
          const values = readFilter(form);
          let savedProfile;
          const saved = await update(state => {
            const existing = state.filterProfiles.find(item => item.name.toLowerCase() === name.toLowerCase());
            if (!existing && state.filterProfiles.length >= 40) fail('Er kunnen maximaal 40 eigen filterprofielen worden bewaard.');
            savedProfile = { id: existing?.id ?? newId(), name, values };
            state.filterProfiles = state.filterProfiles.filter(item => item.id !== savedProfile.id).concat(savedProfile);
          }, 'Filterprofiel bewaard.', form);
          if (saved && form.isConnected) {
            const selector = form.elements.namedItem('preset');
            const option = [...selector.options].find(item => item.value === savedProfile.id);
            if (option) option.textContent = name;
            else selector.add(new Option(name, savedProfile.id));
            selector.value = savedProfile.id;
            form.querySelector('[data-v6="filter-delete"]').hidden = false;
            message(form, 'Profiel bewaard. Tik op Toon recepten om het toe te passen.');
          }
          break;
        }
        case 'filter-delete': {
          const selector = form.elements.namedItem('preset');
          const current = selector.value;
          if (await update(state => { state.filterProfiles = state.filterProfiles.filter(item => item.id !== current); }, 'Filterprofiel verwijderd.', form)) {
            [...selector.options].find(item => item.value === current)?.remove();
            selector.value = '';
            control.hidden = true;
          }
          break;
        }
        case 'add-ingredient':
        case 'add-step': {
          const ingredient = action === 'add-ingredient';
          const rows = form.querySelector(ingredient ? '[data-rows=ingredients]' : '[data-rows=steps]');
          if (rows.children.length >= (ingredient ? 45 : 35)) fail('Het maximum aantal invoervelden is bereikt.');
          rows.insertAdjacentHTML('beforeend', ingredient ? ingredientRow({}, rows.children.length) : stepRow({}, rows.children.length));
          rows.lastElementChild.querySelector('input,textarea').focus();
          break;
        }
        case 'remove-field': {
          const row = control.closest('.form-row');
          const rows = row.parentElement;
          if (rows.children.length === 1) {
            row.querySelectorAll('input,textarea').forEach(input => { input.value = ''; });
            row.querySelector('input,textarea').focus();
            break;
          }
          const next = row.nextElementSibling ?? row.previousElementSibling;
          row.remove();
          for (const [i, item] of [...rows.children].entries()) {
            item.querySelector('.field > span').textContent = (item.hasAttribute('data-ingredient') ? 'Ingrediënt ' : 'Stap ') + (i + 1);
          }
          next?.querySelector('input,textarea')?.focus();
          break;
        }
        case 'estimate': {
          const items = ingredientsFrom(form);
          const servings = Number(fieldValue(form,'servings'));
          const target = form.querySelector('[data-estimate]');
          if (!items.length || !validPortions(servings)) {
            target.textContent = 'Vul ingrediënten en een geldig aantal porties in.';
            break;
          }
          const result = estimateIngredients(items, servings);
          if (result.missing.length) {
            target.textContent = 'Geen volledige schatting. Controleer eenheden of vul zelf waarden in voor: ' + result.missing.join(', ') + '.';
            break;
          }
          for (const nutrient of nutrientKeys) {
            const input = form.elements.namedItem(nutrient);
            if (!input.value && result.values[nutrient] !== null) input.value = result.values[nutrient];
          }
          form.elements.namedItem('nutritionSource').value = 'estimate';
          target.textContent = 'Lege velden ingevuld met USDA-schattingen per portie. Je kunt alles zelf aanpassen.';
          break;
        }
        case 'work-delete':
          if (confirm('Dit werkprofiel verwijderen? Bestaande weekplannen blijven bewaard.') &&
              await update(state => { state.workProfiles = state.workProfiles.filter(item => item.id !== id); }, 'Werkprofiel verwijderd.')) go('#workprofiles');
          break;
        case 'recipe-archive':
        case 'recipe-restore': {
          const archive = action === 'recipe-archive';
          if (archive && !confirm('Dit recept uit je bibliotheek verwijderen? Je kunt het terugzetten bij Eigen recepten.')) break;
          const saved = await update(state => {
            const item = state.customRecipes.find(recipe => recipe.id === Number(id));
            if (!item) return false;
            item.archived = archive;
          }, archive ? 'Recept verwijderd uit je bibliotheek.' : 'Recept teruggezet.');
          if (saved) go('#own');
          break;
        }
        case 'work-grocery': {
          const workDate = route().id;
          if (await update((state, catalogue) => {
            const recipe = catalogue.get(Number(id));
            const profile = workProfile(state, workDate);
            if (!profile || !recipe || !workEligible(recipe, profile)) fail('Dit recept past niet meer binnen je werkprofiel.');
            const n = (state.grocery.recipes[id] ?? 0) + 1;
            return setGroceryPortions(state.grocery, Number(id), n, catalogue);
          }, 'Ingrediënten toegevoegd aan boodschappen.')) redraw();
          break;
        }
        case 'week-grocery':
          if (await update((state, catalogue) => {
            syncWeekGroceries(state, key, catalogue);
          }, 'Weekboodschappen bijgewerkt. Andere boodschappen blijven staan.')) redraw();
          break;
        case 'week-unimport':
          if (await update((state, catalogue) => {
            const before = groceryRows(state.grocery, catalogue);
            delete state.grocery.weekImports[key];
            reconcileChecks(state.grocery, before, catalogue);
          }, 'Week uit boodschappen gehaald.')) redraw();
          break;
        case 'week-pin':
          if (await update((state,catalogue) => {
            const item = state.weeks[key]?.entries.find(entry => entry.id === id);
            if (!item) return false;
            item.pinned = !item.pinned;
            if (!item.pinned && item.planId) syncSportWeeks(state,item.planId,catalogue);
          })) {
            redraw();
            [...main.querySelectorAll('[data-v6="week-pin"]')].find(button => button.dataset.id === id)?.focus({ preventScroll: true });
          }
          break;
        case 'week-reset-removed':
          if (await update(state => { state.weeks[key].removed = []; }, 'Je kunt de overgeslagen momenten weer plannen.')) redraw();
          break;
        case 'week-jump': {
          const day = document.getElementById('weekday-' + key);
          day?.scrollIntoView({ block: 'start' });
          day?.focus({ preventScroll: true });
          break;
        }
        case 'week-remove':
          if (await update((state,catalogue) => {
            const week = state.weeks[key];
            const entry = week?.entries.find(item => item.id === id);
            if (!entry) return false;
            week.entries = week.entries.filter(item => item.id !== id);
            if (entry.kind !== 'manual' && !week.removed.includes(id)) week.removed.push(id);
            setWeekSportChoice(state,{ ...entry, recipeId:null },catalogue);
            if (Object.hasOwn(state.grocery.weekImports,key)) syncWeekGroceries(state,key,catalogue);
          }, 'Snackmoment verwijderd.')) go('#week/' + key);
          break;
        case 'cook-open': {
          const target = Number(id);
          if (await update(state => {
            if (!state.cooking[target] || state.cooking[target].complete) state.cooking[target] = newCook(getPortions(target));
          })) openCook(target);
          break;
        }
        case 'cook-step':
          if (await mutateCook((cook, recipe) => {
            cook.step = Math.max(-1, Math.min(cook.step, recipe.steps.length - 1) + Number(control.dataset.step));
            cook.complete = cook.step >= recipe.steps.length;
            if (cook.complete) cook.step = recipe.steps.length - 1;
          })) {
            const heading = main.querySelector('.cook-current h2');
            heading?.setAttribute('tabindex','-1');
            heading?.focus();
            window.scrollTo(0, 0);
          }
          break;
        case 'cook-favorite':
          if (await mutateCook((_cook, recipe, state) => {
            if (state.favorites.includes(recipe.id)) state.favorites = state.favorites.filter(item => item !== recipe.id);
            else state.favorites.push(recipe.id);
          })) main.querySelector('[data-v6="cook-favorite"]')?.focus({ preventScroll: true });
          break;
        case 'cook-reset':
          await mutateCook(cook => Object.assign(cook,newCook(cook.servings)));
          shownTimers = new Set();
          break;
        case 'cook-start-step':
          if (await mutateCook((cook,recipe) => {
            if (cook.timers.length >= 8) fail('Verwijder eerst een timer. Je kunt maximaal acht timers bewaren.');
            cook.timers.push(makeTimer(recipe.steps[cook.step]?.title || 'Stap ' + (cook.step + 1), Number(control.dataset.minutes)));
          })) {
            openTimers();
            announce('Timer gestart.');
          }
          break;
        case 'cook-toggle-timer':
          await mutateCook(cook => {
            const timer = cook.timers.find(item => item.id === id);
            if (!timer || !secondsLeft(timer)) return false;
            if (timer.remaining !== null) {
              timer.endAt = Date.now() + timer.remaining;
              timer.remaining = null;
            } else timer.remaining = Math.max(0, timer.endAt - Date.now());
          });
          break;
        case 'cook-delete-timer':
          await mutateCook(cook => { cook.timers = cook.timers.filter(timer => timer.id !== id); });
          shownTimers.delete(id);
          break;
      }
    } catch (error) {
      if (form?.isConnected) message(form,error.message);
      else announce(error.message);
    }
  });

  return rendered;
}
