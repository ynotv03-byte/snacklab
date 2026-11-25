import { formatPortions, localDate, maxPortions, metric } from './core.js';
import { h } from './screens.js';
import { dayVegetables, entryVegetables, vegetableGoal, vegetableGuide, vegetableProgress } from './vegetables.js';

const todayLabel = new Intl.DateTimeFormat('nl-NL', { weekday:'long', day:'numeric', month:'long' });
const gram = (value,estimated = false) => (estimated ? '≈ ' : '') + metric(value);
const goalText = vegetableGoal + ' g';

function bar(id,grams) {
  return `<progress id="${id}" max="${vegetableGoal}" value="${Math.min(grams,vegetableGoal)}"></progress>`;
}

export function vegetableToday(state) {
  const { grams, estimated } = dayVegetables(state.vegetables);
  return `<section class="panel veg-today">
    <div><h2>Groente vandaag</h2><label for="veg-home-meter"><strong>${gram(grams,estimated)}</strong> van ${goalText} bijgehouden</label>
      ${bar('veg-home-meter',grams)}</div>
    <a class="button" href="#groente">Open groentemeter</a>
  </section>`;
}

export function vegetableProfile(state) {
  const { heightCm, weightKg } = state.vegetables;
  return `<section class="panel veg-profile"><h2>Lengte, gewicht en groentedoel</h2>
    <p>Voor volwassenen is het advies minimaal <strong>${goalText} groente per dag</strong>. Je lengte en gewicht worden lokaal bewaard. Het groenteadvies blijft hetzelfde bij verschillende lengtes en gewichten.</p>
    <form id="veg-profile-form">
      <div class="fields">
        <label class="field"><span>Lengte (cm)</span><input name="height" type="number" inputmode="decimal" min="50" max="260" step="0.1" value="${heightCm ?? ''}" placeholder="Bijv. 175"></label>
        <label class="field"><span>Gewicht (kg)</span><input name="weight" type="number" inputmode="decimal" min="20" max="500" step="0.1" value="${weightKg ?? ''}" placeholder="Bijv. 75"></label>
      </div>
      <p class="form-message" role="alert"></p>
      <div class="button-row"><button class="button primary" type="submit">Profiel opslaan</button><a class="button" href="#groente">Groentemeter</a></div>
    </form>
    <a class="veg-source" href="${vegetableGuide}" target="_blank" rel="noopener">Voedingscentrum · Dagadvies voor groente</a>
  </section>`;
}

export function vegetableCaption(info) {
  if (info.unknown && info.grams === 0) return 'Groentehoeveelheid onbekend';
  return (info.unknown ? 'Minstens ' + gram(info.grams,info.estimated) : gram(info.grams,info.estimated)) + ' groente';
}

export function vegetablePortion(state,recipe,info) {
  const known = !(info.unknown && info.grams === 0);
  const { percent } = vegetableProgress(info.grams);
  const logged = dayVegetables(state.vegetables).entries.filter(entry => entry.recipeId === recipe.id)
    .reduce((sum,entry) => sum + entry.portions,0);
  return `<div class="veg-portion">
    <div><h3>Groente in deze portie</h3>
      ${known ? `<label for="veg-recipe-meter"><strong>${vegetableCaption(info)}</strong> · ${percent}% van ${goalText}</label>
        ${bar('veg-recipe-meter',info.grams)}` : `<p><strong>${vegetableCaption(info)}</strong></p>`}
      ${info.unknown ? '<p class="note">Vul bij je eigen recept het groentegewicht per portie in voor een compleet totaal.</p>' :
        info.estimated ? '<p class="note">Geschat op basis van het gewicht per stuk.</p>' : ''}
      ${logged ? `<p class="note">Vandaag bijgehouden · ${formatPortions(logged)}</p>` : ''}
    </div>
    <div class="button-row">
      ${!info.unknown && info.grams > 0 ? `<button class="button primary" type="button" data-action="veg-eaten" data-id="${recipe.id}">Vandaag gegeten</button>` : ''}
      <a class="button" href="#groente">Groentemeter</a>
    </div>
  </div>`;
}

export function vegetableGrocery(info) {
  return `<div class="veg-shop"><strong>${vegetableCaption(info)}</strong>
    <p>Voor recepten en weekplannen op je lijst. Je dagmeter telt bij als je invoert wat je hebt gegeten.</p>
    <a href="#groente">Naar groentemeter</a></div>`;
}

const servingOptions = value => Array.from({ length:maxPortions * 2 }, (_,index) => {
  const n = (index + 1) / 2;
  return `<option value="${n}"${n === value ? ' selected' : ''}>${formatPortions(n)}</option>`;
}).join('');

export function vegetableLog(state,date) {
  const today = localDate();
  const { grams, entries, estimated } = dayVegetables(state.vegetables,date);
  const { remaining } = vegetableProgress(grams);
  const dateText = date === today ? 'Vandaag' : todayLabel.format(new Date(date + 'T12:00:00'));
  return `<a class="back" href="#home">← Vandaag</a>
    <div class="page-heading"><p class="date-label">${h(dateText)}</p><h1>Groentemeter</h1></div>
    <section class="panel veg-log-meter">
      <h2>Dagdoel</h2>
      <label for="veg-log-meter"><strong>${gram(grams,estimated)}</strong> van ${goalText} bijgehouden</label>
      ${bar('veg-log-meter',grams)}
      <p>${remaining > 0 ? 'Nog ' + gram(remaining,estimated) + ' tot je dagdoel.' : 'Je hebt je dagdoel bereikt.'}</p>
      <div class="veg-log-links"><a href="#profile">Mijn profiel</a><a href="#grocery">Boodschappen</a></div>
    </section>
    <section class="panel veg-day-log"><h2>Wat heb je gegeten?</h2>
      <form id="veg-date-form" class="veg-date-form">
        <label class="field"><span>Bekijk dag</span><input name="date" type="date" required min="0001-01-01" max="${today}" value="${date}"></label>
        <button class="button" type="submit">Bekijk</button>${date === today ? '' : '<a class="button" href="#groente">Vandaag</a>'}
      </form>
      ${entries.length ? `<ul class="clean-list veg-entries" role="list">${entries.map(entry => `<li>
        <form class="veg-entry" data-veg-edit="${entry.id}">
          <div><strong>${h(entry.name)}</strong>${entry.recipeId === null ? '' : `<small>${gram(entryVegetables(entry),entry.estimated)} groente</small>`}</div>
          <label class="field">${entry.recipeId === null ?
            `<span class="sr-only">Grammen voor ${h(entry.name)}</span><input name="amount" required type="number" inputmode="decimal" min="1" max="10000" step="0.1" value="${entry.grams}">` :
            `<span class="sr-only">Porties voor ${h(entry.name)}</span><select name="amount">${servingOptions(entry.portions)}</select>`}</label>
          <button class="button" type="submit">Bewaar</button>
          <button class="button text-button danger" type="button" data-action="veg-remove" data-id="${entry.id}" aria-label="Verwijder ${h(entry.name)}">Verwijder</button>
          <p class="form-message" role="alert"></p>
        </form>
      </li>`).join('')}</ul>` : '<p class="note">Je hebt op deze dag nog geen groente ingevoerd.</p>'}
    </section>
    <section class="panel veg-add"><h2>Andere groente toevoegen</h2>
      <p>Voeg bijvoorbeeld de groente van je avondeten toe. Gebruik het eetbare gewicht zoals je het hebt geserveerd.</p>
      <form id="veg-eaten-form" data-date="${date}">
        <div class="fields">
          <label class="field"><span>Maaltijd of groente</span><input name="meal" type="text" maxlength="110" placeholder="Bijv. Broccoli bij het avondeten"></label>
          <label class="field"><span>Groente (g)</span><input name="grams" required type="number" inputmode="decimal" min="1" max="10000" step="0.1" placeholder="Bijv. 150"></label>
        </div>
        <p class="form-message" role="alert"></p>
        <div class="button-row"><button class="button primary" type="submit">Groente toevoegen</button><a class="button" href="#recipes">Bekijk recepten</a></div>
      </form>
    </section>`;
}
