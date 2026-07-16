'use strict';

const builtins = require('../data/foodDatabase');
const guideline = require('../data/guideline');

const CATEGORY_LABELS = Object.freeze(guideline.FOOD_CATEGORIES.reduce((map, item) => {
  map[item.key] = item.label;
  return map;
}, {}));

function number(value) {
  return Math.max(0, Number(value) || 0);
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(number(value) * factor) / factor;
}

function normalizeFood(food) {
  const servingSize = Math.max(1, number(food && food.servingSize) || 100);
  return Object.assign({}, food, {
    category: CATEGORY_LABELS[food && food.category] ? food.category : 'other',
    categoryLabel: CATEGORY_LABELS[food && food.category] || CATEGORY_LABELS.other,
    servingSize,
    ediblePortion: number(food && food.ediblePortion) || 100,
    caloriesPer100g: number(food && food.caloriesPer100g),
    proteinPer100g: number(food && food.proteinPer100g),
    fatPer100g: number(food && food.fatPer100g),
    carbsPer100g: number(food && food.carbsPer100g),
    fiberPer100g: number(food && food.fiberPer100g),
    sodiumPer100g: number(food && food.sodiumPer100g),
    pinyinInitials: String(food && food.pinyinInitials || '').toLowerCase().replace(/\s/g, ''),
    aliases: Array.isArray(food && food.aliases) ? food.aliases : [],
  });
}

function allFoods(customFoods) {
  return builtins.concat(Array.isArray(customFoods) ? customFoods.map(normalizeFood) : []).map(normalizeFood);
}

function matchesFood(food, query) {
  const value = String(query || '').trim().toLowerCase().replace(/\s/g, '');
  if (!value) return true;
  const fields = [food.name, food.pinyin, food.pinyinInitials].concat(food.aliases || []);
  return fields.some(field => String(field || '').toLowerCase().replace(/\s/g, '').includes(value));
}

function filterFoods(pool, query, category) {
  return (pool || []).map(normalizeFood).filter(food => {
    return (!category || category === 'all' || food.category === category) && matchesFood(food, query);
  });
}

function perServingToFood(form, id) {
  const servingSize = Math.max(1, number(form.servingSize) || 100);
  const factor = 100 / servingSize;
  return normalizeFood({
    id: id || `custom_${Date.now()}`,
    name: String(form.name || '').trim(),
    category: form.category || 'other',
    servingSize,
    ediblePortion: 100,
    caloriesPer100g: round(number(form.caloriesPerServing) * factor),
    proteinPer100g: round(number(form.proteinPerServing) * factor),
    fatPer100g: round(number(form.fatPerServing) * factor),
    carbsPer100g: round(number(form.carbsPerServing) * factor),
    fiberPer100g: round(number(form.fiberPerServing) * factor),
    sodiumPer100g: round(number(form.sodiumPerServing) * factor),
    pinyinInitials: String(form.pinyinInitials || '').trim().toLowerCase(),
    aliases: [],
    source: 'custom',
    createdAt: form.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function foodToServingForm(food) {
  const normalized = normalizeFood(food || {});
  const factor = normalized.servingSize / 100;
  return {
    name: normalized.name || '', category: normalized.category, servingSize: normalized.servingSize,
    caloriesPerServing: round(normalized.caloriesPer100g * factor),
    proteinPerServing: round(normalized.proteinPer100g * factor),
    fatPerServing: round(normalized.fatPer100g * factor),
    carbsPerServing: round(normalized.carbsPer100g * factor),
    fiberPerServing: round(normalized.fiberPer100g * factor),
    sodiumPerServing: round(normalized.sodiumPer100g * factor),
    pinyinInitials: normalized.pinyinInitials || '', createdAt: normalized.createdAt,
  };
}

function toggleFavorite(ids, foodId) {
  const next = new Set(Array.isArray(ids) ? ids.map(String) : []);
  const key = String(foodId);
  if (next.has(key)) next.delete(key); else next.add(key);
  return Array.from(next);
}

module.exports = {
  builtins, categories:guideline.FOOD_CATEGORIES, CATEGORY_LABELS, normalizeFood, allFoods,
  matchesFood, filterFoods, perServingToFood, foodToServingForm, toggleFavorite,
};
