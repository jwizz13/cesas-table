/**
 * data.js — Reference data, constants, and lookup tables for Cesa's Table
 *
 * No application logic here — just data.
 * Loaded via script tag; all exports are window-level constants.
 */

const CUISINES = [
  "American",
  "Chinese",
  "French",
  "Greek",
  "Indian",
  "Italian",
  "Japanese",
  "Korean",
  "Mediterranean",
  "Mexican",
  "Middle Eastern",
  "Thai",
  "Vietnamese",
  "Other",
];

const MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "appetizer",
  "side",
  "soup",
  "salad",
  "dessert",
];

const PROTEINS = [
  "chicken",
  "beef",
  "pork",
  "fish",
  "seafood",
  "turkey",
  "lamb",
  "vegetarian",
  "vegan",
];

const DEFAULT_TAGS = [
  "quick",
  "kid-friendly",
  "date-night",
  "camping",
  "fancy",
  "make-ahead",
  "one-pot",
  "grilling",
  "comfort-food",
  "healthy",
  "budget",
];

const HOLIDAYS = [
  "thanksgiving",
  "christmas",
  "easter",
  "4th-of-july",
  "halloween",
  "new-years",
  "valentines",
  "super-bowl",
  "memorial-day",
  "labor-day",
];

const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];

const COST_LEVELS = [
  { value: "$", label: "Budget" },
  { value: "$$", label: "Moderate" },
  { value: "$$$", label: "Expensive" },
];

const STORE_SECTIONS = [
  "produce",
  "dairy",
  "meat",
  "seafood",
  "bakery",
  "deli",
  "frozen",
  "pantry",
  "canned",
  "spices",
  "beverages",
  "snacks",
  "other",
];

const UNITS = [
  "whole",
  "cups",
  "tbsp",
  "tsp",
  "oz",
  "lbs",
  "grams",
  "kg",
  "ml",
  "liters",
  "cloves",
  "slices",
  "pieces",
  "bunch",
  "can",
  "package",
  "pinch",
  "dash",
  "to taste",
];

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private — only you" },
  { value: "shared", label: "Shared — friends you choose" },
  { value: "public", label: "Public — all users" },
];
