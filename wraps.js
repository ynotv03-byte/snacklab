// Referentieportie in eetbare grammen, gevolgd door kcal, eiwit, koolhydraten, vet en vezels.
// Voor de bronnen en afronding, zie README.md. De waarden zijn zonder bakvet.
const nutritionReference = {
  'volkoren wrap': [62, 172, 5.5, 27.3, 3.3, 4.9],
  kipfilet: [100, 110, 23, 0, 1.5, 0],
  avocado: [180, 335, 3.6, 3.2, 33.1, 5.6],
  'verse babyspinazie': [100, 26, 3.2, .9, .6, 2],
  komkommer: [50, 6, .4, .6, .2, .3],
  'kruidenroomkaas light': [100, 146, 7.4, 5.1, 10, .6],
  'griekse yoghurt 2%': [100, 70, 9.9, 3, 2, 0],
  mosterd: [5, 6, .3, .3, .4, .2],
  honing: [20, 64, .1, 16, 0, 0],
  'light mozzarella': [100, 154, 19, 1.5, 8, 0],
  eieren: [50, 66, 6.2, .1, 4.6, 0],
  'geraspte 30+ kaas': [100, 286, 29, 2, 18, 0],
  'rauwe gepelde gamba’s': [100, 70, 16, 0, .7, 0],
  knoflook: [100, 149, 6.36, 30.96, .5, 2.1],
  limoensap: [100, 25, .42, 8.02, .07, .4],
  'cottage cheese': [100, 97, 11, 3, 4.5, 0]
};

const produce = 'Groente & fruit';
const dairy = 'Zuivel & eieren';
const pantry = 'Voorraadkast';
const item = (product, amount, group, unit = 'g') => ({ product, amount, unit, group });
const season = product => item(product, null, pantry, '');
const wrap = { ...item('volkoren wrap', 1, 'Brood & wraps', 'stuk'), gramsPerUnit:60 };
const chicken = grams => ({ ...item('kipfilet', grams, 'Vlees & beleg'), prep:'rauw gewicht' });
const avocado = { ...item('avocado', 40, produce), prep:'vruchtvlees' };
const spinach = item('verse babyspinazie', 25, produce);
const cucumber = item('komkommer', 50, produce);
const yogurt = item('griekse yoghurt 2%', 30, dairy);
const garlicPowder = season('knoflookpoeder');
const pepper = season('zwarte peper');
const salt = season('zout');
const step = (title, text, minutes) => ({ title, text, ...(minutes === undefined ? {} : {minutes}) });

const prepareGreens = step('Maak de groenten klaar',
  'Was de komkommer en de babyspinazie indien nodig. Dep de bladeren droog en snijd de komkommer in dunne reepjes. Zet de groenten apart voordat je de rauwe kip aanraakt.');
const cookChicken = step('Bak de kip helemaal gaar',
  'Bak de kip zonder bakvet in een antiaanbakpan op middelhoog vuur. Keer regelmatig en reken ongeveer 6–8 minuten. Bak zo nodig langer. Bij een kerntemperatuur van 75 °C houd je die minstens 30 seconden aan in het dikste stukje. Leg de gare kip op een schoon bord.',6);
const prepareChicken = step('Kruid de kip',
  'Snijd de kipfilet op een aparte plank in dunne reepjes. Kruid met knoflookpoeder en zwarte peper. Was na contact met rauwe kip je handen en het gebruikte keukengerei.');
const soften = step('Verwarm de wrap kort','Verwarm de wrap zonder bakvet in een schone koekenpan, ongeveer 15–20 seconden per kant, tot hij soepel is.');

function calculateNutrition(ingredients) {
  const keys = ['kcal','protein','carbs','fat','fiber'];
  const totals = keys.map(() => 0);
  for (const ingredient of ingredients) {
    const reference = nutritionReference[ingredient.product];
    if (!reference) continue; // Kleine hoeveelheden kruiden naar smaak.
    const grams = ingredient.amount * (ingredient.gramsPerUnit ?? 1);
    const [referenceGrams, ...values] = reference;
    values.forEach((value, index) => { totals[index] += value * grams / referenceGrams; });
  }
  return Object.fromEntries(keys.map((key, index) => {
    const rounding = key === 'kcal' ? 1 : 10;
    return [key, Math.round(totals[index] * rounding) / rounding];
  }));
}

function recoveryWrap({id, name, description, minutes, tags, ingredients, steps, temperature, work = false, beforeSport = false,
    mealPrep, flavor, otherUses, allergens = [], timingNote = '', allergenTip = '', foodSafety = 'poultry'}) {
  return {
    id, name, description, minutes, taste:'hartig', tags:['wraps','herstelsnacks', ...tags],
    ...calculateNutrition(ingredients), ingredients, steps,
    allergens:['gluten', 'melk', ...allergens], hazelnut:'unknown',
    image:'./recipe-' + (id + 1) + '.webp',
    moments:['post', ...(work ? ['work'] : []), ...(beforeSport ? ['pre'] : [])],
    footballRecovery:true, difficulty:'Makkelijk', temperature, mealPrep, flavor, otherUses, timingNote, allergenTip, foodSafety
  };
}

export const recoveryWraps = [
  recoveryWrap({
    id:23, name:'Kip-avocado roomkaaswrap', minutes:12, tags:['romig','fris'],
    description:'Een romige, frisse volkoren wrap met gebakken kip, avocado, verse babyspinazie, komkommer en kruidenroomkaas light.',
    temperature:'Warm of koud', work:true, flavor:'Romig, fris en hartig',
    otherUses:'Ook geschikt als lunch of gekoelde werkwrap.',
    mealPrep:'Bewaar kip en vulling gekoeld. Prak de avocado vlak voor het eten en beleg de wrap dan pas.',
    timingNote:'De optionele krokante afwerking kost 2–4 minuten extra.',
    ingredients:[wrap,chicken(100),avocado,spinach,item('kruidenroomkaas light',25,dairy),cucumber,garlicPowder,pepper,salt],
    steps:[
      prepareGreens,
      step('Snijd en kruid de kip','Snijd de kipfilet op een aparte plank in dunne reepjes en breng op smaak met knoflookpoeder, peper en een beetje zout. Was je handen en reinig het gebruikte keukengerei.'),
      cookChicken,
      step('Prak de avocado','Prak het vruchtvlees met een vork tot een grove spread.'),
      soften,
      step('Besmeer en beleg','Verdeel de kruidenroomkaas en avocado over de wrap. Leg de babyspinazie, komkommer en gare kip in het midden. Houd de zijkanten vrij.'),
      step('Rol de wrap op','Vouw de zijkanten naar binnen. Rol vanaf de onderkant op en leg de naad omlaag. Serveer warm of gebruik eerder gebakken, gekoeld bewaarde kip voor de koude versie.'),
      step('Rooster eventueel krokant','Rooster de opgerolde wrap zonder bakvet ongeveer 1–2 minuten per kant. Keer zodra de onderkant licht kleurt.',1)
    ]
  }),
  recoveryWrap({
    id:24, name:'Honing-mosterd kipwrap', minutes:12, tags:['romig','fris'],
    description:'Volkoren kip-avocadowrap met verse babyspinazie, komkommer en een frisse honing-mosterdsaus op basis van Griekse yoghurt.',
    temperature:'Warm of koud', work:true, beforeSport:true, flavor:'Lichtzoet, fris, romig en licht pittig',
    otherUses:'Ook geschikt als lunch of gekoelde werkwrap. Mosterd kan scherp vallen als je maag daar gevoelig voor is.',
    mealPrep:'Maak kip en saus vooraf en bewaar ze gekoeld in aparte bakjes. Beleg de wrap vlak voor het eten.',
    ingredients:[wrap,chicken(100),avocado,spinach,yogurt,item('mosterd',5,pantry),item('honing',7,pantry),cucumber,pepper,garlicPowder],
    allergens:['mosterd'],
    steps:[
      step('Maak de saus','Roer de Griekse yoghurt, mosterd en honing in een kommetje glad. Zet de saus apart in de koelkast.'),
      step('Snijd de groenten','Snijd de avocado en komkommer in dunne plakjes. Was de babyspinazie indien nodig en laat hem goed uitlekken. Zet de vulling apart van de rauwe kip.'),
      prepareChicken,cookChicken,soften,
      step('Beleg met saus en vulling','Verdeel ongeveer de helft van de saus over de wrap. Leg de babyspinazie, avocado, komkommer en gare kip in het midden. Lepel de rest van de saus over de kip.'),
      step('Rol de wrap stevig op','Vouw beide zijkanten naar binnen en rol vanaf de onderkant op. Serveer warm of vul de wrap met eerder gebakken, gekoeld bewaarde kip.')
    ]
  }),
  recoveryWrap({
    id:25, name:'Mozzarella-kip melt', minutes:15, tags:['krokant','romig','warm','quesadilla'],
    description:'Een goudbruin geroosterde volkoren wrap met gesmolten light mozzarella, gekruide kip, babyspinazie en avocado.',
    temperature:'Warm', flavor:'Krokant, kazig, romig en hartig',
    otherUses:'Lekker als warme lunch of kleine avondmaaltijd als je trek hebt in iets krokants.',
    mealPrep:'Bewaar de gare kip en overige vulling gekoeld. Dep de mozzarella droog en rooster de wrap vlak voor het eten.',
    ingredients:[wrap,chicken(75),item('light mozzarella',50,dairy),spinach,avocado,item('italiaanse kruiden',.5,pantry,'tl'),garlicPowder,pepper],
    steps:[
      step('Bereid de mozzarella en groenten voor','Laat de mozzarella uitlekken, dep droog en snijd dun. Prak de avocado en laat de indien nodig gewassen babyspinazie goed uitlekken. Zo blijft de wrap krokant.'),
      step('Kruid en snijd de kip','Snijd de kip op een aparte plank in kleine gelijkmatige stukjes. Kies een Italiaanse mix van alleen kruiden zoals oregano, basilicum en tijm, en meng met knoflookpoeder en peper. Was je handen en reinig het gebruikte keukengerei.'),
      cookChicken,
      step('Beleg één helft','Smeer de avocado op één helft van de wrap. Verdeel de babyspinazie en gare kip erover, met de mozzarella bovenop. Houd de rand vrij en vouw de andere helft eroverheen.'),
      step('Rooster de eerste kant','Verwarm een schone droge koekenpan op middellaag vuur. Rooster de gevouwen wrap ongeveer 2–3 minuten, tot de onderkant goudbruin is.',2),
      step('Keer en laat de kaas smelten','Keer met een brede spatel. Rooster ook de tweede kant 2–3 minuten, tot hij krokant is en de mozzarella gesmolten is.',2),
      step('Laat kort rusten','Leg de melt een minuut op een plank, zodat de vulling wat steviger wordt. Snijd hem vervolgens doormidden.')
    ]
  }),
  recoveryWrap({
    id:26, name:'Ei-avocado ontbijtwrap', minutes:10, tags:['romig','warm','ontbijt'],
    description:'Een warm geroosterde volkoren wrap met zacht roerei, avocado, verse babyspinazie en gesmolten 30+ kaas.',
    temperature:'Warm', work:true, flavor:'Zacht, romig, kazig en hartig', foodSafety:'egg',
    otherUses:'Ook geschikt als stevig ontbijt of warme lunch.',
    mealPrep:'Bij voorkeur vers bereiden. Neem je hem mee naar je werk, vervoer en bewaar hem gekoeld en verhit goed door voor het eten.',
    ingredients:[wrap,{...item('eieren',2,dairy,'stuk'),gramsPerUnit:50},avocado,spinach,item('geraspte 30+ kaas',20,dairy),pepper,salt],
    allergens:['ei'],
    steps:[
      step('Klop het ei los','Klop de eieren met peper en een beetje zout los. Was de babyspinazie indien nodig en dep droog. Prak de avocado apart met een vork.'),
      step('Laat de spinazie slinken','Verhit een antiaanbakpan op middellaag vuur. Laat de spinazie in 30–60 seconden net slinken.',1),
      step('Roer het ei gaar','Giet de eieren in de pan. Schuif met een spatel rustig van buiten naar binnen tot het roerei gestold is en je geen vloeibaar ei meer ziet.'),
      step('Beleg en vouw','Besmeer de wrap met avocado. Verdeel het roerei met spinazie en de geraspte kaas over het midden. Vouw dicht met de naad onderop.'),
      step('Rooster en keer','Rooster zonder bakvet op middellaag vuur ongeveer 2 minuten per kant. Serveer zodra beide kanten goudbruin zijn en de kaas gesmolten is.',2)
    ]
  }),
  recoveryWrap({
    id:27, name:'Knoflook-gamba wrap', minutes:12, tags:['fris','romig','warm','schaaldieren'], foodSafety:'seafood',
    description:'Een frisse volkoren wrap met knoflookgamba’s, avocado, verse babyspinazie, komkommer en limoen-yoghurtsaus.',
    temperature:'Warm', beforeSport:true, flavor:'Fris, knoflookachtig, romig en licht citrusachtig',
    otherUses:'Ook geschikt als vers bereide warme lunch. Kies vóór inspanning alleen voor knoflook als je weet dat je die goed verdraagt.',
    mealPrep:'Bij voorkeur vers maken. De saus kan vooraf worden gemengd en gekoeld bewaard.',
    timingNote:'De bereidingstijd is exclusief ontdooien in de koelkast.',
    allergenTip:'Controleer bij gamba’s ook op sulfieten zoals E223. Dit hangt af van het gekozen product.',
    ingredients:[wrap,item('rauwe gepelde gamba’s',125,'Vis & schaaldieren'),avocado,spinach,yogurt,
      {...item('knoflook',1,produce,'teen'),gramsPerUnit:3}, {...item('limoensap',2,pantry,'tl'),gramsPerUnit:5},
      cucumber,pepper,season('peterselie')],
    allergens:['schaaldieren'],
    steps:[
      step('Ontdooi en droog de gamba’s','Ontdooi bevroren gamba’s in de koelkast. Dep de gamba’s voor het bakken droog en houd ze apart van schone ingrediënten.'),
      step('Maak saus en groenten klaar','Meng de yoghurt met de helft van het limoensap en fijngesneden peterselie. Snijd de avocado en komkommer dun. Was de babyspinazie indien nodig en laat uitlekken.'),
      step('Breng de gamba’s op smaak','Pers of snipper de knoflook. Meng de gamba’s vlak voor het bakken met de knoflook, het overgebleven limoensap en zwarte peper. Was je handen na contact met de rauwe gamba’s.'),
      step('Bak de gamba’s en keer','Verwarm een antiaanbakpan op middelhoog vuur. Bak de gamba’s zonder bakvet circa 2–3 minuten per kant, afhankelijk van hun formaat. Keer ze als de eerste kant ondoorzichtig wordt. Bak tot ook de kern stevig en ondoorzichtig wit is.',2),
      soften,
      step('Vul en serveer','Bestrijk de wrap met de limoen-yoghurtsaus. Verdeel de babyspinazie, avocado, komkommer en gare warme gamba’s erover. Vouw de zijkanten naar binnen, rol stevig op en serveer direct.')
    ]
  }),
  recoveryWrap({
    id:28, name:'Cottage cheese-kipwrap', minutes:10, tags:['fris','romig'],
    description:'Een frisse volkoren wrap met gebakken kipfilet, cottage cheese, verse babyspinazie, komkommer en bieslook.',
    temperature:'Warm of koud', work:true, beforeSport:true, flavor:'Fris, licht, romig en hartig',
    otherUses:'Ook geschikt als lunch of gekoelde werkwrap. Dit is de minst vette van de zes nieuwe wraps.',
    mealPrep:'Bewaar kip en cottage cheese gekoeld. Dep de komkommer droog en voeg hem toe vlak voor het eten voor meer knapperigheid.',
    ingredients:[wrap,chicken(75),item('cottage cheese',100,dairy),spinach,cucumber,item('bieslook',1,produce,'tl'),pepper,garlicPowder],
    steps:[
      prepareGreens,
      step('Maak de cottagecheesevulling','Meng de cottage cheese met de fijngesneden bieslook en peper. Prak de korrels kort met een vork als je een gladdere vulling wilt.'),
      prepareChicken,cookChicken,soften,
      step('Besmeer en vul','Smeer de cottagecheesevulling uit over de wrap. Verdeel de babyspinazie, de komkommerreepjes en de gare kip over het midden.'),
      step('Rol dicht','Vouw de zijkanten naar binnen en rol stevig op. Eet warm of gebruik eerder gebakken en gekoeld bewaarde kip.')
    ]
  })
];
