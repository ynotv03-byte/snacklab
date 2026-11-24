// IDs komen overeen met de posities in SnackLab 4.1; behoud ze bij wijzigingen.
export const recipes = [
  {
    "id": 0,
    "name": "Snackwortels met knoflookdip",
    "kcal": 90,
    "protein": 6,
    "carbs": 13,
    "fat": 2,
    "fiber": 4,
    "weight": 200,
    "minutes": 4,
    "taste": "hartig",
    "tags": [
      "krokant",
      "fris"
    ],
    "ingredients": [
      {
        "product": "snackwortels",
        "amount": 150,
        "unit": "g",
        "group": "Groente & fruit"
      },
      {
        "product": "griekse yoghurt",
        "amount": 50,
        "unit": "g",
        "group": "Zuivel & eieren"
      },
      {
        "product": "knoflook",
        "amount": 0.5,
        "unit": "teen",
        "group": "Groente & fruit"
      },
      {
        "product": "peper",
        "amount": null,
        "unit": "",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "melk"
    ],
    "steps": [
      "Meng yoghurt, knoflook en peper. Serveer als dip."
    ],
    "image": "./recipe-01.webp"
  },
  {
    "id": 1,
    "name": "Snackwortels met honing-mosterdsaus",
    "kcal": 115,
    "protein": 5,
    "carbs": 20,
    "fat": 2,
    "fiber": 4,
    "weight": 200,
    "minutes": 4,
    "taste": "hartig",
    "tags": [
      "krokant",
      "fris"
    ],
    "ingredients": [
      {
        "product": "snackwortels",
        "amount": 150,
        "unit": "g",
        "group": "Groente & fruit"
      },
      {
        "product": "griekse yoghurt",
        "amount": 40,
        "unit": "g",
        "group": "Zuivel & eieren"
      },
      {
        "product": "mosterd",
        "amount": 1,
        "unit": "tl",
        "group": "Voorraadkast"
      },
      {
        "product": "honing",
        "amount": 1,
        "unit": "tl",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "melk",
      "mosterd"
    ],
    "steps": [
      "Meng yoghurt, mosterd en honing."
    ],
    "image": "./recipe-02.webp"
  },
  {
    "id": 2,
    "name": "Snackwortels met kruidenroomkaas",
    "kcal": 130,
    "protein": 5,
    "carbs": 15,
    "fat": 6,
    "fiber": 4,
    "weight": 190,
    "minutes": 4,
    "taste": "hartig",
    "tags": [
      "krokant",
      "romig"
    ],
    "ingredients": [
      {
        "product": "snackwortels",
        "amount": 150,
        "unit": "g",
        "group": "Groente & fruit"
      },
      {
        "product": "kruidenroomkaas light",
        "amount": 40,
        "unit": "g",
        "group": "Zuivel & eieren"
      }
    ],
    "allergens": [
      "melk"
    ],
    "steps": [
      "Gebruik de roomkaas als dip."
    ],
    "image": "./recipe-03.webp"
  },
  {
    "id": 3,
    "name": "Komkommer met kruidenroomkaas",
    "kcal": 90,
    "protein": 4,
    "carbs": 5,
    "fat": 6,
    "fiber": 1,
    "weight": 190,
    "minutes": 5,
    "taste": "hartig",
    "tags": [
      "krokant",
      "romig"
    ],
    "ingredients": [
      {
        "product": "komkommer",
        "amount": 0.5,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "kruidenroomkaas light",
        "amount": 40,
        "unit": "g",
        "group": "Zuivel & eieren"
      }
    ],
    "allergens": [
      "melk"
    ],
    "steps": [
      "Snijd plakjes en besmeer."
    ],
    "image": "./recipe-04.webp"
  },
  {
    "id": 4,
    "name": "Komkommer met kipfilet",
    "kcal": 105,
    "protein": 12,
    "carbs": 5,
    "fat": 4,
    "fiber": 1,
    "weight": 225,
    "minutes": 6,
    "taste": "hartig",
    "tags": [
      "krokant",
      "romig"
    ],
    "ingredients": [
      {
        "product": "komkommer",
        "amount": 0.5,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "kipfiletbeleg",
        "amount": 50,
        "unit": "g",
        "group": "Vlees & beleg"
      },
      {
        "product": "kruidenroomkaas light",
        "amount": 25,
        "unit": "g",
        "group": "Zuivel & eieren"
      }
    ],
    "allergens": [
      "melk"
    ],
    "steps": [
      "Besmeer plakjes en beleg met kip."
    ],
    "image": "./recipe-05.webp"
  },
  {
    "id": 5,
    "name": "Banaan met kaneel en honing",
    "kcal": 130,
    "protein": 1,
    "carbs": 32,
    "fat": 0.5,
    "fiber": 3,
    "weight": 125,
    "minutes": 3,
    "taste": "zoet",
    "tags": [
      "fris"
    ],
    "ingredients": [
      {
        "product": "banaan",
        "amount": 1,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "honing",
        "amount": 1,
        "unit": "tl",
        "group": "Voorraadkast"
      },
      {
        "product": "kaneel",
        "amount": 0.5,
        "unit": "tl",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [],
    "steps": [
      "Snijd de banaan in plakjes.",
      "Verdeel de honing en kaneel over de plakjes."
    ],
    "image": "./recipe-06.webp"
  },
  {
    "id": 6,
    "name": "Mango-vanillekwark",
    "kcal": 270,
    "protein": 32,
    "carbs": 32,
    "fat": 1,
    "fiber": 3,
    "weight": 365,
    "minutes": 5,
    "taste": "zoet",
    "tags": [
      "romig",
      "fris"
    ],
    "ingredients": [
      {
        "product": "mango",
        "amount": 150,
        "unit": "g",
        "group": "Groente & fruit"
      },
      {
        "product": "magere kwark",
        "amount": 200,
        "unit": "g",
        "group": "Zuivel & eieren"
      },
      {
        "product": "vanille-whey",
        "amount": 15,
        "unit": "g",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "melk"
    ],
    "steps": [
      "Meng kwark en whey, voeg mango toe."
    ],
    "image": "./recipe-07.webp"
  },
  {
    "id": 7,
    "name": "Aardbeien met chocolade-eiwitdip",
    "kcal": 170,
    "protein": 23,
    "carbs": 17,
    "fat": 2,
    "fiber": 3,
    "weight": 265,
    "minutes": 5,
    "taste": "zoet",
    "tags": [
      "romig",
      "fris"
    ],
    "ingredients": [
      {
        "product": "aardbeien",
        "amount": 150,
        "unit": "g",
        "group": "Groente & fruit"
      },
      {
        "product": "magere kwark",
        "amount": 100,
        "unit": "g",
        "group": "Zuivel & eieren"
      },
      {
        "product": "chocolade-whey",
        "amount": 15,
        "unit": "g",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "melk"
    ],
    "steps": [
      "Meng kwark en whey als dip."
    ],
    "image": "./recipe-08.webp"
  },
  {
    "id": 8,
    "name": "Banaan-chocolade-eiwitshake",
    "kcal": 340,
    "protein": 34,
    "carbs": 43,
    "fat": 6,
    "fiber": 3,
    "weight": 400,
    "minutes": 4,
    "taste": "zoet",
    "tags": [
      "drinkbaar"
    ],
    "ingredients": [
      {
        "product": "banaan",
        "amount": 1,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "halfvolle melk",
        "amount": 250,
        "unit": "ml",
        "group": "Zuivel & eieren"
      },
      {
        "product": "chocolade-whey",
        "amount": 30,
        "unit": "g",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "melk"
    ],
    "steps": [
      "Blend alles."
    ],
    "image": "./recipe-09.webp"
  },
  {
    "id": 9,
    "name": "Kipfilet-groentewrap",
    "kcal": 290,
    "protein": 23,
    "carbs": 30,
    "fat": 8,
    "fiber": 5,
    "weight": 230,
    "minutes": 6,
    "taste": "hartig",
    "tags": [
      "fris"
    ],
    "ingredients": [
      {
        "product": "volkoren wrap",
        "amount": 1,
        "unit": "stuk",
        "group": "Brood & wraps"
      },
      {
        "product": "kipfiletbeleg",
        "amount": 75,
        "unit": "g",
        "group": "Vlees & beleg"
      },
      {
        "product": "komkommer",
        "amount": 0.25,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "sla",
        "amount": 25,
        "unit": "g",
        "group": "Groente & fruit"
      },
      {
        "product": "kruidenroomkaas light",
        "amount": 30,
        "unit": "g",
        "group": "Zuivel & eieren"
      }
    ],
    "allergens": [
      "melk",
      "tarwe (gluten)"
    ],
    "steps": [
      "Besmeer, beleg en rol op."
    ],
    "image": "./recipe-10.webp"
  },
  {
    "id": 10,
    "name": "Chocolade-bananenpudding",
    "kcal": 260,
    "protein": 28,
    "carbs": 33,
    "fat": 3,
    "fiber": 4,
    "weight": 285,
    "minutes": 6,
    "taste": "zoet",
    "tags": [
      "romig"
    ],
    "ingredients": [
      {
        "product": "banaan",
        "amount": 1,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "magere kwark",
        "amount": 150,
        "unit": "g",
        "group": "Zuivel & eieren"
      },
      {
        "product": "chocolade-whey",
        "amount": 15,
        "unit": "g",
        "group": "Voorraadkast"
      },
      {
        "product": "cacao",
        "amount": 1,
        "unit": "tl",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "melk"
    ],
    "steps": [
      "Blend en koel."
    ],
    "image": "./recipe-11.webp"
  },
  {
    "id": 11,
    "name": "Mango-vanille-eiwitshake",
    "kcal": 325,
    "protein": 33,
    "carbs": 40,
    "fat": 6,
    "fiber": 3,
    "weight": 430,
    "minutes": 4,
    "taste": "zoet",
    "tags": [
      "drinkbaar"
    ],
    "ingredients": [
      {
        "product": "mango",
        "amount": 150,
        "unit": "g",
        "group": "Groente & fruit"
      },
      {
        "product": "halfvolle melk",
        "amount": 250,
        "unit": "ml",
        "group": "Zuivel & eieren"
      },
      {
        "product": "vanille-whey",
        "amount": 30,
        "unit": "g",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "melk"
    ],
    "steps": [
      "Blend alles."
    ],
    "image": "./recipe-12.webp"
  },
  {
    "id": 12,
    "name": "Chocolade-bananenpannenkoekjes",
    "kcal": 330,
    "protein": 30,
    "carbs": 28,
    "fat": 11,
    "fiber": 3,
    "weight": 240,
    "minutes": 12,
    "taste": "zoet",
    "tags": [
      "warm"
    ],
    "ingredients": [
      {
        "product": "banaan",
        "amount": 1,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "eieren",
        "amount": 2,
        "unit": "stuk",
        "group": "Zuivel & eieren"
      },
      {
        "product": "chocolade-whey",
        "amount": 20,
        "unit": "g",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "ei",
      "melk"
    ],
    "steps": [
      "Prak banaan, meng met ei en whey, bak kleine pancakes."
    ],
    "image": "./recipe-13.webp"
  },
  {
    "id": 13,
    "name": "Chocolade-frambozenmousse",
    "kcal": 220,
    "protein": 30,
    "carbs": 20,
    "fat": 3,
    "fiber": 7,
    "weight": 270,
    "minutes": 6,
    "taste": "zoet",
    "tags": [
      "romig",
      "fris"
    ],
    "ingredients": [
      {
        "product": "magere kwark",
        "amount": 150,
        "unit": "g",
        "group": "Zuivel & eieren"
      },
      {
        "product": "frambozen",
        "amount": 100,
        "unit": "g",
        "group": "Groente & fruit"
      },
      {
        "product": "chocolade-whey",
        "amount": 20,
        "unit": "g",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "melk"
    ],
    "steps": [
      "Blend tot mousse."
    ],
    "image": "./recipe-14.webp"
  },
  {
    "id": 14,
    "name": "Appel met vanille-eiwitdip",
    "kcal": 200,
    "protein": 22,
    "carbs": 26,
    "fat": 1,
    "fiber": 4,
    "weight": 280,
    "minutes": 5,
    "taste": "zoet",
    "tags": [
      "krokant",
      "fris"
    ],
    "ingredients": [
      {
        "product": "appel",
        "amount": 1,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "magere kwark",
        "amount": 100,
        "unit": "g",
        "group": "Zuivel & eieren"
      },
      {
        "product": "vanille-whey",
        "amount": 15,
        "unit": "g",
        "group": "Voorraadkast"
      },
      {
        "product": "kaneel",
        "amount": 0.5,
        "unit": "tl",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "melk"
    ],
    "steps": [
      "Meng dip en serveer met appel."
    ],
    "image": "./recipe-15.webp"
  },
  {
    "id": 15,
    "name": "Honing-mosterdwrap",
    "kcal": 280,
    "protein": 23,
    "carbs": 32,
    "fat": 7,
    "fiber": 5,
    "weight": 240,
    "minutes": 7,
    "taste": "hartig",
    "tags": [
      "fris"
    ],
    "ingredients": [
      {
        "product": "volkoren wrap",
        "amount": 1,
        "unit": "stuk",
        "group": "Brood & wraps"
      },
      {
        "product": "kipfiletbeleg",
        "amount": 75,
        "unit": "g",
        "group": "Vlees & beleg"
      },
      {
        "product": "komkommer",
        "amount": 0.25,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "sla",
        "amount": 25,
        "unit": "g",
        "group": "Groente & fruit"
      },
      {
        "product": "yoghurt",
        "amount": 30,
        "unit": "g",
        "group": "Zuivel & eieren"
      },
      {
        "product": "mosterd",
        "amount": 1,
        "unit": "tl",
        "group": "Voorraadkast"
      },
      {
        "product": "honing",
        "amount": 0.5,
        "unit": "tl",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "melk",
      "mosterd",
      "tarwe (gluten)"
    ],
    "steps": [
      "Meng saus, beleg en rol op."
    ],
    "image": "./recipe-16.webp"
  },
  {
    "id": 16,
    "name": "Ei-avocadowrap",
    "kcal": 370,
    "protein": 19,
    "carbs": 30,
    "fat": 19,
    "fiber": 7,
    "weight": 250,
    "minutes": 13,
    "taste": "hartig",
    "tags": [
      "romig"
    ],
    "ingredients": [
      {
        "product": "volkoren wrap",
        "amount": 1,
        "unit": "stuk",
        "group": "Brood & wraps"
      },
      {
        "product": "eieren",
        "amount": 2,
        "unit": "stuk",
        "group": "Zuivel & eieren",
        "prep": "gekookt"
      },
      {
        "product": "avocado",
        "amount": 0.25,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "spinazie",
        "amount": 25,
        "unit": "g",
        "group": "Groente & fruit"
      },
      {
        "product": "peper",
        "amount": null,
        "unit": "",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "ei",
      "tarwe (gluten)"
    ],
    "steps": [
      "Prak avocado en beleg met ei en spinazie."
    ],
    "image": "./recipe-17.webp"
  },
  {
    "id": 17,
    "name": "Chocolade-bananenwrap",
    "kcal": 360,
    "protein": 23,
    "carbs": 56,
    "fat": 6,
    "fiber": 7,
    "weight": 240,
    "minutes": 7,
    "taste": "zoet",
    "tags": [
      "romig"
    ],
    "ingredients": [
      {
        "product": "volkoren wrap",
        "amount": 1,
        "unit": "stuk",
        "group": "Brood & wraps"
      },
      {
        "product": "banaan",
        "amount": 1,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "magere kwark",
        "amount": 50,
        "unit": "g",
        "group": "Zuivel & eieren"
      },
      {
        "product": "chocolade-whey",
        "amount": 15,
        "unit": "g",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "melk",
      "tarwe (gluten)"
    ],
    "steps": [
      "Meng kwark en whey, beleg en rol op."
    ],
    "image": "./recipe-18.webp"
  },
  {
    "id": 18,
    "name": "Aardbeien-cheesecakewrap",
    "kcal": 280,
    "protein": 15,
    "carbs": 36,
    "fat": 8,
    "fiber": 5,
    "weight": 210,
    "minutes": 7,
    "taste": "zoet",
    "tags": [
      "romig",
      "fris"
    ],
    "ingredients": [
      {
        "product": "volkoren wrap",
        "amount": 1,
        "unit": "stuk",
        "group": "Brood & wraps"
      },
      {
        "product": "aardbeien",
        "amount": 100,
        "unit": "g",
        "group": "Groente & fruit"
      },
      {
        "product": "naturel roomkaas light",
        "amount": 40,
        "unit": "g",
        "group": "Zuivel & eieren"
      },
      {
        "product": "vanille-whey",
        "amount": 10,
        "unit": "g",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "melk",
      "tarwe (gluten)"
    ],
    "steps": [
      "Meng roomkaas en whey, voeg aardbeien toe."
    ],
    "image": "./recipe-19.webp"
  },
  {
    "id": 19,
    "name": "Komkommer met eiersalade",
    "kcal": 200,
    "protein": 16,
    "carbs": 6,
    "fat": 12,
    "fiber": 1,
    "weight": 280,
    "minutes": 13,
    "taste": "hartig",
    "tags": [
      "krokant",
      "romig"
    ],
    "ingredients": [
      {
        "product": "komkommer",
        "amount": 0.5,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "eieren",
        "amount": 2,
        "unit": "stuk",
        "group": "Zuivel & eieren",
        "prep": "gekookt"
      },
      {
        "product": "griekse yoghurt 2%",
        "amount": 30,
        "unit": "g",
        "group": "Zuivel & eieren"
      },
      {
        "product": "mosterd",
        "amount": 0.5,
        "unit": "tl",
        "group": "Voorraadkast"
      },
      {
        "product": "peper",
        "amount": null,
        "unit": "",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "ei",
      "melk",
      "mosterd"
    ],
    "steps": [
      "Snijd de komkommer in dikke plakken.",
      "Prak de gekookte eieren en meng ze met de yoghurt, mosterd en eventueel peper.",
      "Verdeel de eiersalade over de plakken komkommer."
    ],
    "image": "./recipe-20.webp"
  },
  {
    "id": 20,
    "name": "Crispy honing-mosterd kipwrap",
    "kcal": 345,
    "protein": 29,
    "carbs": 34,
    "fat": 10,
    "fiber": 5,
    "weight": 280,
    "minutes": 10,
    "taste": "hartig",
    "tags": [
      "warm",
      "krokant"
    ],
    "ingredients": [
      {
        "product": "volkoren wrap",
        "amount": 1,
        "unit": "stuk",
        "group": "Brood & wraps"
      },
      {
        "product": "kipfilet",
        "amount": 100,
        "unit": "g",
        "group": "Vlees & beleg"
      },
      {
        "product": "griekse yoghurt 2%",
        "amount": 40,
        "unit": "g",
        "group": "Zuivel & eieren"
      },
      {
        "product": "mosterd",
        "amount": 1,
        "unit": "tl",
        "group": "Voorraadkast"
      },
      {
        "product": "honing",
        "amount": 0.5,
        "unit": "tl",
        "group": "Voorraadkast"
      },
      {
        "product": "komkommer",
        "amount": 0.25,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "ijsbergsla",
        "amount": 25,
        "unit": "g",
        "group": "Groente & fruit"
      }
    ],
    "allergens": [
      "melk",
      "mosterd",
      "tarwe (gluten)"
    ],
    "steps": [
      "Snijd de kipfilet in reepjes en bak de kip volledig gaar.",
      "Roer de yoghurt, mosterd en honing door elkaar. Snijd de komkommer en ijsbergsla.",
      "Beleg de wrap met kip, komkommer, sla en saus. Vouw dicht en rooster kort in een droge koekenpan."
    ],
    "image": "./recipe-21.webp"
  },
  {
    "id": 21,
    "name": "Krokante ei-avocado quesadilla",
    "kcal": 420,
    "protein": 25,
    "carbs": 31,
    "fat": 23,
    "fiber": 7,
    "weight": 270,
    "minutes": 12,
    "taste": "hartig",
    "tags": [
      "warm",
      "krokant"
    ],
    "ingredients": [
      {
        "product": "volkoren wrap",
        "amount": 1,
        "unit": "stuk",
        "group": "Brood & wraps"
      },
      {
        "product": "eieren",
        "amount": 2,
        "unit": "stuk",
        "group": "Zuivel & eieren"
      },
      {
        "product": "avocado",
        "amount": 0.25,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "geraspte 30+ kaas",
        "amount": 25,
        "unit": "g",
        "group": "Zuivel & eieren"
      },
      {
        "product": "spinazie",
        "amount": 25,
        "unit": "g",
        "group": "Groente & fruit"
      },
      {
        "product": "peper",
        "amount": null,
        "unit": "",
        "group": "Voorraadkast"
      }
    ],
    "allergens": [
      "ei",
      "melk",
      "tarwe (gluten)"
    ],
    "steps": [
      "Bak roerei. Prak de avocado en verdeel die met het roerei, de spinazie, kaas en peper over de wrap.",
      "Vouw de wrap dubbel en rooster beide kanten in een droge koekenpan tot de wrap krokant is."
    ],
    "image": "./recipe-22.webp"
  },
  {
    "id": 22,
    "name": "Chocolade-frambozen bananenpancakes",
    "kcal": 365,
    "protein": 30,
    "carbs": 34,
    "fat": 12,
    "fiber": 8,
    "weight": 345,
    "minutes": 14,
    "taste": "zoet",
    "tags": [
      "warm",
      "romig"
    ],
    "ingredients": [
      {
        "product": "banaan",
        "amount": 1,
        "unit": "stuk",
        "group": "Groente & fruit"
      },
      {
        "product": "eieren",
        "amount": 2,
        "unit": "stuk",
        "group": "Zuivel & eieren"
      },
      {
        "product": "chocolade-whey",
        "amount": 20,
        "unit": "g",
        "group": "Voorraadkast"
      },
      {
        "product": "frambozen",
        "amount": 75,
        "unit": "g",
        "group": "Groente & fruit"
      },
      {
        "product": "magere kwark",
        "amount": 30,
        "unit": "g",
        "group": "Zuivel & eieren"
      }
    ],
    "allergens": [
      "ei",
      "melk"
    ],
    "steps": [
      "Prak de banaan en meng met de eieren en chocolade-whey.",
      "Bak kleine pannenkoekjes en laat beide kanten gaar worden.",
      "Serveer met de kwark en frambozen."
    ],
    "image": "./recipe-23.webp"
  }
];

export const groceryGroups = [
  "Groente & fruit",
  "Zuivel & eieren",
  "Brood & wraps",
  "Vlees & beleg",
  "Voorraadkast",
  "Overig"
];
