import { formatPortions, localDate, maxPortions, metric } from './core.js';
import { h } from './screens.js';
import { dayProduce, entryProduce, loggableProduce, produceGoals, produceGuides, produceProgress } from './vegetables.js';

const todayLabel = new Intl.DateTimeFormat('nl-NL', { weekday:'long', day:'numeric', month:'long' });
const gram = (value,estimated = false) => (estimated ? '≈ ' : '') + metric(value);
const labels = { vegetable:'Groente', fruit:'Fruit' };

function bar(id,grams,kind) {
  const goal = produceGoals[kind];
  return `<progress id="${id}" max="${goal}" value="${Math.min(grams,goal)}"></progress>`;
}

function dayMeters(prefix,produce,detail = false) {
  return `<div class="produce-meters">${Object.keys(labels).map(kind => {
    const { grams, estimated } = produce[kind];
    const id = prefix + '-' + kind;
    const { remaining } = produceProgress(grams,kind);
    return `<div class="produce-meter ${kind}">
      <label for="${id}"><strong>${labels[kind]}</strong><span>${gram(grams,estimated)} van ${produceGoals[kind]} g</span></label>
      ${bar(id,grams,kind)}
      ${detail ? `<small>${remaining > 0 ? 'Nog ' + gram(remaining,estimated) : 'Dagdoel bereikt'}</small>` : ''}
    </div>`;
  }).join('')}</div>`;
}

export function produceToday(state) {
  return `<section class="panel veg-today">
    <div><h2>Groente en fruit vandaag</h2>${dayMeters('home-produce',dayProduce(state.vegetables))}</div>
    <a class="button" href="#dagmeter">Open dagmeter</a>
  </section>`;
}

export function produceProfile(state) {
  const { heightCm, weightKg } = state.vegetables;
  return `<section class="panel veg-profile"><h2>Lengte, gewicht en dagdoelen</h2>
    <p>Voor volwassenen adviseert het Voedingscentrum minimaal <strong>${produceGoals.vegetable} g groente</strong> en <strong>${produceGoals.fruit} g fruit per dag</strong>. Deze doelen gelden ongeacht lengte of gewicht. Je invoer wordt lokaal bewaard.</p>
    <form id="veg-profile-form">
      <div class="fields">
        <label class="field"><span>Lengte (cm)</span><input name="height" type="number" inputmode="decimal" min="50" max="260" step="0.1" value="${heightCm ?? ''}" placeholder="Bijv. 175"></label>
        <label class="field"><span>Gewicht (kg)</span><input name="weight" type="number" inputmode="decimal" min="20" max="500" step="0.1" value="${weightKg ?? ''}" placeholder="Bijv. 75"></label>
      </div>
      <p class="form-message" role="alert"></p>
      <div class="button-row"><button class="button primary" type="submit">Profiel opslaan</button><a class="button" href="#dagmeter">Dagmeter</a></div>
    </form>
    <div class="veg-log-links"><a class="veg-source" href="${produceGuides.vegetable}" target="_blank" rel="noopener">Groenteadvies</a>
      <a class="veg-source" href="${produceGuides.fruit}" target="_blank" rel="noopener">Fruitadvies</a></div>
  </section>`;
}

export function produceCaption(produce, onlyPositive = false) {
  return Object.entries(labels).filter(([kind]) => !onlyPositive || produce[kind].grams > 0)
    .map(([kind,label]) => caption(produce[kind],label)).join(' · ');
}

function caption(info,label) {
  if (info.unknown && info.grams === 0) return label + ': onbekend';
  return (info.unknown ? 'Minstens ' : '') + gram(info.grams,info.estimated) + ' ' + label.toLowerCase();
}

function portionMeter(kind,produce) {
  const amount = produce[kind];
  const id = 'recipe-produce-' + kind;
  const label = labels[kind];
  const inDrink = kind === 'fruit' && produce.drinkable && (amount.grams > 0 || amount.unknown);
  const known = inDrink || !(amount.unknown && amount.grams === 0);
  const counted = inDrink ? 0 : amount.grams;
  const { percent } = produceProgress(counted,kind);
  return `<div class="produce-meter ${kind}">
    ${known ? `<label for="${id}"><strong>${label}</strong><span>${inDrink ? '0 g voor je doel' : caption(amount,label)}</span></label>
      ${bar(id,counted,kind)}<small>${known && amount.unknown && !inDrink ? 'Minstens ' : ''}${percent}% van ${produceGoals[kind]} g</small>` :
      `<strong>${label}</strong><p class="produce-unknown">Hoeveelheid onbekend</p>`}
    ${inDrink ? `<small>${caption(amount,label)} in de drank</small>` : ''}
  </div>`;
}

export function producePortion(state,recipe,produce) {
  const logged = dayProduce(state.vegetables).entries.filter(entry => entry.recipeId === recipe.id)
    .reduce((sum,entry) => sum + entry.portions,0);
  const eligible = loggableProduce(produce);
  const partial = produce.vegetable.unknown || produce.fruit.unknown;
  return `<div class="veg-portion produce-portion">
    <div><h3>Groente en fruit in deze portie</h3>
      <div class="produce-meters">${portionMeter('vegetable',produce)}${portionMeter('fruit',produce)}</div>
      ${produce.drinkable && produce.fruit.grams > 0 ? `<p class="note">Fruit dat je drinkt, telt apart van je fruitdoel. <a href="${produceGuides.fruit}" target="_blank" rel="noopener">Voedingscentrum</a></p>` : ''}
      ${partial ? '<p class="note">Vul bij je eigen recept de onbekende hoeveelheden per portie in voor een compleet totaal.</p>' : ''}
      ${produce.vegetable.estimated || produce.fruit.estimated ? '<p class="note">Stukgewichten zijn geschat.</p>' : ''}
      ${logged ? `<p class="note">Vandaag bijgehouden · ${formatPortions(logged)}</p>` : ''}
    </div>
    <div class="button-row">
      ${eligible.grams || eligible.fruitGrams ? `<button class="button primary" type="button" data-action="veg-eaten" data-id="${recipe.id}">Vandaag gegeten</button>` : ''}
      <a class="button" href="#dagmeter">Dagmeter</a>
    </div>
  </div>`;
}

export function produceGrocery(produce) {
  return `<div class="veg-shop"><strong>${produceCaption(produce)}</strong>
    <p>Voor recepten en weekplannen op je lijst. In de dagmeter houd je bij wat je hebt gegeten.</p>
    <a href="#dagmeter">Naar dagmeter</a></div>`;
}

const servingOptions = value => Array.from({ length:maxPortions * 2 }, (_,index) => {
  const n = (index + 1) / 2;
  return `<option value="${n}"${n === value ? ' selected' : ''}>${formatPortions(n)}</option>`;
}).join('');

function entryContents(entry) {
  if (entry.recipeId !== null) return `<label class="field"><span class="sr-only">Porties voor ${h(entry.name)}</span>
    <select name="amount">${servingOptions(entry.portions)}</select></label>`;
  return `<div class="produce-entry-amounts">
    <label class="field"><span>Groente (g)</span><input name="grams" type="number" inputmode="decimal" min="0" max="10000" step="0.1" value="${entry.grams || ''}"></label>
    <label class="field"><span>Fruit (g)</span><input name="fruitGrams" type="number" inputmode="decimal" min="0" max="10000" step="0.1" value="${entry.fruitGrams || ''}"></label>
  </div>`;
}

export function produceLog(state,date) {
  const today = localDate();
  const day = dayProduce(state.vegetables,date);
  const dateText = date === today ? 'Vandaag' : todayLabel.format(new Date(date + 'T12:00:00'));
  return `<a class="back" href="#home">← Vandaag</a>
    <div class="page-heading"><p class="date-label">${h(dateText)}</p><h1>Dagmeter</h1></div>
    <section class="panel veg-log-meter">
      <h2>Groente en fruit</h2>
      ${dayMeters('log-produce',day,true)}
      <div class="veg-log-links"><a href="#profile">Mijn profiel</a><a href="#grocery">Boodschappen</a></div>
    </section>
    <section class="panel veg-day-log"><h2>Wat heb je gegeten?</h2>
      <form id="veg-date-form" class="veg-date-form">
        <label class="field"><span>Bekijk dag</span><input name="date" type="date" required min="0001-01-01" max="${today}" value="${date}"></label>
        <button class="button" type="submit">Bekijk</button>${date === today ? '' : '<a class="button" href="#dagmeter">Vandaag</a>'}
      </form>
      ${day.entries.length ? `<ul class="clean-list veg-entries" role="list">${day.entries.map(entry => `<li>
        <form class="veg-entry" data-veg-edit="${entry.id}">
          <div><strong>${h(entry.name)}</strong><small>${produceCaption(entryProduce(entry),true)}</small></div>
          ${entryContents(entry)}
          <button class="button" type="submit">Bewaar</button>
          <button class="button text-button danger" type="button" data-action="veg-remove" data-id="${entry.id}" aria-label="Verwijder ${h(entry.name)}">Verwijder</button>
          <p class="form-message" role="alert"></p>
        </form>
      </li>`).join('')}</ul>` : '<p class="note">Je hebt op deze dag nog niets bijgehouden.</p>'}
    </section>
    <section class="panel veg-add"><h2>Groente of fruit toevoegen</h2>
      <p>Voeg bijvoorbeeld een losse appel of de groente bij je avondeten toe. Gebruik het eetbare gewicht.</p>
      <form id="veg-eaten-form" data-date="${date}">
        <label class="field"><span>Maaltijd of product</span><input name="meal" type="text" maxlength="110" placeholder="Bijv. Appel of avondeten"></label>
        <div class="fields">
          <label class="field"><span>Groente (g)</span><input name="grams" type="number" inputmode="decimal" min="0" max="10000" step="0.1" placeholder="Bijv. 150"></label>
          <label class="field"><span>Fruit (g)</span><input name="fruitGrams" type="number" inputmode="decimal" min="0" max="10000" step="0.1" placeholder="Bijv. 135"></label>
        </div>
        <p class="form-message" role="alert"></p>
        <div class="button-row"><button class="button primary" type="submit">Toevoegen</button><a class="button" href="#recipes">Bekijk recepten</a></div>
      </form>
    </section>`;
}
