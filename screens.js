import { byId, formatIngredient, formatPortions, metric, nutrientKeys, nutrientLabels, scaleNutrition,
  maxPortions, localDate, sports, intensities, textures, hazelnutRisk } from './core.js';
import { groceryGroups } from './data.js';
import { ingredientsLibrary } from './ingredients.js';
import { recipeVegetables } from './vegetables.js';
import {
  addDays, dailyEntries, emptyWeek, monday, moments, practical, secondsLeft, stepMinutes, timerLabel,
  weekdays, workProfile, workSlots, workoutAfterShift, workSuggestions, nutritionTotal, strategies,
  newRecipe, newWorkProfile, units, allergenOptions, storageOptions, hazelnutOptions, labelCheckText,
  knownRiskText, coldText, filterFlags, workEligible
} from './model.js';

export const h = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
const check = value => value ? ' checked' : '';
const selected = value => value ? ' selected' : '';
const no = value => value ? ' disabled' : '';
const fmt = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDate = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });
const dayDate = date => new Date(date + 'T12:00:00');
const dateTitle = date => fmt.format(dayDate(date));
const range = (a, b) => shortDate.format(dayDate(a)) + ' – ' + shortDate.format(dayDate(b));
const cap = value => value.charAt(0).toUpperCase() + value.slice(1);
const page = (title, aside = '') => `<div class="page-heading with-action"><h1>${h(title)}</h1>${aside}</div>`;
const back = (hash, tag) => `<a href="${h(hash)}" class="back"><span aria-hidden="true">‹</span> ${h(tag)}</a>`;
const link = (hash, text, cls = '') => `<a href="${h(hash)}" class="button ${cls}">${h(text)}</a>`;
const act = (action, text, attrs = '', cls = '') => `<button class="button ${cls}" type="button" data-v6="${action}" ${attrs}>${h(text)}</button>`;
const submit = text => `<button class="button primary" type="submit">${h(text)}</button>`;
const status = '<p class="form-message" role="status" aria-live="polite"></p>';
const pairs = list => list.map(x => [x, x]);
const field = (label, input) => `<label class="field"><span>${h(label)}</span>${input}</label>`;
const input = (name, type, value, attrs = '') => `<input name="${name}" type="${type}" value="${h(value)}" ${attrs}>`;
const text = (name, label, value, attrs = '') => field(label, input(name, 'text', value, attrs));
const num = (name, label, value, min, max, step = 1, required = false) => field(label,
  input(name, 'number', value, `min="${min}" max="${max}" step="${step}" inputmode="${step === 1 ? 'numeric' : 'decimal'}"${required ? ' required' : ''}`));
const area = (name, label, value, attrs = '') => field(label, `<textarea name="${name}" rows="2" ${attrs}>${h(value)}</textarea>`);
const toggle = (name, label, value, val = 'yes') => `<label class="checkbox"><input type="checkbox" name="${name}" value="${h(val)}"${check(value)}><span>${h(label)}</span></label>`;
const select = (name, label, choices, value, attrs = '') => field(label, `<select name="${name}" ${attrs} aria-label="${h(label)}">
  ${choices.map(([key, caption]) => `<option value="${h(key)}"${selected(value === key)}>${h(caption)}</option>`).join('')}</select>`);
const details = (title, body, open = false) => `<details class="panel form-section"${open ? ' open' : ''}><summary>${h(title)}</summary><div class="section-body">${body}</div></details>`;
const smallRecipeLink = (recipe, count) => `<a href="#recipe/${recipe.id}" data-recipe-link${count ? ` data-portions="${count}"` : ''}>${h(recipe.name)}</a>`;

export function portionNutrition(nutrition, compact = false) {
  return `<div class="nutrition${compact ? ' nutrition-compact' : ''}" role="group" aria-label="Voedingswaarden voor deze porties">
    ${nutrientKeys.map(key => `<div><strong>${metric(nutrition[key],key === 'kcal' ? '' : 'g')}</strong><small>${nutrientLabels[key]}</small></div>`).join('')}
  </div>`;
}

export function safety(recipe) {
  return hazelnutRisk(recipe) ? `<p class="notice safety-alert">${knownRiskText}</p>` :
    `<p class="note safety-note">${labelCheckText}</p>`;
}

export function personalToday(state, date) {
  const profile = workProfile(state, date);
  const items = dailyEntries(state, date);
  if (!profile && !items.length) return '';
  return `<section class="today-plan">
    <div class="section-head"><h2>Jouw dag</h2><a href="#week/${monday(date)}">Weekplanner</a></div>
    ${profile ? `<div class="shift-strip"><div><strong>${h(profile.name)}</strong><small>${profile.start}–${profile.end} · ${h(profile.intensity)}${profile.hot ? ' · warm' : ''}</small></div>${link('#work/' + date, 'Werkdag')}</div>` : ''}
    ${items.length ? `<ul class="day-mini">${items.map(entry => {
      const recipe = byId.get(entry.recipeId);
      return `<li><time>${entry.time}</time><span>${recipe ? smallRecipeLink(recipe, entry.portions) : 'Nog te kiezen'}</span></li>`;
    }).join('')}</ul>` : ''}
  </section>`;
}

export function workCopy(state, date) {
  const profile = workProfile(state, date);
  if (!profile) return `<section class="empty"><h2>Geen werkdag</h2><p>Voor ${dateTitle(date)} staat geen terugkerende dienst.</p>${link('#workprofiles', 'Werkprofielen beheren')}</section>`;
  const snacks = workSuggestions(state, profile);
  const slots = workSlots(profile, date);
  const after = workoutAfterShift(profile, date);
  const training = after && state.plans.find(plan => plan.date === after.date && !plan.done);
  return `<section class="panel shift-overview">
    <div class="section-head"><h2>${h(profile.name)}</h2><strong>${profile.start}–${profile.end}</strong></div>
    <p class="muted">${h(profile.intensity)} · ${profile.prep} min voorbereiding${profile.hot ? ' · warme werkdag' : ''}</p>
    <div class="tag-row"><span class="badge">${profile.fridge ? 'Koelkast' : profile.coolBag ? 'Koeltas' : 'Geen koeling'}</span>
      ${profile.microwave ? '<span class="badge">Magnetron</span>' : ''}</div>
    ${slots.length ? `<p class="note">Snackmomenten ${slots.map(slot => slot.time + (slot.date !== date ? ' volgende dag' : '')).join(' · ')}</p>` : '<p class="note">Geen snackmomenten ingesteld voor deze dienst.</p>'}
    ${after ? `<div class="button-row">${training ? link('#food/' + training.id, 'Sportvoeding') : link('#edit/work-' + date, after.sport + ' plannen om ' + after.time)}</div>` : ''}
  </section>
  ${profile.hot ? '<p class="notice">Vanwege de warmte, neem water mee en zorg dat je tijdens je werk regelmatig kunt drinken. Bewaar eten buiten de kas.</p>' : ''}
  <section class="block"><div class="section-head"><h2>Past bij deze dienst</h2><a href="#week/${monday(date)}">Weekplanner</a></div>
    ${snacks.length ? `<div class="suggestion-grid">${snacks.map(recipe => {
      const info = practical(recipe);
      const count = state.grocery.recipes[recipe.id] ?? 0;
      return `<article class="panel work-suggestion">
        ${recipe.image ? `<img src="${h(recipe.image)}" alt="" loading="lazy" width="480" height="480">` : ''}
        <div><h3>${smallRecipeLink(recipe, 1)}</h3><p class="note">${recipe.minutes} min · ${metric(recipe.protein)} eiwit</p>
        <p class="note">${h(info.note || (info.storage === 'shelf' ? 'Volg de bewaarvoorschriften op de verpakking.' : 'Vervoer en bewaar gekoeld.'))}</p>
        ${act('work-grocery', 'Naar boodschappen', `data-id="${recipe.id}"${no(count >= maxPortions)}`)}</div>
      </article>`;
    }).join('')}</div>` : `<div class="empty"><h3>Geen passende snacks</h3><p>Bekijk je voorbereidingstijd en koeling of voeg een eigen meeneemrecept met bewaaradvies toe.</p>${link('#recipeedit', 'Recept toevoegen')}</div>`}
  </section>
  <details class="panel form-section block" data-keep-open id="work-help"><summary>Koeling en allergenen</summary><div class="section-body"><p>${coldText}</p><p>${labelCheckText}</p></div></details>`;
}

export function workView(state, date) {
  return `${back('#agenda', 'Agenda')}${page('Werkdag')}${dayNav(date, 'work')}${workCopy(state,date)}`;
}

function dayNav(date, route) {
  return `<div class="period-nav">
    <a href="#${route}/${addDays(date, -1)}" class="button" aria-label="Vorige dag">‹</a>
    <strong>${cap(dateTitle(date))}</strong>
    <a href="#${route}/${addDays(date, 1)}" class="button" aria-label="Volgende dag">›</a></div>`;
}

export function workProfilesView(state) {
  return `${back('#profile','Profiel')}${page('Werkprofielen', link('#workedit', 'Nieuw profiel', 'primary'))}
    ${state.workProfiles.length ? `<div class="stack">${state.workProfiles.map(profile => `<article class="panel profile-line">
      <div><h2>${h(profile.name)}</h2><p class="note">${profile.days.map(day => weekdays[day].toLowerCase()).join(', ')} · ${profile.start}–${profile.end}</p></div>
      <div class="button-row"><span class="badge">${profile.active ? 'Actief' : 'Gepauzeerd'}</span>${link('#workedit/' + profile.id, 'Bewerken')}</div></article>`).join('')}</div>` :
      '<section class="empty"><h2>Plan je terugkerende werkdagen</h2><p>Voeg je vaste werkdagen, pauzes en koelmogelijkheden toe om passende meeneemsnacks te zien.</p></section>'}`;
}

export function workEditor(state, id) {
  const old = state.workProfiles.find(item => item.id === id);
  const profile = old ?? newWorkProfile();
  return `${back('#workprofiles','Werkprofielen')}${page(old ? 'Werkprofiel bewerken' : 'Nieuw werkprofiel')}
  <form class="stack v6-form" data-feature="work" data-id="${h(profile.id)}">
    <section class="panel"><h2>Werkrooster</h2>
      ${text('name','Naam',profile.name,'required maxlength="60" placeholder="Bijv. Kasdienst"')}
      <fieldset><legend>Werkdagen</legend><div class="chip-checks">${weekdays.map((day, i) => toggle('days', day, profile.days.includes(i), i)).join('')}</div></fieldset>
      <div class="fields">${field('Begin', input('start','time',profile.start,'required'))}${field('Einde', input('end','time',profile.end,'required'))}</div>
      ${text('breaks','Pauzes, gescheiden door komma’s',profile.breaks.join(', '),'placeholder="10:30, 13:00" maxlength="60"')}
      <div class="fields">${num('count','Snackmomenten op werk',profile.count,0,4,1,true)}
        ${select('intensity','Fysieke inspanning',pairs(intensities),profile.intensity)}</div>
      ${toggle('active','Actief weekrooster',profile.active)}
    </section>
    ${details('Meenemen en voorbereiden', `<div class="fields">${num('prep','Voorbereiding thuis (min)',profile.prep,1,180,1,true)}
      ${select('goal','Voorkeur op werk',[['balanced','Afwisselend'],['protein','Meer eiwit'],['light','Lichtere snacks'],['light-protein','Licht en eiwitrijk']],profile.goal)}</div>
      ${toggle('fridge','Koelkast op het werk',profile.fridge)}
      ${toggle('coolBag','Koeltas die de snack koud houdt',profile.coolBag)}
      ${toggle('microwave','Magnetron beschikbaar',profile.microwave)}
      ${toggle('hot','Regelmatig een warme werkdag',profile.hot)}
      <p class="note">De app gebruikt de pauzetijden eerst. Als je extra snackmomenten kiest, stelt SnackLab tijden binnen de dienst voor.</p>`, true)}
    ${details('Sport na werk', `<div class="fields">${select('afterSport','Sport',[['','Geen vaste sport'],...pairs(sports)],profile.afterSport)}
      ${field('Gebruikelijke start',input('sportTime','time',profile.sportTime,'required'))}</div>
      <p class="note">SnackLab kan een snack vóór deze sport voorstellen. Een ingeplande training in je agenda krijgt voorrang.</p>`)}
    ${status}<div class="button-row">${submit('Werkprofiel opslaan')}
      ${old ? act('work-delete','Verwijder profiel',`data-id="${h(old.id)}"`,'text-button danger') : ''}</div>
  </form>`;
}

export function ingredientRow(item, i) {
  return `<div class="form-row ingredient-editor" data-ingredient>
    ${text('product', 'Ingrediënt ' + (i + 1), item.product, 'maxlength="90" list="ingredient-library" placeholder="Bijv. banaan"')}
    <div class="fields">${num('amount','Hoeveelheid',item.amount,.001,50000,'any')}${select('unit','Eenheid',units,item.unit ?? 'g')}</div>
    <div class="field-line">${select('group','Winkelcategorie',pairs(groceryGroups),item.group ?? 'Overig')}
      ${act('remove-field','Verwijder', 'aria-label="Verwijder ingrediënt"', 'text-button danger')}</div></div>`;
}
export function stepRow(item, i) {
  return `<div class="form-row step-editor" data-step>
    ${area('step','Stap ' + (i + 1),item.text,'maxlength="550" placeholder="Beschrijf de handeling"')}
    <div class="field-line">${num('stepMinutes','Optionele timer (min)',item.minutes,1,240)}
      ${act('remove-field','Verwijder','aria-label="Verwijder stap"','text-button danger')}</div></div>`;
}

export function ownEditor(state, id, copy = false) {
  const old = state.customRecipes.find(item => item.id === id);
  const draft = old ? { ...old, name: copy ? old.name.slice(0, 90) + ' (kopie)' : old.name } : newRecipe();
  const photo = old && byId.get(old.id)?.image;
  return `${back(old && !copy ? '#recipe/' + old.id : '#recipes', old && !copy ? 'Recept' : 'Recepten')}
  ${page(old && !copy ? 'Recept bewerken' : 'Eigen recept')}
  <form class="stack v6-form" data-feature="recipe" data-id="${old?.id ?? ''}" data-copy="${copy}">
    <section class="panel recipe-editor-start">
      ${photo ? `<img class="editor-photo" src="${h(photo)}" alt="" width="480" height="480">` : ''}
      ${text('name','Naam van het recept',draft.name,'required maxlength="100" placeholder="Bijv. Warme appelcrumble"')}
      ${area('description','Korte omschrijving',draft.description,'maxlength="340"')}
      ${field('Eigen receptfoto', '<input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*">')}
      ${photo ? toggle('removePhoto','Huidige foto verwijderen',false) : ''}
      <div class="fields">${num('servings','Aantal porties in dit recept',draft.servings,.5,maxPortions,.5,true)}
        ${num('minutes','Bereidingstijd (min)',draft.minutes,1,300,1,true)}
        ${select('taste','Smaak',[['hartig','Hartig'],['zoet','Zoet']],draft.taste)}
        ${select('texture','Structuur',[['','Geen keuze'],...pairs(textures.map(cap)).map(([k,v])=>[k.toLowerCase(),v])],draft.texture)}</div>
    </section>
    <section class="panel"><h2>Ingrediënten</h2><p class="note">Gebruik de totale hoeveelheden voor dit recept. SnackLab rekent ze om per portie.</p>
      <datalist id="ingredient-library">${ingredientsLibrary.map(food => `<option value="${h(food.name)}"></option>`).join('')}</datalist>
      <div data-rows="ingredients">${draft.ingredients.map(ingredientRow).join('')}</div>
      ${act('add-ingredient','Ingrediënt toevoegen')}</section>
    <section class="panel"><h2>Bereiding</h2><div data-rows="steps">${draft.steps.map(stepRow).join('')}</div>${act('add-step','Stap toevoegen')}</section>
    ${details('Voedingswaarden per portie', `<p class="note">Laat onbekende waarden leeg. Je kunt een schatting maken met ingrediënten uit de lokale USDA-bibliotheek en waarden daarna zelf corrigeren.</p>
      <div class="fields">${nutrientKeys.map(key => num(key,cap(nutrientLabels[key]) + (key === 'kcal' ? '' : ' (g)'),draft.nutrition[key],0,key === 'kcal' ? 12000 : 1500,'any')).join('')}</div>
      ${num('vegetableGrams','Groente per portie (g)',draft.vegetableGrams,0,10000,'any')}
      <p class="note">Laat leeg voor een automatische schatting. Vul bij onbekende of gemengde ingrediënten zelf het eetbare groentegewicht in. Fruit telt apart.</p>
      <input type="hidden" name="nutritionSource" value="${h(draft.nutritionSource)}">${act('estimate','Schat uit ingrediënten')}
      <p class="note" data-estimate role="status"></p>`)}
    ${details('Allergenen en bewaren', `<fieldset><legend>Opgegeven allergenen</legend><div class="chip-checks">${allergenOptions.map(key => toggle('allergens',cap(key),draft.allergens.includes(key),key)).join('')}</div></fieldset>
      ${select('hazelnut','Hazelnoot en sporen',hazelnutOptions,draft.hazelnut)}
      ${toggle('labelsReviewed','Ik heb de actuele ingrediënten en etiketten gecontroleerd',draft.labelsReviewed)}
      <p class="note">${labelCheckText}</p>${select('storage','Koeling nodig?',storageOptions,draft.storage)}
      ${area('keep','Bewaaradvies',draft.keep,'maxlength="440"')}
      ${toggle('portable','Makkelijk mee te nemen',draft.portable)}
      ${toggle('heat','Opwarmen nodig',draft.heat)}`)}
    ${details('Wanneer past deze snack?', `<div class="chip-checks">${moments.map(([key,label]) => toggle('moments',label,draft.moments.includes(key),key)).join('')}</div>`)}
    ${status}<div class="button-row">${submit('Recept opslaan')}${old && !copy ? link('#recipe/' + old.id,'Annuleren') : ''}</div>
  </form>`;
}

export function ownList(state) {
  const active = state.customRecipes.filter(item => !item.archived);
  const archived = state.customRecipes.filter(item => item.archived);
  return `${back('#recipes','Recepten')}${page('Eigen recepten',link('#recipeedit','Nieuw recept','primary'))}
    ${active.length ? `<div class="panel"><ul class="clean-list">${active.map(item => `<li>${smallRecipeLink(item)}${link('#recipeedit/' + item.id,'Bewerken')}</li>`).join('')}</ul></div>` :
    '<section class="empty"><h2>Je eigen receptenboek</h2><p>Gebruik Nieuw recept om een snack toe te voegen.</p></section>'}
    ${archived.length ? `<details class="panel form-section block" data-keep-open id="archived-recipes"><summary>Verwijderde recepten</summary>
      <div class="section-body"><ul class="clean-list">${archived.map(item => `<li><span>${h(item.name)}</span>${act('recipe-restore','Terugzetten',`data-id="${item.id}"`)}</li>`).join('')}</ul></div></details>` : ''}`;
}

function totalsList(entries) {
  const stats = nutritionTotal(entries);
  return `<div class="nutrition totals">${nutrientKeys.map(key => {
    const info = stats[key];
    const amount = metric(info.known ? info.amount : null, key === 'kcal' ? '' : 'g');
    return `<div><strong>${amount}</strong><small>${h(nutrientLabels[key])}${info.missing ? ' · deels onbekend' : ''}</small></div>`;
  }).join('')}</div>`;
}

const slotLabels = { work: 'Werkpauze', free: 'Vrije dag', pre: 'Vóór sport', post: 'Na sport', manual: 'Eigen snackmoment' };
export function weekView(state, key) {
  const week = state.weeks[key] ?? emptyWeek();
  const prefs = week.prefs;
  const end = addDays(key, 6);
  const synced = Object.hasOwn(state.grocery.weekImports, key);
  return `${back('#agenda','Agenda')}${page('Weekplanner')}
    <div class="period-nav"><a class="button" href="#week/${addDays(key,-7)}" aria-label="Vorige week">‹</a><strong>${range(key,end)}</strong><a class="button" href="#week/${addDays(key,7)}" aria-label="Volgende week">›</a></div>
    <form class="stack v6-form" data-feature="generate" data-key="${key}">
      ${details('Planningsinstellingen',`<div class="fields">
        ${select('strategy','Strategie',strategies,prefs.strategy)}
        ${num('free','Snacks op vrije dagen',prefs.free,0,3,1,true)}
        ${num('minutes','Max. bereiding (min)',prefs.minutes,1,180,1,true)}
        ${num('protein','Voorkeur min. eiwit (g)',prefs.protein,0,150,'any')}
        ${num('kcal','Voorkeur max. kcal',prefs.kcal,0,2000,'any')}
      </div><p class="note">Voedingsvoorkeuren sturen de rangschikking. Vastgezette momenten en zelf toegevoegde momenten blijven staan.</p>`,!week.entries.length)}
      ${status}<div class="button-row">
        ${submit(week.entries.length ? 'Planning vernieuwen' : 'Maak mijn weekplanning')}
        ${link('#weekedit/' + key + '/new','Snackmoment toevoegen')}
        ${week.removed.length ? act('week-reset-removed','Herstel overgeslagen momenten',`data-key="${key}"`,'text-button') : ''}
      </div>
    </form>
    ${week.entries.length ? `<section class="panel week-overview block"><h2>Geplande snacks deze week</h2>
      ${totalsList(week.entries)}<p class="note">Geschatte subtotalen voor je geplande snacks. Lege of onbekende waarden tellen niet mee. Dit is geen overzicht van al je voeding.</p>
      <div class="button-row">${act('week-grocery',synced ? 'Weekboodschappen bijwerken' : 'Naar boodschappen',`data-key="${key}"`,'primary')}${synced ? link('#grocery','Bekijk boodschappen') : ''}</div>
    </section>` : ''}
    <div class="week-strip" role="group" aria-label="Ga naar een dag in deze week">
      ${weekdays.map((name, i) => {
        const day = addDays(key,i);
        return act('week-jump',name.slice(0,2),`data-key="${day}" aria-label="${name} ${shortDate.format(dayDate(day))}"`);
      }).join('')}
    </div>
    <div class="week-days">${Array.from({length:7}, (_,i) => {
      const date = addDays(key,i);
      const work = workProfile(state,date);
      const weekdayEntries = week.entries.filter(entry => entry.date === date);
      const trainings = state.plans.filter(plan => plan.date === date);
      return `<section class="panel weekday-panel" id="weekday-${date}" tabindex="-1">
        <div class="section-head"><h2>${cap(dateTitle(date))}</h2>${work ? `<a href="#work/${date}">Werkdag</a>` : ''}</div>
        ${trainings.length ? `<p class="note">${trainings.map(plan => `<a href="#food/${h(plan.id)}">${h(plan.sport)} · ${plan.time}</a>`).join(' / ')}</p>` : ''}
        ${weekdayEntries.length ? `<div class="slot-list">${weekdayEntries.map(entry => weekSlot(entry,key,
          entry.kind === 'work' ? workProfile(state,entry.id.slice(0,10)) ?? work : null)).join('')}</div>
          <details class="day-totals" data-keep-open id="totals-${date}"><summary>Voedingswaarden van deze snacks</summary>${totalsList(weekdayEntries)}</details>` :
          '<p class="note">Geen snacks ingepland.</p>'}
      </section>`;
    }).join('')}</div>`;
}

function weekSlot(entry, key, work) {
  const recipe = byId.get(entry.recipeId);
  const changedShift = recipe && entry.kind === 'work' && work && !workEligible(recipe,work);
  return `<article class="week-slot">
    <div><small>${entry.time} · ${slotLabels[entry.kind]}</small><h3>${recipe ? smallRecipeLink(recipe,entry.portions) : 'Kies een snack'}</h3>
    ${recipe ? `<p class="note">${formatPortions(entry.portions)}${recipe.archived ? ' · verwijderd recept' : ''}</p>` : ''}
    ${recipe && hazelnutRisk(recipe) ? `<p class="notice">${knownRiskText}</p>` : changedShift ?
      '<p class="notice">Controleer koeling, bereidingstijd en je werkprofiel. Het huidige recept past niet bij deze dienst.</p>' : ''}
    ${entry.reason ? `<p class="note">${h(entry.reason)}</p>` : ''}</div>
    <div class="button-row">
      ${link('#weekedit/' + key + '/' + entry.id,'Aanpassen')}
      ${act('week-pin',entry.pinned ? 'Maak los' : 'Zet vast',`data-key="${key}" data-id="${h(entry.id)}" aria-pressed="${entry.pinned}"`)}
    </div>
  </article>`;
}

export function weekEditor(state, key, id) {
  const old = state.weeks[key]?.entries.find(entry => entry.id === id);
  if (!old && id !== 'new') return `${back('#week/'+key,'Weekplanner')}${page('Snackmoment ontbreekt')}`;
  const today = localDate();
  const date = old?.date ?? (today >= key && today <= addDays(key,6) ? today : key);
  const profile = old?.kind === 'work' ? workProfile(state,old.id.slice(0,10)) ?? workProfile(state,date) : null;
  const recipes = [...byId.values()].filter(recipe => (recipe.id === old?.recipeId && !hazelnutRisk(recipe)) ||
    (!recipe.archived && !hazelnutRisk(recipe) && (!profile || workEligible(recipe,profile))))
    .sort((a,b) => a.name.localeCompare(b.name,'nl'));
  return `${back('#week/'+key,'Weekplanner')}${page(old ? 'Snackmoment aanpassen' : 'Snackmoment toevoegen')}
    <form class="panel stack v6-form" data-feature="week-slot" data-key="${key}" data-id="${h(id)}">
      <div class="fields">${field('Dag',input('date','date',date,`min="${key}" max="${addDays(key,6)}" required`))}
      ${field('Tijd',input('time','time',old?.time ?? '15:30','required'))}</div>
      ${select('recipeId','Recept',[['','Nog te kiezen'],...recipes.map(recipe => [recipe.id,recipe.name])],old?.recipeId ?? '')}
      ${num('portions','Porties',old?.portions ?? 1,.5,maxPortions,.5,true)}
      <div data-week-portion-preview>${weekPortionPreview(old?.recipeId,old?.portions ?? 1)}</div>
      ${toggle('pinned','Vastzetten voor deze week',old?.pinned ?? true)}
      ${status}<div class="button-row">${submit('Snackmoment opslaan')}
      ${old ? act('week-remove','Verwijder moment',`data-key="${key}" data-id="${h(id)}"`,'text-button danger') : ''}</div>
    </form>`;
}

export function weekPortionPreview(id, n) {
  const recipe = id !== '' && byId.get(Number(id));
  if (!recipe || !Number.isFinite(n) || n < .5 || n > maxPortions || !Number.isInteger(n * 2)) return '';
  const veg = recipeVegetables(recipe,n);
  return portionNutrition(scaleNutrition(recipe,n),true) + `<p class="note">${
    veg.unknown ? 'Een deel van het groentegewicht is onbekend.' :
      (veg.estimated ? '≈ ' : '') + metric(veg.grams) + ' groente'}</p>`;
}

const flagsLabels = { favorite:'Favorieten', untried:'Nog te proberen', positive:'Beoordeling 4 of 5 sterren',
  work:'Geschikt voor werk', pre:'Vóór sport', post:'Na sport', portable:'Meeneembaar', reviewed:'Alleen zelf gecontroleerde etiketten', own:'Eigen recepten' };
export const filterPresets = {
  protein:['Eiwitrijk', { proteinMin:20 }], work:['Voor werk',{ work:true,portable:true }],
  evening:['Lichte avondsnacks',{ kcalMax:180 }], quick:['Binnen vijf minuten',{ minutesMax:5 }],
  pre:['Vóór sporten',{ pre:true }], post:['Na sporten',{ post:true }]
};
export function filterDialog(state, filter) {
  return `<dialog class="filter-dialog" id="advanced-filters" aria-labelledby="filter-title">
    <form class="filter-sheet" data-feature="filters">
      <header><h2 id="filter-title">Receptfilters</h2>${act('filter-close','Sluiten')}</header>
      <div class="filter-content">
        ${select('preset','Filterprofiel',[['','Kies een profiel'],...Object.entries(filterPresets).map(([id,[label]])=>[id,label]),
        ...state.filterProfiles.map(item=>[item.id,item.name])],'')}
        <div class="fields">${select('taste','Smaak',[['','Alles'],['hartig','Hartig'],['zoet','Zoet']],filter.taste ?? '')}
        ${num('minutesMax','Max. bereidingstijd (min)',filter.minutesMax,0,300)}
        ${select('storage','Koeling',[['','Maakt niet uit'],...storageOptions],filter.storage ?? '')}</div>
        <details class="panel form-section"><summary>Voedingswaarden per portie</summary><div class="section-body"><div class="fields">
          ${nutrientKeys.map(key=>num(key+'Min','Min. '+nutrientLabels[key],filter[key+'Min'],0,key==='kcal'?12000:1500,'any')+
          num(key+'Max','Max. '+nutrientLabels[key],filter[key+'Max'],0,key==='kcal'?12000:1500,'any')).join('')}
        </div></div></details>
        <details class="panel form-section"><summary>Voorkeuren en momenten</summary><div class="section-body chip-checks">
          ${filterFlags.map(key => toggle(key,flagsLabels[key],filter[key])).join('')}</div></details>
        <details class="panel form-section"><summary>Ingrediënten en allergenen</summary><div class="section-body">
          ${text('include','Bevat deze ingrediënten',filter.include,'placeholder="Bijv. mango, kwark" maxlength="160"')}
          ${text('exclude','Zonder deze ingrediënten',filter.exclude,'placeholder="Bijv. mosterd" maxlength="160"')}
          <p class="note">Scheid ingrediënten met komma’s. Voor het uitsluiten van allergenen telt alleen een recept met zelf gecontroleerde etiketten.</p>
          <fieldset><legend>Sluit opgegeven allergenen uit</legend><div class="chip-checks">
          ${allergenOptions.map(key => toggle('allergens',cap(key),filter.allergens?.includes(key),key)).join('')}</div></fieldset>
          <p class="note">${labelCheckText}</p></div>
        </details>
        <div class="field-line filter-save">${text('profileName','Bewaren als eigen profiel','', 'maxlength="55"')}
          ${act('filter-save','Bewaar profiel')}${act('filter-delete','Verwijder eigen profiel','hidden','text-button danger')}</div>
        ${status}
      </div>
      <footer><output id="filter-count" aria-live="polite"></output><div class="button-row">${act('filter-reset','Wis filters')}${submit('Toon recepten')}</div></footer>
    </form>
  </dialog>`;
}

export function cookingView(recipe, state, session) {
  const n = session.servings;
  const veg = recipeVegetables(recipe,n);
  const last = recipe.steps.length - 1;
  const index = Math.min(session.step,last);
  const minutes = stepMinutes(recipe,index);
  const stepText = recipe.steps[index] ?? '';
  const checklist = recipe.ingredients.map((ingredient,i) => {
    const view = formatIngredient(ingredient,n);
    return `<li><label class="checkbox cook-check"><input type="checkbox" data-cook-check="${i}"${check(session.checked.includes(i))}><span>${h(cap(view.name))}</span><strong>${h(view.amount || 'Naar smaak')}</strong></label></li>`;
  }).join('');
  const done = session.complete;
  return `<div class="cooking-shell">
    <header class="cook-header"><a class="button" href="#recipe/${recipe.id}">Sluiten</a>
      <span id="wake-status" class="note">Scherm actief houden indien mogelijk</span></header>
    <div class="cook-intro"><span class="date-label">Kookmodus</span><h1>${h(recipe.name)}</h1>
      <label for="cook-progress">${done ? 'Afgerond' : index === -1 ? 'Ingrediënten klaarzetten' : 'Stap ' + (index + 1) + ' van ' + recipe.steps.length}</label>
      <progress id="cook-progress" max="${recipe.steps.length + 1}" value="${done ? recipe.steps.length + 1 : index + 1}"></progress>
    </div>
    ${hazelnutRisk(recipe) ? safety(recipe) : ''}
    ${done ? `<section class="panel cook-current">
      <h2>Snack klaar</h2><p>Hoe vond je het recept?</p>
      ${select('cook-rating','Jouw beoordeling',[[0,'Geen beoordeling'], ...[1,2,3,4,5].map(i=>[i,i+' '+(i===1?'ster':'sterren')])],state.ratings[recipe.id] ?? 0,'data-cook-rating')}
      ${act('cook-favorite',state.favorites.includes(recipe.id) ? 'Favoriet opgeslagen' : 'Bewaar als favoriet',
        `aria-pressed="${state.favorites.includes(recipe.id)}"`)}
      ${!veg.unknown && veg.grams > 0 ? `<button type="button" class="button" data-action="veg-eaten" data-id="${recipe.id}">Vandaag gegeten</button>` : ''}
      ${act('cook-reset','Opnieuw koken','', 'text-button')}
    </section>` : index === -1 ? `<section class="panel cook-current">
      <div class="section-head"><h2>Ingrediënten</h2>
        ${select('cook-servings','Porties',Array.from({length:maxPortions*2},(_,i)=>[(i+1)/2,formatPortions((i+1)/2)]),n,'data-cook-servings')}
      </div>${portionNutrition(scaleNutrition(recipe,n),true)}<ul class="cook-list">${checklist}</ul>${hazelnutRisk(recipe) ? '' : safety(recipe)}</section>` :
      `<section class="panel cook-current"><h2>${'Stap ' + (index+1)}</h2><p class="cook-step">${h(stepText)}</p>
      ${minutes ? `<p class="note">Timer voor een kijkmoment. Controleer zelf of de ingrediënten gaar zijn.</p>${act('cook-start-step','Start timer · '+minutes+' min',`data-minutes="${minutes}"`)}` : ''}
      </section>`}
    <details class="panel form-section cook-timers" id="cook-timers" data-keep-open>
      <summary>Timers${session.timers.length ? ' (' + session.timers.length + ')' : ''}</summary>
      <div class="section-body">
        ${session.timers.length ? `<ul class="timer-list">${session.timers.map(timer => `<li><div><strong>${h(timer.label)}</strong>
          <time data-timer-id="${h(timer.id)}" data-timer-end="${timer.endAt}" data-timer-remaining="${timer.remaining ?? ''}">${secondsLeft(timer) ? timerLabel(secondsLeft(timer)) : 'Klaar'}</time></div>
          <div class="button-row">${secondsLeft(timer) ? act('cook-toggle-timer',timer.remaining === null ? 'Pauze' : 'Verder',`data-id="${h(timer.id)}"`) : ''}
          ${act('cook-delete-timer','Verwijder',`data-id="${h(timer.id)}"`,'text-button')}</div></li>`).join('')}</ul>` : ''}
        <form class="timer-form field-line" data-feature="timer">
          ${text('label','Naam timer','','maxlength="90" placeholder="Bijv. Roosteren"')}${num('minutes','Minuten',3,1,240,1,true)}${submit('Start timer')}
          ${status}
        </form>
        <p class="note">Bij terugkomst berekent de app de resterende tijd opnieuw. Meldingen zijn alleen zichtbaar wanneer SnackLab open is.</p>
      </div>
    </details>
    ${index >= 0 && !done ? `<details class="panel form-section" id="cook-ingredients" data-keep-open><summary>Ingrediënten terugkijken</summary><div class="section-body"><ul class="cook-list">${checklist}</ul></div></details>` : ''}
    <div class="cook-controls">${done ? link('#recipe/'+recipe.id,'Terug naar recept','primary') :
      `${act('cook-step','Vorige',`data-step="-1"${no(index < 0)}`)}
      ${act('cook-step',index === -1 ? 'Begin met koken' : index === last ? 'Klaar' : 'Volgende stap','data-step="1"','primary')}`}</div>
  </div>`;
}
