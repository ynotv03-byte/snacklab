import { hazelnutRisk } from './core.js';

const guides = {
  sport: { label: 'Eten rond het sporten', url: 'https://www.voedingscentrum.nl/nl/thema/eten-bij-sport-en-beweging/planning-eten-en-drinken-rond-sportmomenten.aspx' },
  protein: { label: 'Eiwit en spierherstel', url: 'https://www.voedingscentrum.nl/nl/service/vraag-en-antwoord/afvallen-en-gewicht/heb-je-extra-eiwit-proteine-nodig-voor-spierherstel-en-spiergroei-na-krachttraining-of-duursport.aspx' },
  shake: { label: 'Eiwitshakes en sporten', url: 'https://www.voedingscentrum.nl/nl/service/vraag-en-antwoord/gezonde-voeding-en-voedingsstoffen/is-een-eiwitshake-gezond-en-nodig-als-je-sport.aspx' },
  snack: { label: 'Tussendoortjes', url: 'https://www.voedingscentrum.nl/nl/service/vraag-en-antwoord/gezonde-voeding-en-voedingsstoffen/wat-zijn-gezonde-tussendoortjes-.aspx' },
  fiber: { label: 'Vezels', url: 'https://www.voedingscentrum.nl/encyclopedie/vezels.aspx' },
  avocado: { label: 'Vetten in avocado', url: 'https://www.voedingscentrum.nl/nl/service/vraag-en-antwoord/gezonde-voeding-en-voedingsstoffen/hoeveel-vet-zit-erin/avocado.aspx' }
};

// Koppel de uitleg aan vaste recept-ID's, onafhankelijk van de sortering in de app.
const standardUse = {
  0: ['Voor je werkpauze',
    'Met de snackwortels eet je groente en krijg je vezels binnen. De yoghurtdip levert wat eiwit. Neem de wortels en dip apart mee en houd de dip gekoeld.',
    ['fiber', 'protein'], 'snack'],
  1: ['Hartig-zoet tussendoor',
    'Een groentesnack voor als je zin hebt in iets zoets én hartigs. De vezels komen vooral uit de wortels. De honing maakt de dip zoeter en levert toegevoegde suiker.',
    ['fiber', 'carbs'], 'snack'],
  2: ['Groentesnack bij kleine trek',
    'De wortels voegen groente en vezels toe. De kleine portie kruidenroomkaas geeft de snack een romige smaak. Handig als je tussendoor iets krokants wilt dippen.',
    ['fiber', 'kcal'], 'fiber'],
  3: ['Lichte hartige avondsnack',
    'Komkommer is waterrijke groente. De kruidenroomkaas maakt de hapjes romig, met een bescheiden hoeveelheid eiwit. Dit past bij kleine trek na het avondeten.',
    ['kcal', 'protein'], 'snack'],
  4: ['Lichte avondsnack na het sporten',
    'Als je na het sporten al hebt gegeten en later nog trek hebt, is dit een kleine hartige optie. Komkommer voegt groente en knapperigheid toe. De kipfilet levert het meeste eiwit, dat bijdraagt aan spierherstel.',
    ['protein', 'kcal'], 'protein'],
  5: ['Vóór het sporten',
    'Handig als je vóór je training nog trek hebt. De banaan levert het grootste deel van de koolhydraten, die je lichaam als brandstof kan gebruiken. De honing voegt wat suiker toe en kun je naar smaak weglaten.',
    ['carbs', 'fat'], 'sport'],
  6: ['Kwark na krachttraining',
    'De kwark en vanille-whey leveren eiwit voor spierherstel. De mango voegt koolhydraten en fruit toe. Dit past goed als je na je training trek hebt en de volgende maaltijd nog even op zich laat wachten.',
    ['protein', 'carbs'], 'protein'],
  7: ['Zoete hapjes na krachttraining',
    'Als je na krachttraining zin hebt in iets fris, kun je de aardbeien in de chocoladedip dopen. De kwark en whey leveren eiwit voor spierherstel en de aardbeien voegen fruit en wat vezels toe.',
    ['protein', 'fiber'], 'protein'],
  8: ['Shake na het sporten',
    'De melk en whey leveren eiwit voor spierherstel. De banaan en melk leveren koolhydraten om je energievoorraad aan te vullen. Praktisch als je nog niet aan tafel kunt en liever iets drinkt.',
    ['protein', 'carbs'], 'shake'],
  9: ['Hartige wrap voor je werkpauze',
    'De volkoren wrap levert koolhydraten en vezels. De kipfilet geeft je eiwit en de komkommer en sla voegen groente toe. Rol hem vooraf op en neem hem gekoeld mee.',
    ['protein', 'fiber'], 'snack'],
  10: ['Zoet tussendoor na krachttraining',
    'Een romige pudding als je na het trainen zin hebt in iets zoets. De kwark en whey leveren eiwit voor je spieren en de banaan levert koolhydraten. Je kunt hem vooraf klaarmaken en gekoeld bewaren.',
    ['protein', 'carbs'], 'protein'],
  11: ['Frisse shake na het sporten',
    'De mango en melk leveren koolhydraten. Whey en melk leveren eiwit voor spierherstel. Een drinkbare optie als je na de training nog even op je normale maaltijd moet wachten.',
    ['protein', 'carbs'], 'shake'],
  12: ['Warm snackmoment na een ochtendtraining',
    'De banaan levert koolhydraten en de eieren en whey geven je eiwit voor spierherstel. Handig als je na een ochtendtraining tijd hebt om iets warms te bakken.',
    ['protein', 'carbs'], 'sport'],
  13: ['Eiwitrijk avonddessert',
    'De kwark en whey geven dit toetje eiwit. De frambozen zorgen voor de meeste vezels. Handig als je ’s avonds nog zin hebt in iets zoets met fruit en wat extra eiwit.',
    ['protein', 'fiber'], 'snack'],
  14: ['Frisse middagsnack',
    'De appel zorgt voor de knapperigheid en levert vezels. De kwark en whey in de vanilledip voegen eiwit toe. Een optie voor de middag als er nog tijd zit tussen lunch en avondeten.',
    ['fiber', 'protein'], 'snack'],
  15: ['Goed mee te nemen voor de lunchpauze',
    'De volkoren wrap levert koolhydraten en vezels, het kipfiletbeleg levert eiwit. De honing-mosterdsaus geeft smaak. Neem de wrap gekoeld mee en houd hem koud tot je pauze.',
    ['carbs', 'protein'], 'snack'],
  16: ['Ruim vóór je training',
    'De volkoren wrap levert koolhydraten. Ei voegt eiwit toe en avocado levert vet, vooral onverzadigd. Dit is een stevigere keuze als er nog ruim tijd zit tussen eten en sporten.',
    ['carbs', 'fat'], 'sport'],
  17: ['Na een lange of zware training',
    'De banaan en volkoren wrap leveren koolhydraten om je energievoorraad aan te vullen. De kwark en whey leveren eiwit voor spierherstel. Kies deze stevigere wrap als je na afloop trek hebt en nog niet snel aan tafel gaat.',
    ['carbs', 'protein'], 'sport'],
  18: ['Zoete wrap bij stevige trek',
    'De volkoren wrap en aardbeien leveren koolhydraten en vezels. De whey voegt eiwit toe aan de romige vulling. Een optie als je meer trek hebt dan een schaaltje aardbeien alleen kan stillen.',
    ['fiber', 'protein'], 'snack'],
  19: ['Hartige avondsnack met ei',
    'De gekookte eieren leveren het meeste eiwit en de yoghurt geeft de salade een romige structuur. Met dikke plakken komkommer eet je er meteen groente bij.',
    ['protein', 'kcal'], 'snack'],
  20: ['Warme snack na krachttraining',
    'De gebakken kip levert eiwit voor je spierherstel en de volkoren wrap koolhydraten voor je energievoorraad. Met sla en komkommer erbij is dit een hartige keuze als je na het sporten flink trek hebt.',
    ['protein', 'carbs'], 'sport'],
  21: ['Stevige, warme lunchpauze',
    'Ei en kaas leveren eiwit, de wrap levert koolhydraten en de avocado voegt vooral onverzadigd vet toe. Dit is een stevigere optie voor als je tijdens je pauze trek hebt in iets warms.',
    ['protein', 'kcal'], 'avocado'],
  22: ['Na een ochtendtraining',
    'De eieren, whey en kwark leveren samen eiwit voor spierherstel. Banaan zorgt voor koolhydraten en de frambozen voegen fruit en vezels toe. De pancakes passen ook bij een steviger ontbijt.',
    ['protein', 'fiber'], 'sport']
};

function ownUse(recipe, nutrition) {
  if (hazelnutRisk(recipe)) {
    return ['Voedingsinformatie', 'De voedingswaarden hieronder zijn ter informatie.', ['kcal', 'protein', 'carbs']];
  }
  if (recipe.moments.includes('post') && nutrition.protein >= 15) {
    return ['Na het sporten', 'Het eiwit in deze portie kan bijdragen aan spierherstel. Een optie als je na je training trek hebt en je volgende maaltijd nog even op zich laat wachten.', ['protein', 'carbs'], 'protein'];
  }
  if (recipe.moments.includes('pre') && nutrition.carbs >= 15 &&
      Number.isFinite(nutrition.kcal) && nutrition.kcal <= 240 && Number.isFinite(nutrition.fat) && nutrition.fat <= 8) {
    return ['Vóór het sporten', 'De koolhydraten in deze portie kunnen je lichaam brandstof geven. Dit kan passen als je vóór je training wat trek hebt.', ['carbs', 'fat'], 'sport'];
  }
  if (recipe.moments.includes('work') && recipe.portable && ['cold', 'shelf'].includes(recipe.storage)) {
    return ['Voor je werkpauze', recipe.storage === 'cold' ?
      'Je hebt deze snack als meeneembaar ingesteld. Houd hem gekoeld tot je pauze.' :
      'Je hebt deze snack als ongekoeld meeneembaar ingesteld. Volg de bewaarinstructies van de ingrediënten.',
    ['kcal', 'protein', 'fiber'], 'snack'];
  }
  if (nutrition.protein >= 15) {
    return ['Eiwit bij je snackmoment', 'Het eiwit in deze portie draagt bij aan het onderhoud en herstel van je spieren.', ['protein'], 'protein'];
  }
  if (nutrition.fiber >= 3) {
    return ['Vezels bij je snackmoment', 'Deze portie levert vezels. Vezels helpen je darmen goed te werken.', ['fiber'], 'fiber'];
  }
  if (nutrition.carbs >= 15) {
    return ['Koolhydraten als brandstof', 'De koolhydraten in deze portie leveren energie.', ['carbs'], 'sport'];
  }
  if (Object.values(nutrition).some(Number.isFinite)) {
    return ['Een tussendoortje naar keuze', 'Kijk bij je gekozen portie en hoeveel trek je hebt. Bij Voedingswaarden zie je welke waarden voor dit recept zijn ingevuld.', ['kcal', 'protein', 'carbs', 'fat', 'fiber'], 'snack'];
  }
  return ['Voedingswaarden nog onbekend', 'Vul bij Bewerken de waarden in die je weet. SnackLab gebruikt je invoer om uit te leggen wat een portie levert.', []];
}

export function snackUse(recipe, nutrition) {
  const use = recipe.footballRecovery ? ['Na voetbal of krachttraining',
    'De volkoren wrap levert koolhydraten voor je energievoorraad. De vulling levert eiwit voor spierherstel. Een hele wrap kan passen als kleine maaltijd wanneer je na de training trek hebt en je volgende maaltijd op zich laat wachten.',
    ['protein','carbs','kcal','fat'],'sport'] : recipe.custom ? ownUse(recipe, nutrition) : standardUse[recipe.id];
  if (!use) return null;
  const [moment, explanation, keys, guide] = use;
  return { moment, explanation, keys: keys.filter(key => Number.isFinite(nutrition[key])), source: guides[guide] };
}
