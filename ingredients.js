// FoodData Central, SR Legacy (2018). De waarden gelden per 100 g eetbaar product.
import { normalizeText, nutrientKeys } from './core.js';

export const ingredientsLibrary = [
  {
    "name": "Banaan",
    "fdc": 173944,
    "source": "Bananas, raw",
    "piece": 118,
    "aliases": [
      "bananen"
    ],
    "per100g": {
      "kcal": 89.0,
      "protein": 1.09,
      "carbs": 22.84,
      "fat": 0.33,
      "fiber": 2.6
    }
  },
  {
    "name": "Appel met schil",
    "fdc": 171688,
    "source": "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)",
    "piece": 182,
    "aliases": [
      "appel",
      "appels"
    ],
    "per100g": {
      "kcal": 52.0,
      "protein": 0.26,
      "carbs": 13.81,
      "fat": 0.17,
      "fiber": 2.4
    }
  },
  {
    "name": "Komkommer",
    "fdc": 168409,
    "source": "Cucumber, with peel, raw",
    "piece": null,
    "aliases": [
      "komkommers"
    ],
    "per100g": {
      "kcal": 15.0,
      "protein": 0.65,
      "carbs": 3.63,
      "fat": 0.11,
      "fiber": 0.5
    }
  },
  {
    "name": "Wortel",
    "fdc": 170393,
    "source": "Carrots, raw",
    "piece": null,
    "aliases": [
      "wortels",
      "snackwortels"
    ],
    "per100g": {
      "kcal": 41.0,
      "protein": 0.93,
      "carbs": 9.58,
      "fat": 0.24,
      "fiber": 2.8
    }
  },
  {
    "name": "Aardbeien",
    "fdc": 167762,
    "source": "Strawberries, raw",
    "piece": null,
    "aliases": [
      "aardbei"
    ],
    "per100g": {
      "kcal": 32.0,
      "protein": 0.67,
      "carbs": 7.68,
      "fat": 0.3,
      "fiber": 2.0
    }
  },
  {
    "name": "Frambozen",
    "fdc": 167755,
    "source": "Raspberries, raw",
    "piece": null,
    "aliases": [
      "framboos"
    ],
    "per100g": {
      "kcal": 52.0,
      "protein": 1.2,
      "carbs": 11.94,
      "fat": 0.65,
      "fiber": 6.5
    }
  },
  {
    "name": "Mango",
    "fdc": 169910,
    "source": "Mangos, raw",
    "piece": null,
    "aliases": [
      "mangos"
    ],
    "per100g": {
      "kcal": 60.0,
      "protein": 0.82,
      "carbs": 14.98,
      "fat": 0.38,
      "fiber": 1.6
    }
  },
  {
    "name": "Ei (rauw, zonder schaal)",
    "fdc": 171287,
    "source": "Egg, whole, raw, fresh",
    "piece": 50,
    "aliases": [
      "ei",
      "eieren"
    ],
    "per100g": {
      "kcal": 143.0,
      "protein": 12.56,
      "carbs": 0.72,
      "fat": 9.51,
      "fiber": 0.0
    }
  },
  {
    "name": "Havermout",
    "fdc": 169705,
    "source": "Oats (Includes foods for USDA's Food Distribution Program)",
    "piece": null,
    "aliases": [
      "haver",
      "havervlokken"
    ],
    "per100g": {
      "kcal": 389.0,
      "protein": 16.89,
      "carbs": 66.27,
      "fat": 6.9,
      "fiber": 10.6
    }
  },
  {
    "name": "Honing",
    "fdc": 169640,
    "source": "Honey",
    "piece": null,
    "aliases": [],
    "per100g": {
      "kcal": 304.0,
      "protein": 0.3,
      "carbs": 82.4,
      "fat": 0.0,
      "fiber": 0.2
    }
  },
  {
    "name": "Rode paprika",
    "fdc": 170108,
    "source": "Peppers, sweet, red, raw",
    "piece": null,
    "aliases": [
      "paprika rood"
    ],
    "per100g": {
      "kcal": 26.0,
      "protein": 0.99,
      "carbs": 6.03,
      "fat": 0.3,
      "fiber": 2.1
    }
  },
  {
    "name": "Avocado",
    "fdc": 171705,
    "source": "Avocados, raw, all commercial varieties",
    "piece": null,
    "aliases": [],
    "per100g": {
      "kcal": 160.0,
      "protein": 2.0,
      "carbs": 8.53,
      "fat": 14.66,
      "fiber": 6.7
    }
  },
  {
    "name": "Spinazie",
    "fdc": 168462,
    "source": "Spinach, raw",
    "piece": null,
    "aliases": [],
    "per100g": {
      "kcal": 23.0,
      "protein": 2.86,
      "carbs": 3.63,
      "fat": 0.39,
      "fiber": 2.2
    }
  },
  {
    "name": "Tomaat",
    "fdc": 170457,
    "source": "Tomatoes, red, ripe, raw, year round average",
    "piece": null,
    "aliases": [
      "tomaten"
    ],
    "per100g": {
      "kcal": 18.0,
      "protein": 0.88,
      "carbs": 3.89,
      "fat": 0.2,
      "fiber": 1.2
    }
  },
  {
    "name": "Kikkererwten (gekookt)",
    "fdc": 173757,
    "source": "Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt",
    "piece": null,
    "aliases": [
      "gekookte kikkererwten"
    ],
    "per100g": {
      "kcal": 164.0,
      "protein": 8.86,
      "carbs": 27.42,
      "fat": 2.59,
      "fiber": 7.6
    }
  },
  {
    "name": "Magere Griekse yoghurt",
    "fdc": 170894,
    "source": "Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program)",
    "piece": null,
    "aliases": [
      "griekse yoghurt mager"
    ],
    "per100g": {
      "kcal": 59.0,
      "protein": 10.19,
      "carbs": 3.6,
      "fat": 0.39,
      "fiber": 0.0
    }
  }
];

const lookup = new Map(ingredientsLibrary.flatMap(food => [food.name, ...food.aliases].map(name => [normalizeText(name), food])));

export function estimateIngredients(ingredients, servings) {
  if (!Number.isFinite(servings) || servings <= 0 || !ingredients.length) return { values: {}, missing: [] };
  const totals = Object.fromEntries(nutrientKeys.map(key => [key, 0]));
  const missing = [];
  for (const { product, amount, unit } of ingredients) {
    const food = lookup.get(normalizeText(product));
    const grams = unit === 'g' ? amount : unit === 'kg' ? amount * 1000 : unit === 'stuk' && food?.piece ? amount * food.piece : null;
    if (!food || !Number.isFinite(amount) || !Number.isFinite(grams) || grams <= 0) {
      missing.push(product);
      continue;
    }
    for (const key of nutrientKeys) {
      const value = food.per100g[key];
      totals[key] = totals[key] === null || value === null ? null : totals[key] + value * grams / 100;
    }
  }
  const values = Object.fromEntries(nutrientKeys.map(key => [key, missing.length || totals[key] === null ?
    null : Math.round(totals[key] * 10 / servings) / 10]));
  return { values, missing: [...new Set(missing)] };
}
