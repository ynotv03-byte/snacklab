import { exerciseById, groups, presets } from './exercises.js';
import { formatTime, localDate, newId, newPlan, parseTime, planError, validDate } from './core.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const inRange = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const integer = (value, min, max) => Number.isInteger(value) && inRange(value,min,max);
const key = value => typeof value === 'string' && /^[\w-]{1,90}$/.test(value);
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const error = message => { throw new Error(message); };
const timestamp = value => integer(value,0,8640000000000000);
const unique = values => new Set(values).size === values.length;
export const emptyGym = () => ({ weights:{}, routines:[], sessions:[] });
export const liveSession = gym => gym.sessions.find(session => session.status === 'active');
export const currentSession = (state,id) => state.gym.sessions.find(session => session.id === id);
export const chronological = (a,b) => (a.date + a.time).localeCompare(b.date + b.time) || a.id.localeCompare(b.id);

export function validateWeight(value, exercise, required = false) {
  if (!exercise) error('Kies een bekende oefening.');
  if (exercise.load === 'none') return null;
  if (value === null && !required) return null;
  if (!inRange(value,0,1500) || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) {
    error('Vul een gewicht in van 0 tot 1500 kg, met maximaal twee decimalen.');
  }
  return value;
}

function validEntry(item) {
  const exercise = exerciseById.get(item?.ref);
  if (!exercise || !key(item.id) || !integer(item.sets,1,12) || !integer(item.rest,0,600) ||
      !integer(item.low,1,exercise.time ? 600 : 99) || !integer(item.high,item.low,exercise.time ? 600 : 99)) {
    error('Controleer sets, herhalingen en rusttijd bij elke oefening.');
  }
  return { id:item.id, ref:item.ref, sets:item.sets, low:item.low, high:item.high, rest:item.rest,
    kg:validateWeight(item.kg,exercise), notes:text(item.notes,250) };
}

export function validateEntries(items) {
  if (!Array.isArray(items) || !items.length || items.length > 24) error('Kies één tot 24 oefeningen.');
  const normalized = items.map(validEntry);
  if (!unique(normalized.map(item => item.ref)) || !unique(normalized.map(item => item.id))) {
    error('Voeg elke oefening één keer toe. Extra sets registreer je per oefening.');
  }
  return normalized;
}

export function validateLog(input, exercise) {
  const limit = exercise.time ? 600 : 99;
  if (!key(input?.id) || !integer(input.count,1,limit) || !timestamp(input.at) ||
      (input.rir !== null && !integer(input.rir,0,5)) || !['work','warmup'].includes(input.type)) {
    error(exercise.time ? 'Gebruik tussen 1 en 600 seconden.' : 'Gebruik tussen 1 en 99 herhalingen.');
  }
  return { id:input.id, kg:validateWeight(input.kg,exercise, true), count:input.count,
    rir:exercise.time ? null : input.rir, type:input.type, at:input.at };
}

export function validateSession(session) {
  if (!object(session) || !key(session.id) || !text(session.name,90) || !validDate(session.date) ||
      !Number.isFinite(parseTime(session.time)) || !integer(session.duration,10,300) ||
      !['planned','active','done'].includes(session.status) ||
      (session.agenda !== null && !key(session.agenda))) error('Controleer naam, datum, starttijd en duur.');
  if ((session.status === 'planned' && (session.startedAt !== null || session.endedAt !== null)) ||
      (session.status === 'active' && (!timestamp(session.startedAt) || session.endedAt !== null)) ||
      (session.status === 'done' && (!timestamp(session.startedAt) || !timestamp(session.endedAt) || session.endedAt < session.startedAt))) {
    error('De start- of eindtijd in het trainingslogboek klopt niet.');
  }
  const items = validateEntries(session.items).map((item,index) => {
    const source = session.items[index];
    if (!Array.isArray(source.logs) || source.logs.length > 30 || (session.status === 'planned' && source.logs.length)) error('Deze sessie bevat ongeldige sets.');
    const logs = source.logs.map(log => validateLog(log,exerciseById.get(item.ref)));
    if (!unique(logs.map(log => log.id))) error('Dubbele sets in een oefening.');
    return { ...item, logs };
  });
  const timer = session.timer;
  if (timer !== null && (session.status !== 'active' || !object(timer) || !timestamp(timer.endsAt) ||
      !items.some(item => item.id === timer.entryId))) error('De rusttimer is ongeldig.');
  return { id:session.id, name:text(session.name,90), date:session.date,time:session.time,duration:session.duration,
    status:session.status, agenda:session.agenda, startedAt:session.startedAt, endedAt:session.endedAt,
    timer:timer ? {endsAt:timer.endsAt,entryId:timer.entryId} : null, items, notes:text(session.notes,500) };
}

export function validateGym(input) {
  if (!object(input) || !object(input.weights) || !Array.isArray(input.routines) || input.routines.length > 40 ||
      !Array.isArray(input.sessions) || input.sessions.length > 3000) error('Workoutgegevens zijn ongeldig of te groot.');
  const weights = Object.fromEntries(Object.entries(input.weights).map(([id,value]) => {
    const ex = exerciseById.get(id);
    if (!ex || ex.load === 'none') error('Een opgeslagen gewicht verwijst naar een onbekende oefening.');
    return [id,validateWeight(value,ex,true)];
  }));
  const routines = input.routines.map(routine => {
    if (!key(routine?.id) || !text(routine.name,70)) error('Een routine heeft een ongeldige naam.');
    return {id:routine.id,name:text(routine.name,70),items:validateEntries(routine.items)};
  });
  const sessions = input.sessions.map(validateSession);
  if (!unique(routines.map(routine => routine.id)) || !unique(sessions.map(session => session.id)) ||
      !unique(sessions.filter(session => session.agenda !== null).map(session => session.agenda)) ||
      sessions.filter(session => session.status === 'active').length > 1) error('De back-up bevat dubbele of tegelijk actieve sessies.');
  return {weights,routines,sessions};
}

export function workSets(item) {
  return item.logs.filter(log => log.type === 'work');
}

export function exerciseHistory(gym,ref) {
  return gym.sessions.filter(session => session.status === 'done').map(session => ({
    session,item:session.items.find(item => item.ref === ref)
  })).filter(({item}) => item && workSets(item).length).sort((a,b) => b.session.endedAt-a.session.endedAt || chronological(b.session,a.session));
}

export function recentSet(gym,ref) {
  const past = exerciseHistory(gym,ref)[0];
  if (!past) return null;
  return { ...workSets(past.item).at(-1), date:past.session.date };
}

export function progression(gym, target) {
  const exercise = exerciseById.get(target.ref);
  if (!exercise || !['total','hand','single','stack','machine'].includes(exercise.load) || !Number.isFinite(target.kg)) return false;
  const history = exerciseHistory(gym,target.ref).slice(0,2);
  return history.length === 2 && history.every(({item}) => {
    const logs = workSets(item);
    return item.low === target.low && item.high === target.high && item.sets === target.sets &&
      logs.length >= target.sets && logs.every(log => log.kg === target.kg && log.count >= target.high && log.rir !== null && log.rir >= 2);
  });
}

export function suggestedWeight(gym,ref) {
  const exercise = exerciseById.get(ref);
  if (!exercise || exercise.load === 'none') return null;
  return gym.weights[ref] ?? recentSet(gym,ref)?.kg ?? (exercise.load === 'extra' ? 0 : null);
}

export function targetEntry(gym,ref,overrides = {}) {
  const timed = exerciseById.get(ref).time;
  return { id:newId(), ref, sets:3, low:timed ? 20 : 8, high:timed ? 40 : 12, rest:timed ? 45 : 90,
    kg:suggestedWeight(gym,ref), notes:'', logs:[], ...overrides };
}

export function fromRoutine(gym,id) {
  const user = gym.routines.find(routine => routine.id === id);
  if (user) return user.items.map(item => targetEntry(gym,item.ref,{ ...item, id:newId(),
    kg:exerciseById.get(item.ref).load === 'none' ? null : gym.weights[item.ref] ?? item.kg ?? suggestedWeight(gym,item.ref) }));
  return presets.find(preset => preset.id === id)?.ids.map(ref => targetEntry(gym,ref)) ?? [];
}

export function copyTargets(items) {
  return items.map(item => ({ ...item,id:newId(),logs:[] }));
}

export function planDuration(items) {
  let seconds = 5 * 60;
  for (const item of items) {
    const mid = (item.low + item.high) / 2;
    seconds += item.sets * mid * (exerciseById.get(item.ref).time ? 1 : 4) + Math.max(0,item.sets-1) * item.rest + 55;
  }
  return Math.min(300,Math.max(10,Math.ceil(seconds / 60)));
}

export function newGymSession() {
  return {id:newId(),name:'',date:localDate(),time:'18:00',duration:45,status:'planned',
    agenda:null,startedAt:null,endedAt:null,timer:null,items:[],notes:''};
}

function defaultMeal(plan) {
  const earlier = parseTime(plan.time) - Math.max(120,plan.lead + 30);
  plan.meal = formatTime((earlier + 1440) % 1440);
  plan.mealPreviousDay = earlier < 0;
}

export function linkAgenda(state,session,link) {
  if (!link) {
    session.agenda = null;
    return;
  }
  const conflicts = state.gym.sessions.filter(item => item.id !== session.id && item.agenda);
  let plan = state.plans.find(item => item.id === session.agenda && item.sport === 'Krachttraining');
  if (!plan) {
    plan = state.plans.find(item => item.sport === 'Krachttraining' && item.date === session.date &&
      item.time === session.time && !item.done);
    if (plan && conflicts.some(item => item.agenda === plan.id)) error('Op dit tijdstip is de agendatraining al gekoppeld aan een andere workout.');
    if (!plan) {
      plan = { ...newPlan(session.date), sport:'Krachttraining', time:session.time, duration:session.duration };
      defaultMeal(plan);
      state.plans.push(plan);
    }
  }
  const dateChanged = plan.date !== session.date || plan.time !== session.time;
  const initialGroup = new Set(plan.groups);
  for (const item of session.items) initialGroup.add(exerciseById.get(item.ref).group);
  plan.groups = groups.filter(group => initialGroup.has(group));
  plan.date = session.date;
  plan.time = session.time;
  plan.duration = session.duration;
  if (dateChanged && planError(plan)) defaultMeal(plan);
  session.agenda = plan.id;
}

export function syncGymAgenda(state,plan) {
  const session = state.gym.sessions.find(item => item.agenda === plan.id);
  if (!session) return;
  if (plan.sport !== 'Krachttraining') session.agenda = null;
  else if (session.status === 'planned') Object.assign(session,{date:plan.date,time:plan.time,duration:plan.duration});
}

export function remainingRest(timer, now=Date.now()) {
  return timer ? Math.ceil(Math.max(0,timer.endsAt-now)/1000) : 0;
}

export function storeSet(session,entryId,input, now=Date.now()) {
  if (session.status !== 'active') error('Start de sessie voordat je een set vastlegt.');
  const item = session.items.find(entry => entry.id === entryId);
  if (!item) error('Deze oefening staat niet meer in de sessie.');
  const existing = input.id ? item.logs.find(log => log.id === input.id) : null;
  if (input.id && !existing) error('Deze set is intussen verwijderd.');
  if (!existing && item.logs.length >= 30) error('Er kunnen maximaal 30 sets per oefening worden opgeslagen.');
  const saved = validateLog({ ...input,id:existing?.id ?? newId(),at:existing?.at ?? now },exerciseById.get(item.ref));
  if (existing) item.logs[item.logs.indexOf(existing)] = saved;
  else {
    item.logs.push(saved);
    session.timer = item.rest ? {entryId,endsAt:now+item.rest*1000} : null;
  }
  return saved;
}

export function finishSession(state,session,now=Date.now()) {
  if (session.status !== 'active') return;
  if (!session.items.some(item => item.logs.length)) error('Leg eerst minimaal één set vast.');
  session.status = 'done';
  session.endedAt = Math.max(session.startedAt,now);
  session.timer = null;
  const plan = state.plans.find(item => item.id === session.agenda);
  if (plan) plan.done = true;
}

export const completedSets = session => session.items.reduce((count,item) => count+workSets(item).length,0);
