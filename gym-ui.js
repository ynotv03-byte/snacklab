import { newId } from './core.js';
import { h } from './screens.js';
import { syncSportWeeks } from './model.js';
import { exerciseById, exercises, findExercises, groups, equipmentTypes, loadLabels, presets } from './exercises.js';
import { drawExercise } from './exercise-motion.js';
import { chronological, completedSets, copyTargets, currentSession, exerciseHistory, finishSession, fromRoutine,
  linkAgenda, liveSession, newGymSession, planDuration, progression, recentSet, remainingRest, storeSet,
  suggestedWeight, targetEntry, validateEntries, validateSession, validateWeight, workSets } from './gym-model.js';

export const gymPages = ['gym','gymedit','gymlog','gymset','exercises','exercise'];
const number = new Intl.NumberFormat('nl-NL', { maximumFractionDigits:2 });
const dateLabel = date => new Intl.DateTimeFormat('nl-NL',{ weekday:'short',day:'numeric',month:'short' }).format(new Date(date + 'T12:00:00'));
const limit = exercise => exercise.time ? 600 : 99;
const countLabel = exercise => exercise.time ? 'Seconden' : 'Herhalingen';
const unit = exercise => exercise.time ? 'sec.' : 'reps';
const weight = kg => kg === null || kg === undefined ? 'Nog geen gewicht' : number.format(kg) + ' kg';
const weightShort = (exercise,kg) => weight(kg) + (kg === null || kg === undefined ? '' :
  ({extra:' extra',assist:' assistentie',hand:' / dumbbell'})[exercise.load] ?? '');
const setText = (exercise, log) => `${log.count} ${unit(exercise)}${exercise.load === 'none' ? '' : ' · ' + weightShort(exercise,log.kg)}`;
const options = (items,value) => items.map(([key,title]) => `<option value="${h(key)}"${key === value ? ' selected' : ''}>${h(title)}</option>`).join('');
const back = (href,title) => `<a class="back" href="${href}">← ${title}</a>`;
const link = (href,title,primary=false) => `<a class="button${primary ? ' primary' : ''}" href="${href}">${title}</a>`;
const action = (key,title,attrs='',className='button') =>
  `<button type="button" class="${className}" data-gym="${key}" ${attrs}>${title}</button>`;
const message = () => '<p class="form-message" role="alert"></p>';
const empty = title => `<section class="panel"><p>${title}</p></section>`;
const select = (name,title,items,value='') =>
  `<label class="field"><span>${title}</span><select name="${name}">${options(items,value)}</select></label>`;
const field = (name,title,type,value,attrs='') =>
  `<label class="field"><span>${title}</span><input name="${name}" type="${type}" value="${h(value)}" ${attrs}></label>`;
const numeric = (name,title,value,min,max,extra='') =>
  field(name,title,'number',value,`min="${min}" max="${max}" inputmode="numeric" required ${extra}`);
const kgField = (exercise,kg,required=false) => exercise.load === 'none' ? '' :
  `<label class="field"><span>Gewicht (kg)</span><input name="kg" type="text" inputmode="decimal" maxlength="10" value="${h(kg === null ? '' : String(kg).replace('.',','))}" ${required ? 'required' : ''}><small>${loadLabels[exercise.load]}</small></label>`;

function readKg(form) {
  const text = String(form.get('kg') ?? '').trim().replace(',','.');
  return text === '' ? null : /^\d+(?:\.\d{1,2})?$/.test(text) ? Number(text) : NaN;
}

function canvas(exercise, controls=false) {
  return `<div class="gym-demo${controls ? ' full' : ''}">
    <canvas data-motion="${exercise.motion}" width="320" height="184" aria-hidden="true"></canvas>
    ${controls ? action('motion','Beweging afspelen','aria-pressed="false"','button gym-play') : ''}</div>`;
}

function guidance(exercise,level = 'h3') {
  return `${canvas(exercise,true)}<div class="gym-guide">
    <section><${level}>Uitgangspositie</${level}><p>${h(exercise.setup)}</p></section>
    <section><${level}>Beweging</${level}><p>${h(exercise.action)}</p></section>
    <section><${level}>Aandachtspunt</${level}><p>${h(exercise.tip)}</p></section></div>`;
}

function summaryCard(session) {
  const done = session.status === 'done';
  const path = '#gymlog/' + session.id;
  return `<a class="gym-summary" href="${path}"><span class="gym-day">${h(dateLabel(session.date))}</span>
    <span><strong>${h(session.name)}</strong><small>${session.time} · ${session.items.length} oefeningen · ${done ? completedSets(session) + ' werksets' : session.duration + ' min'}${session.agenda ? ' · Agenda' : ''}</small></span>
    <span aria-hidden="true">→</span></a>`;
}

function gymHome(state) {
  const gym = state.gym;
  const active = liveSession(gym);
  const planned = gym.sessions.filter(item => item.status === 'planned').sort(chronological);
  const history = gym.sessions.filter(item => item.status === 'done').sort((a,b) => b.endedAt - a.endedAt);
  return `${back('#agenda','Agenda')}
    <section class="gym-mast">
      <div><h1>Workouts</h1><p>Bereid je training voor, log je sets en pak de volgende keer je vorige gewichten erbij.</p>
        <div class="button-row">${active ? link('#gymlog/' + active.id,'Training hervatten',true) : link('#gymedit','Workout plannen',true)}
        ${link('#exercises','Oefeningen bekijken')}</div></div>
      <div class="gym-mast-art" aria-hidden="true"><span></span></div>
    </section>
    <section class="gym-block"><h2>Gepland</h2>${planned.length ? planned.map(summaryCard).join('') :
      empty('Je hebt nog geen workout gepland. Begin met een eigen selectie of kies een routine.')}</section>
    <details class="gym-details" id="gym-routines" data-keep-open>
      <summary>Routines <span>${gym.routines.length + presets.length}</span></summary>
      <div class="gym-routines">
        ${[...gym.routines,...presets].map(routine => `<div class="gym-routine"><a href="#gymedit/r-${routine.id}"><strong>${h(routine.name)}</strong>
          <small>${(routine.ids ?? routine.items).length} oefeningen · ${routine.ids ? 'Voorbeeldroutine' : 'Mijn routine'}</small></a>
          ${routine.ids ? '' : action('delete-routine','Verwijder',`data-id="${routine.id}" aria-label="Verwijder routine ${h(routine.name)}"`,'text-button danger')}</div>`).join('')}
      </div></details>
    <details class="gym-details" id="gym-history" data-keep-open>
      <summary>Trainingslogboek <span>${history.length}</span></summary>
      <div class="gym-history">${history.length ? history.map(summaryCard).join('') : '<p>Je afgeronde trainingen verschijnen hier.</p>'}</div></details>`;
}

const filters = () => `<div class="gym-search">
  ${field('query','Zoek oefeningen','search','','placeholder="Bijv. bankdrukken of curl" autocomplete="off"')}
  ${select('group','Spiergroep',[['','Alle groepen'],...groups.map(g => [g,g])])}
  ${select('equipment','Materiaal',[['','Elk materiaal'],...equipmentTypes.map(e => [e,e])])}
</div>`;

function exerciseCard(exercise,state,chosen) {
  const kg = suggestedWeight(state.gym,exercise.id);
  const info = `<span><strong>${h(exercise.name)}</strong><small>${exercise.group} · ${exercise.equipment}
    ${kg !== null ? ' · ' + weightShort(exercise,kg) : ''}</small></span>`;
  if (chosen) {
    return `<article class="gym-choice">${canvas(exercise)}${info}<div class="button-row">
      ${action('preview','Uitleg',`data-ref="${exercise.id}" aria-label="Uitleg voor ${h(exercise.name)}"`)}
      ${chosen.has(exercise.id) ? '<span class="gym-added">Toegevoegd</span>' :
        action('add','Voeg toe',`data-ref="${exercise.id}" aria-label="Voeg ${h(exercise.name)} toe"`,'button primary')}
    </div></article>`;
  }
  return `<a class="gym-choice gym-lib-card" href="#exercise/${exercise.id}">${canvas(exercise)}${info}<span aria-hidden="true">→</span></a>`;
}

function library(state) {
  return `${back('#gym','Workouts')}<div class="page-heading"><h1>Oefeningen</h1><p>Bekijk de beweging en houd per oefening je gewichten bij.</p></div>
    <section class="gym-catalogue" aria-label="Oefeningen zoeken">
      ${filters()}<p class="gym-result muted" role="status">${exercises.length} oefeningen</p>
      <div class="gym-results">${exercises.map(ex => exerciseCard(ex,state)).join('')}</div></section>`;
}

function exercisePage(state,id) {
  const exercise = exerciseById.get(id);
  if (!exercise) return missing('#exercises','Oefeningen');
  const previous = exerciseHistory(state.gym,id).slice(0,8);
  const estimate = recentSet(state.gym,id);
  const stored = state.gym.weights[id] ?? null;
  return `${back('#exercises','Oefeningen')}<div class="page-heading"><p class="date-label">${exercise.group} · ${exercise.equipment}</p>
    <h1>${h(exercise.name)}</h1></div>
    <section class="panel gym-tech">${guidance(exercise,'h2')}</section>
    ${exercise.load === 'none' ? '' : `<form class="panel gym-weight" data-gym-form="weight" data-id="${id}">
      <h2>Mijn huidige gewicht</h2><p>Dit vult SnackLab alvast in bij nieuwe workouts. ${estimate ? 'Laatste werkset: ' + setText(exercise,estimate) + '.' : ''}</p>
      ${kgField(exercise,stored)}<button class="button primary">Gewicht opslaan</button>
      ${stored === null ? '' : action('clear-weight','Wis mijn gewicht',`data-id="${id}"`,'text-button')}
      ${message()}</form>`}
    <section class="gym-block"><h2>Vorige werksets</h2>${previous.length ? previous.map(({session,item}) =>
      `<div class="gym-past"><a href="#gymlog/${session.id}">${h(dateLabel(session.date))} · ${h(session.name)}</a>
      <span>${workSets(item).map(log => setText(exercise,log)).join(' / ')}</span></div>`).join('') : empty('Je hebt deze oefening nog niet in een afgeronde workout gelogd.')}</section>`;
}

function targetRow(item,gym) {
  const exercise = exerciseById.get(item.ref);
  const past = recentSet(gym,item.ref);
  return `<article class="panel gym-target" data-entry="${item.id}" data-ref="${item.ref}">
    <div class="gym-target-top"><div><h3>${h(exercise.name)}</h3><small>${exercise.group} · ${exercise.equipment}</small></div>
      <div class="gym-move">${action('up','↑',`aria-label="${h(exercise.name)} omhoog"`)}
        ${action('down','↓',`aria-label="${h(exercise.name)} omlaag"`)}
        ${action('remove-entry','×',`aria-label="Verwijder ${h(exercise.name)}"`)}</div></div>
    ${past ? `<p class="gym-previous">Vorige werkset · ${setText(exercise,past)}</p>` : ''}
    <div class="gym-target-fields">
      ${numeric('sets','Sets',item.sets,1,12)}${numeric('low',countLabel(exercise) + ' min.',item.low,1,limit(exercise))}
      ${numeric('high',countLabel(exercise) + ' max.',item.high,1,limit(exercise))}
      ${numeric('rest','Rust (sec.)',item.rest,0,600)}${kgField(exercise,item.kg)}
    </div>
    ${field('entry-notes','Notitie bij oefening','text',item.notes,'maxlength="250" placeholder="Bijv. bank op stand 2"')}</article>`;
}

function editor(state,id) {
  const gym = state.gym;
  const isCopy = id?.startsWith('copy-');
  const isRoutine = id?.startsWith('r-');
  const isEdit = id && !isCopy && !isRoutine;
  const source = isCopy || isEdit ? currentSession(state,isCopy ? id.slice(5) : id) : null;
  if ((isEdit || isCopy) && !source) return missing('#gym','Workouts');
  if (isEdit && source.status !== 'planned') return missing('#gymlog/' + source.id,'Workout');
  const session = isEdit ? source : newGymSession();
  if (isCopy) Object.assign(session,{name:source.name,duration:source.duration,items:copyTargets(source.items),notes:source.notes});
  if (isRoutine) {
    const routine = [...gym.routines,...presets].find(item => item.id === id.slice(2));
    if (!routine) return missing('#gym','Workouts');
    session.items = fromRoutine(gym,routine.id);
    session.name = routine.name;
    session.duration = planDuration(session.items);
  }
  return `${back(isEdit ? '#gymlog/' + source.id : '#gym',isEdit ? 'Workout' : 'Workouts')}
    <div class="page-heading"><h1>${isEdit ? 'Workout aanpassen' : 'Workout plannen'}</h1></div>
    <form class="gym-editor" data-gym-form="plan" data-id="${h(session.id)}" data-edit="${Boolean(isEdit)}">
      <section class="panel gym-plan-info"><h2>Sessie</h2>
        ${field('name','Naam van workout','text',session.name,'required maxlength="90" placeholder="Bijv. Borst en triceps"')}
        <div class="gym-dates">${field('date','Datum','date',session.date,'min="0001-01-01" max="9999-12-31" required')}
        ${field('time','Starttijd','time',session.time,'required')}${numeric('duration','Duur (min.)',session.duration,10,300)}</div>
        <label class="checkbox gym-check"><input type="checkbox" name="agenda" ${!isEdit || session.agenda ? 'checked' : ''}> Koppel aan Agenda en sportvoeding</label>
      </section>
      <div class="gym-editor-head"><h2>Oefeningen <small id="gym-entry-count"></small></h2>
        ${action('picker','+ Oefening toevoegen','','button primary')}</div>
      ${!isEdit && !isCopy && !isRoutine ? `<div class="gym-start-routine">
        ${select('routine','Begin met een routine',[['','Zelf samenstellen'],...[...gym.routines,...presets].map(r => [r.id,r.name])])}
        ${action('apply-routine','Gebruik routine')}</div>` : ''}
      <div id="gym-targets">${session.items.map(item => targetRow(item,gym)).join('')}</div>
      <p id="gym-editor-empty" class="panel muted">Zoek op spiergroep of materiaal en voeg je eerste oefening toe.</p>
      <div class="gym-editor-head"><p class="muted" id="gym-duration"></p>${action('estimate','Gebruik tijdschatting')}</div>
      <details class="gym-details"><summary>Notities en routine bewaren</summary><div class="gym-editor-extra">
        <label class="field"><span>Workoutnotities</span><textarea name="notes" maxlength="500" rows="3">${h(session.notes)}</textarea></label>
        ${field('save-routine','Bewaar daarnaast als routine','text','','maxlength="70" placeholder="Naam van routine (optioneel)"')}</div></details>
      <div class="gym-save">${message()}<button class="button primary">Workout opslaan</button></div>
    </form>
    <dialog class="gym-picker" aria-labelledby="gym-picker-title"><div class="gym-picker-inner">
      <header><h2 id="gym-picker-title" tabindex="-1">Kies oefeningen</h2>${action('close-picker','Klaar')}</header>
      <section class="gym-catalogue" aria-label="Kies uit de oefeningen">${filters()}
        <p class="gym-result muted" role="status"></p><section id="gym-preview" hidden></section><div class="gym-results"></div></section>
    </div></dialog>`;
}

function missing(href,title) {
  return `${back(href,title)}<div class="page-heading"><h1>Niet beschikbaar</h1></div>${empty('Open een workout of oefening vanuit het overzicht.')}`;
}

function timerBlock(session) {
  return session.status === 'active' ? `<div class="gym-rest" id="gym-rest" data-ends="${session.timer?.endsAt ?? ''}" ${session.timer ? '' : 'hidden'}>
    <div><strong id="gym-rest-value"></strong><small id="gym-rest-caption">Rust na je set</small></div>
    ${action('clear-rest','Sluit',`data-id="${session.id}" aria-label="Sluit rusttimer"`)}</div>` : '';
}

function sessionPage(state,id) {
  const session = currentSession(state,id);
  if (!session) return missing('#gym','Workouts');
  const planned = session.status === 'planned', active = session.status === 'active';
  const total = completedSets(session);
  const target = session.items.reduce((sum,item) => sum + item.sets,0);
  const other = liveSession(state.gym);
  const elapsed = session.endedAt === null ? '' : ' · ' + Math.max(1,Math.round((session.endedAt - session.startedAt) / 60000)) + ' min getraind';
  return `${back('#gym','Workouts')}<div class="page-heading gym-session-heading">
    <p class="date-label">${h(dateLabel(session.date))} · ${session.time} · ${planned ? 'Gepland' : active ? 'Bezig' : 'Afgerond'}</p>
    <h1>${h(session.name)}</h1><p>${session.items.length} oefeningen · ${planned ? session.duration + ' min gepland' : total + ' werksets' + elapsed}</p>
    ${session.notes ? `<p class="gym-note">${h(session.notes)}</p>` : ''}
    <div class="button-row">
      ${planned ? other ? link('#gymlog/' + other.id,'Hervat actieve workout',true) :
        action('start','Start workout',`data-id="${id}"`,'button primary') : ''}
      ${planned ? link('#gymedit/' + id,'Aanpassen') : ''}
      ${session.agenda ? link('#food/' + session.agenda,'Sportvoeding') : ''}
      ${!active ? link('#gymedit/copy-' + id,'Opnieuw plannen') : ''}</div>
  </div>
  ${active ? `<div class="gym-progress"><label for="gym-set-progress">${total} van ${target} geplande werksets</label><progress id="gym-set-progress" max="${target}" value="${Math.min(total,target)}"></progress></div>` : ''}
  ${timerBlock(session)}
  <div class="gym-work-list">${session.items.map(item => {
    const exercise = exerciseById.get(item.ref);
    const previous = recentSet(state.gym,item.ref);
    const up = session.status !== 'done' && progression(state.gym,item);
    const setRoute = '#gymset/' + id + '/' + item.id;
    const loggedWork = workSets(item).length;
    return `<article id="gym-item-${item.id}" class="panel gym-work-item${loggedWork >= item.sets ? ' complete' : ''}">
      <div class="gym-work-top"><div><h2>${h(exercise.name)}</h2><p>${item.sets} × ${item.low}–${item.high} ${unit(exercise)}
        ${item.kg !== null ? ' · ' + weightShort(exercise,item.kg) : ''} · ${item.rest} sec. rust</p></div>
        ${active || !planned ? `<span class="gym-work-count" aria-label="${loggedWork} van ${item.sets} werksets">${loggedWork} / ${item.sets}</span>` : ''}</div>
      ${item.notes ? `<p class="gym-note">${h(item.notes)}</p>` : ''}
      ${previous && session.status !== 'done' ? `<p class="gym-previous">Vorige werkset · ${setText(exercise,previous)}</p>` : ''}
      ${up ? '<p class="gym-tip">Je haalde je bovengrens twee keer met herhalingen over. Overweeg de kleinste volgende gewichtsstap als de uitvoering goed blijft.</p>' : ''}
      <details class="gym-tech-inline" id="gym-tech-${item.id}" data-keep-open>
        <summary>Uitvoering bekijken</summary>${guidance(exercise)}</details>
      ${item.logs.length ? `<ol class="gym-sets">${item.logs.map(log => `<li><span>${log.type === 'warmup' ? 'Opwarming' : 'Werkset'}</span>
        <strong>${setText(exercise,log)}</strong>${active ? `<a href="${setRoute}/${log.id}" aria-label="Bewerk set ${setText(exercise,log)}">Bewerk</a>` : ''}</li>`).join('')}</ol>` : ''}
      ${active && item.logs.length < 30 ? link(setRoute,'+ Set loggen',loggedWork < item.sets) : ''}</article>`;
  }).join('')}</div>
  <div class="gym-footer">${active ? action('finish','Workout afronden',`data-id="${id}" ${session.items.some(item => item.logs.length) ? '' : 'disabled'}`,'button primary') : ''}
    ${action('delete-session',active ? 'Workout afbreken' : 'Workout verwijderen',`data-id="${id}"`,'text-button danger')}
    ${!active && !planned ? link('#gym','Naar workouts') : ''}
  </div>`;
}

function setPage(state,id,entryId,setId) {
  const session = currentSession(state,id);
  const item = session?.status === 'active' && session.items.find(entry => entry.id === entryId);
  const existing = setId && item && item.logs.find(log => log.id === setId);
  const href = session ? '#gymlog/' + id : '#gym';
  if (!item || (setId && !existing)) return missing(href,session ? 'Workout' : 'Workouts');
  const exercise = exerciseById.get(item.ref);
  const previous = recentSet(state.gym,item.ref);
  const recent = workSets(item).at(-1);
  const prefill = existing || recent;
  const kg = prefill?.kg ?? item.kg ?? suggestedWeight(state.gym,item.ref);
  return `${back(href,'Workout')}<div class="page-heading"><p class="date-label">${h(session.name)}</p>
    <h1>${existing ? 'Set aanpassen' : 'Set loggen'}</h1></div>
    <form class="panel gym-log-form" data-gym-form="set" data-id="${id}" data-entry="${entryId}" data-set="${h(setId)}">
      <h2>${h(exercise.name)}</h2><p>Gepland · ${item.low}–${item.high} ${unit(exercise)}</p>
      ${previous ? `<div class="gym-take-previous"><p>Vorige training · ${setText(exercise,previous)}</p>
        ${action('previous-set','Neem over','', 'button')}</div>` : ''}
      <div class="gym-log-fields">
        ${kgField(exercise,kg,true)}
        ${numeric('count',countLabel(exercise),prefill?.count ?? item.low,1,limit(exercise))}
        ${select('type','Type set',[['work','Werkset'],['warmup','Opwarming']],existing?.type ?? 'work')}
        ${exercise.time ? '' : select('rir','Herhalingen over',[['','Onbekend'],...[0,1,2,3,4,5].map(n => [String(n),String(n)])],existing?.rir == null ? '' : String(existing.rir))}
      </div>
      ${exercise.load === 'none' ? '' : `<label class="checkbox gym-check"><input name="save-weight" type="checkbox">
        Gebruik dit voortaan als mijn huidige gewicht</label>`}
      ${message()}<div class="button-row"><button class="button primary">Set opslaan</button>
      ${existing ? action('delete-set','Verwijder set',`data-id="${id}" data-entry="${entryId}" data-set="${setId}"`,'text-button danger') : ''}</div>
    </form>`;
}

export function gymView(route,state) {
  switch (route.name) {
    case 'gym': return gymHome(state);
    case 'gymedit': return editor(state,route.id);
    case 'gymlog': return sessionPage(state,route.id);
    case 'gymset': return setPage(state,route.id,route.sub,route.set);
    case 'exercise': return exercisePage(state,route.id);
    case 'exercises': return library(state);
  }
  return '';
}


export function attachGym(main,api) {
  const { getState,update,redraw,go,announce,route } = api;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const activeMotion = new WeakMap();
  let motionFrame;
  let restInterval;
  let chooserButton;
  let pendingEntry;
  let writing = false;
  let libraryValues = {};

  function paint(scope) {
    for (const canvas of scope.querySelectorAll('canvas[data-motion]')) drawExercise(canvas,canvas.dataset.motion);
  }

  function editorData(form) {
    return [...form.querySelectorAll('.gym-target')].map(row => {
      const get = key => row.querySelector(`[name="${key}"]`)?.value;
      return { id:row.dataset.entry,ref:row.dataset.ref,sets:Number(get('sets')),low:Number(get('low')),high:Number(get('high')),
        rest:Number(get('rest')),kg:readKg({get}),notes:get('entry-notes'),logs:[] };
    });
  }

  function refreshEditor() {
    const form = main.querySelector('[data-gym-form="plan"]');
    if (!form) return;
    const items = editorData(form);
    form.querySelector('#gym-entry-count').textContent = items.length ? String(items.length) : '';
    form.querySelector('#gym-editor-empty').hidden = Boolean(items.length);
    form.querySelector('#gym-duration').textContent = items.length ? 'Geschatte duur · ' + planDuration(items) + ' min' : '';
    form.querySelector('[data-gym="estimate"]').hidden = !items.length;
    for (const [i,row] of [...form.querySelectorAll('.gym-target')].entries()) {
      row.querySelector('[data-gym="up"]').disabled = i === 0;
      row.querySelector('[data-gym="down"]').disabled = i === items.length - 1;
    }
  }

  function redrawList(scope) {
    const values = Object.fromEntries([...scope.querySelectorAll('input, select')].map(input => [input.name,input.value]));
    const grid = scope.querySelector('.gym-results');
    const choices = findExercises(values);
    const dialog = scope.closest('dialog');
    if (!dialog) libraryValues = values;
    const chosen = dialog ? new Set([...main.querySelectorAll('.gym-target')].map(row => row.dataset.ref)) : null;
    scope.querySelector('.gym-result').textContent = choices.length === 1 ? '1 oefening' : choices.length + ' oefeningen';
    grid.innerHTML = choices.length ? choices.map(ex => exerciseCard(ex,getState(),chosen)).join('') :
      '<p class="panel">Geen oefeningen gevonden. Pas je zoekterm of filters aan.</p>';
    paint(grid);
  }

  function tickRest() {
    const rest = main.querySelector('#gym-rest');
    if (!rest || rest.hidden) return;
    const left = remainingRest({endsAt:Number(rest.dataset.ends)});
    const value = rest.querySelector('#gym-rest-value');
    const caption = rest.querySelector('#gym-rest-caption');
    const content = left ? Math.floor(left/60) + ':' + String(left % 60).padStart(2,'0') : 'Rust klaar';
    if (value.textContent !== content) value.textContent = content;
    caption.hidden = !left;
    rest.classList.toggle('elapsed',!left);
    if (!left) clearInterval(restInterval);
  }

  function rendered() {
    cancelAnimationFrame(motionFrame);
    clearInterval(restInterval);
    if (!gymPages.includes(route().name)) return;
    paint(main);
    refreshEditor();
    if (route().name === 'exercises' && Object.keys(libraryValues).length) {
      const scope = main.querySelector('.gym-catalogue');
      for (const input of scope.querySelectorAll('input, select')) input.value = libraryValues[input.name] ?? '';
      redrawList(scope);
    }
    if (reduced.matches) for (const control of main.querySelectorAll('[data-gym="motion"]')) {
      control.textContent = 'Toon eindhouding';
      control.removeAttribute('aria-pressed');
    }
    if (main.querySelector('#gym-rest:not([hidden])')) {
      restInterval = setInterval(tickRest,250);
      tickRest();
    }
    if (pendingEntry && route().name === 'gymlog') {
      const target = main.querySelector(`#gym-item-${pendingEntry}`);
      pendingEntry = undefined;
      requestAnimationFrame(() => {
        if (!target?.isConnected) return;
        const control = target.querySelector('a.button');
        control?.focus({preventScroll:true});
        target.scrollIntoView({block:'nearest'});
      });
    }
    const dialog = main.querySelector('.gym-picker');
    if (dialog) dialog.addEventListener('close', () => chooserButton?.focus());
  }

  function motion(button) {
    const demo = button.closest('.gym-demo');
    const canvas = demo.querySelector('canvas');
    const progress = activeMotion.get(canvas);
    const getPose = phase => drawExercise(canvas,canvas.dataset.motion,phase);
    cancelAnimationFrame(motionFrame);
    for (const other of main.querySelectorAll('[data-gym="motion"][aria-pressed="true"]')) {
      if (other === button) continue;
      const preview = other.closest('.gym-demo').querySelector('canvas');
      drawExercise(preview,preview.dataset.motion);
      activeMotion.delete(preview);
      other.textContent = 'Beweging afspelen';
      other.setAttribute('aria-pressed','false');
    }
    if (reduced.matches) {
      getPose(progress ? 0 : 1);
      activeMotion.set(canvas,!progress);
      button.textContent = progress ? 'Toon eindhouding' : 'Toon beginhouding';
      button.removeAttribute('aria-pressed');
      return;
    }
    if (progress) {
      activeMotion.delete(canvas);
      getPose(0);
      button.textContent = 'Beweging afspelen';
      button.setAttribute('aria-pressed','false');
      return;
    }
    activeMotion.set(canvas,true);
    button.textContent = 'Beweging pauzeren';
    button.setAttribute('aria-pressed','true');
    const start = performance.now();
    const animate = time => {
      if (!canvas.isConnected || canvas.closest('[hidden]') ||
          (canvas.closest('dialog') && !canvas.closest('dialog').open) || canvas.closest('details:not([open])')) {
        getPose(0);
        activeMotion.delete(canvas);
        button.textContent = 'Beweging afspelen';
        button.setAttribute('aria-pressed','false');
        return;
      }
      const phase = (1 - Math.cos((time-start) / 1400 * Math.PI)) / 2;
      getPose(phase);
      motionFrame = requestAnimationFrame(animate);
    };
    motionFrame = requestAnimationFrame(animate);
  }

  async function save(change,label,form) {
    if (writing) return false;
    writing = true;
    const submit = form?.querySelector('button:not([type="button"])');
    if (submit) submit.disabled = true;
    const status = form?.querySelector('.form-message');
    if (status) status.textContent = '';
    try {
      return await update(change,label,form);
    } finally {
      if (submit) submit.disabled = false;
      writing = false;
    }
  }

  function sessionFor(state,id,status) {
    const session = currentSession(state,id);
    if (!session || (status && status !== session.status)) throw new Error('Deze workout is intussen gewijzigd. Open hem opnieuw.');
    return session;
  }

  function changeTarget(control,operation) {
    const row = control.closest('.gym-target');
    if (operation === 'remove-entry') {
      const next = row.nextElementSibling ?? row.previousElementSibling;
      row.remove();
      (next?.querySelector('[name="sets"]') ?? main.querySelector('[data-gym="picker"]')).focus();
    } else {
      const adjacent = operation === 'up' ? row.previousElementSibling : row.nextElementSibling;
      if (!adjacent) return;
      if (operation === 'up') adjacent.before(row);
      else adjacent.after(row);
      control.focus();
    }
    refreshEditor();
    if (document.activeElement === document.body && row.isConnected) row.querySelector('[name="sets"]').focus();
  }

  main.addEventListener('input',event => {
    const scope = event.target.closest('.gym-catalogue');
    if (scope && event.target.matches('input, select')) redrawList(scope);
    if (event.target.closest('.gym-target')) refreshEditor();
  });
  main.addEventListener('change',event => {
    const scope = event.target.closest('.gym-catalogue');
    if (scope && event.target.matches('select')) redrawList(scope);
  });

  main.addEventListener('click',async event => {
    const control = event.target.closest('button[data-gym]');
    if (!control) return;
    const {gym:operation,id,entry,set,ref} = control.dataset;
    const state = getState();
    const form = control.closest('form');
    const targets = main.querySelector('#gym-targets');
    const dialog = main.querySelector('.gym-picker');
    const preview = dialog?.querySelector('#gym-preview');
    switch (operation) {
      case 'motion':
        motion(control);
        break;
      case 'picker':
        chooserButton = control;
        redrawList(dialog.querySelector('.gym-catalogue'));
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else { dialog.setAttribute('open',''); dialog.classList.add('fallback'); main.querySelector('.gym-editor').setAttribute('inert',''); }
        dialog.querySelector('h2').focus();
        break;
      case 'close-picker':
        if (typeof dialog.close === 'function') dialog.close();
        else { dialog.removeAttribute('open'); main.querySelector('.gym-editor').removeAttribute('inert'); chooserButton?.focus(); }
        preview.hidden = true;
        preview.innerHTML = '';
        break;
      case 'preview': {
        const ex = exerciseById.get(ref);
        preview.innerHTML = `<header><h3 tabindex="-1">${h(ex.name)}</h3>${action('close-preview','Sluit uitleg')}</header>${guidance(ex,'h4')}`;
        preview.hidden = false;
        paint(preview);
        if (reduced.matches) {
          const control = preview.querySelector('[data-gym="motion"]');
          if (control) { control.textContent = 'Toon eindhouding'; control.removeAttribute('aria-pressed'); }
        }
        preview.querySelector('h3').focus();
        break;
      }
      case 'close-preview':
        preview.hidden = true;
        preview.innerHTML = '';
        dialog.querySelector('[name="query"]').focus();
        break;
      case 'add': {
        if (targets.children.length >= 24) { dialog.querySelector('.gym-result').textContent = 'Je hebt het maximum van 24 oefeningen bereikt.'; return; }
        if (targets.querySelector(`[data-ref="${ref}"]`)) return;
        targets.insertAdjacentHTML('beforeend',targetRow(targetEntry(state.gym,ref),state.gym));
        const replacement = document.createElement('span');
        replacement.className = 'gym-added';
        replacement.textContent = 'Toegevoegd';
        control.replaceWith(replacement);
        replacement.closest('article').querySelector('[data-gym="preview"]').focus({preventScroll:true});
        refreshEditor();
        break;
      }
      case 'remove-entry':
      case 'up':
      case 'down':
        changeTarget(control,operation);
        break;
      case 'estimate':
        form.elements.duration.value = planDuration(editorData(form));
        announce('Geschatte duur ingevuld.');
        break;
      case 'apply-routine': {
        const key = form.elements.routine.value;
        if (!key) return;
        if (targets.children.length && !confirm('Vervang je huidige selectie door deze routine?')) return;
        const found = [...state.gym.routines,...presets].find(item => item.id === key);
        if (!found) return;
        const items = fromRoutine(state.gym,key);
        targets.innerHTML = items.map(item => targetRow(item,state.gym)).join('');
        if (!form.elements.name.value) form.elements.name.value = found.name;
        form.elements.duration.value = planDuration(items);
        refreshEditor();
        break;
      }
      case 'start':
        if (await save(draft => {
          const workout = sessionFor(draft,id,'planned');
          if (liveSession(draft.gym)) throw new Error('Rond eerst je actieve workout af.');
          workout.status = 'active';
          workout.startedAt = Date.now();
        },'Workout gestart.')) redraw();
        break;
      case 'clear-rest':
        if (await save(draft => { sessionFor(draft,id,'active').timer = null; })) redraw();
        break;
      case 'finish': {
        const session = currentSession(state,id);
        if (!session) return;
        if (completedSets(session) < session.items.reduce((sum,item) => sum + item.sets,0) &&
            !confirm('Je hebt nog geplande werksets openstaan. Wil je de workout afronden?')) return;
        if (await save(draft => finishSession(draft,sessionFor(draft,id,'active')),'Workout afgerond.')) redraw();
        break;
      }
      case 'delete-session': {
        const session = currentSession(state,id);
        if (!session || !confirm(session.status === 'active' ?
          'Deze workout afbreken en de gelogde sets verwijderen?' : 'Deze workout en de bijbehorende sets verwijderen?')) return;
        if (await save(draft => {
          sessionFor(draft,id,session.status);
          draft.gym.sessions = draft.gym.sessions.filter(item => item.id !== id);
        },'Workout verwijderd.')) go('#gym');
        break;
      }
      case 'delete-routine':
        if (confirm('Deze bewaarde routine verwijderen?') && await save(draft => {
          draft.gym.routines = draft.gym.routines.filter(item => item.id !== id);
        },'Routine verwijderd.')) redraw();
        break;
      case 'clear-weight':
        if (await save(draft => { delete draft.gym.weights[id]; },'Je gewicht is gewist.',form)) redraw();
        break;
      case 'delete-set':
        if (confirm('Deze set verwijderen?') && await save(draft => {
          const session = sessionFor(draft,id,'active');
          const target = session.items.find(item => item.id === entry);
          if (!target?.logs.some(item => item.id === set)) throw new Error('Deze set bestaat niet meer.');
          if (session.timer?.entryId === entry && target.logs.at(-1)?.id === set) session.timer = null;
          target.logs = target.logs.filter(item => item.id !== set);
        },'Set verwijderd.')) { pendingEntry = entry; go('#gymlog/' + id); }
        break;
      case 'previous-set': {
        const item = currentSession(state,form.dataset.id)?.items.find(entry => entry.id === form.dataset.entry);
        const last = item && recentSet(state.gym,item.ref);
        if (!last) return;
        if (form.elements.kg) form.elements.kg.value = String(last.kg).replace('.',',');
        form.elements.count.value = last.count;
        announce('Gewicht en herhalingen overgenomen.');
        break;
      }
    }
  });

  main.addEventListener('submit',async event => {
    const form = event.target;
    const operation = form.dataset.gymForm;
    if (!operation) return;
    event.preventDefault();
    const {id,entry,set} = form.dataset;
    const values = new FormData(form);
    if (operation === 'weight') {
      if (await save(state => {
        state.gym.weights[id] = validateWeight(readKg(values),exerciseById.get(id),true);
      },'Gewicht opgeslagen.',form)) redraw();
    }
    if (operation === 'plan') {
      const targets = editorData(form);
      if (await save((state,catalogue) => {
        const editing = form.dataset.edit === 'true';
        if (!editing && state.gym.sessions.length >= 3000) throw new Error('Je trainingslogboek is vol.');
        const previous = editing ? sessionFor(state,id,'planned') : { ...newGymSession(),id };
        const session = validateSession({ ...previous,name:values.get('name'),date:values.get('date'),time:values.get('time'),
          duration:Number(values.get('duration')),notes:values.get('notes'),items:targets });
        linkAgenda(state,session,values.has('agenda'));
        if (session.agenda) syncSportWeeks(state,session.agenda,catalogue);
        if (editing) state.gym.sessions[state.gym.sessions.indexOf(previous)] = session;
        else state.gym.sessions.push(session);
        const name = String(values.get('save-routine') ?? '').trim();
        if (name) {
          if (state.gym.routines.length >= 40) throw new Error('Je kunt maximaal 40 routines bewaren.');
          state.gym.routines.push({id:newId(),name,items:validateEntries(session.items)});
        }
      },'Workout opgeslagen.',form)) go('#gymlog/' + id);
    }
    if (operation === 'set') {
      if (await save(state => {
        const session = sessionFor(state,id,'active');
        const saved = storeSet(session,entry,{id:set,kg:readKg(values),count:Number(values.get('count')),
          rir:values.get('rir') ? Number(values.get('rir')) : null,type:values.get('type')});
        const ref = session.items.find(item => item.id === entry).ref;
        if (saved.kg !== null && values.has('save-weight')) state.gym.weights[ref] = saved.kg;
      },'Set opgeslagen.',form)) { pendingEntry = entry; go('#gymlog/' + id); }
    }
  });

  document.addEventListener('visibilitychange',tickRest);
  return rendered;
}
