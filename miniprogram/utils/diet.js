'use strict';

const foods = require('./foods');
const foodLibrary = require('./food-library');
const dates = require('./date');

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_META = Object.freeze({
  breakfast: { name: '早餐', icon: '早' },
  lunch: { name: '午餐', icon: '午' },
  dinner: { name: '晚餐', icon: '晚' },
  snack: { name: '加餐', icon: '加' },
});

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function emptyMeals() {
  return { breakfast: [], lunch: [], dinner: [], snack: [] };
}

function normalizeRecords(records, date) {
  const source = records && records[date] ? records[date] : emptyMeals();
  const result = emptyMeals();
  MEAL_TYPES.forEach(type => { result[type] = Array.isArray(source[type]) ? source[type] : []; });
  return result;
}

function calcMacros(food, grams) {
  const amount = Math.max(1, Number(grams) || 100);
  const ratio = amount / 100;
  return {
    calories: round(food.caloriesPer100g * ratio),
    protein: round(food.proteinPer100g * ratio),
    carbs: round(food.carbsPer100g * ratio),
    fat: round(food.fatPer100g * ratio),
    fiber: round((food.fiberPer100g || 0) * ratio),
    sodium: round((food.sodiumPer100g || 0) * ratio),
    grams: amount,
  };
}

function allFoods(customFoods) {
  return foodLibrary.allFoods(customFoods);
}

function mealSummary(type, items) {
  const totals = items.reduce((sum, item) => {
    sum.calories += Number(item.calories) || 0;
    sum.protein += Number(item.protein) || 0;
    sum.carbs += Number(item.carbs) || 0;
    sum.fat += Number(item.fat) || 0;
    sum.fiber += Number(item.fiber) || 0;
    sum.sodium += Number(item.sodium) || 0;
    return sum;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 });
  const macroTotal = totals.protein + totals.carbs + totals.fat;
  return {
    type,
    name: MEAL_META[type].name,
    icon: MEAL_META[type].icon,
    items,
    calories: Math.round(totals.calories),
    protein: round(totals.protein),
    carbs: round(totals.carbs),
    fat: round(totals.fat),
    fiber: round(totals.fiber),
    sodium: round(totals.sodium),
    proteinPct: macroTotal ? Math.round(totals.protein / macroTotal * 100) : 0,
    carbsPct: macroTotal ? Math.round(totals.carbs / macroTotal * 100) : 0,
    fatPct: macroTotal ? Math.round(totals.fat / macroTotal * 100) : 0,
  };
}

function fastingInfo(meals) {
  let latest = '';
  MEAL_TYPES.forEach(type => meals[type].forEach(item => {
    if (item.time && (!latest || item.time > latest)) latest = item.time;
  }));
  if (!latest) return { value: '--', label: '暂无记录', level: 'normal' };
  const now = new Date();
  const parts = latest.split(':').map(Number);
  const last = new Date(now);
  last.setHours(parts[0], parts[1], 0, 0);
  if (last > now) last.setDate(last.getDate() - 1);
  const minutes = Math.max(0, Math.floor((now - last) / 60000));
  const hours = Math.floor(minutes / 60);
  return {
    value: `${hours}.${Math.floor((minutes % 60) / 6)}`,
    label: `上次 ${latest} · 已断食`,
    level: hours >= 16 ? 'great' : hours >= 12 ? 'good' : 'normal',
  };
}

function summarize(records, date, targets) {
  const meals = normalizeRecords(records, date);
  const mealList = MEAL_TYPES.map(type => mealSummary(type, meals[type]));
  const totals = mealList.reduce((sum, meal) => {
    sum.calories += meal.calories;
    sum.protein += meal.protein;
    sum.carbs += meal.carbs;
    sum.fat += meal.fat;
    sum.weight += meal.items.reduce((value, item) => value + (Number(item.grams) || 0), 0);
    if (meal.items.length) sum.mealCount += 1;
    return sum;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, weight: 0, mealCount: 0 });
  Object.keys(totals).forEach(key => { if (key !== 'mealCount') totals[key] = round(totals[key]); });
  const macroTotal = totals.protein + totals.carbs + totals.fat;
  const safeTargets = Object.assign({ calories: 1600, carbs: 160, protein: 120, fat: 44 }, targets || {});
  return {
    date,
    dateLabel: dates.formatDate(date),
    meals: mealList,
    totals,
    targets: safeTargets,
    remaining: {
      calories: round(safeTargets.calories - totals.calories),
      carbs: round(safeTargets.carbs - totals.carbs),
      protein: round(safeTargets.protein - totals.protein),
      fat: round(safeTargets.fat - totals.fat),
    },
    percentages: {
      calories: Math.min(100, Math.round(totals.calories / Math.max(1, safeTargets.calories) * 100)),
      carbs: macroTotal ? Math.round(totals.carbs / macroTotal * 100) : 0,
      protein: macroTotal ? Math.round(totals.protein / macroTotal * 100) : 0,
      fat: macroTotal ? Math.round(totals.fat / macroTotal * 100) : 0,
    },
    fasting: fastingInfo(meals),
  };
}

function recommendations(summary, customFoods, limit = 6) {
  const remaining = summary.remaining;
  const needs = [];
  if (remaining.carbs > 10) needs.push({ key: 'carbs', value: remaining.carbs });
  if (remaining.protein > 10) needs.push({ key: 'protein', value: remaining.protein });
  if (remaining.fat > 5) needs.push({ key: 'fat', value: remaining.fat });
  if (remaining.calories <= 0 || !needs.length) return [];
  return allFoods(customFoods).map(food => {
    let score = 0;
    if (needs.some(item => item.key === 'carbs')) score += food.carbsPer100g / Math.max(remaining.carbs, 1) * 3;
    if (needs.some(item => item.key === 'protein')) score += food.proteinPer100g / Math.max(remaining.protein, 1) * 3;
    if (needs.some(item => item.key === 'fat')) score += food.fatPer100g / Math.max(remaining.fat, 1) * 2;
    if (food.caloriesPer100g > remaining.calories * 0.5) score *= 0.5;
    score += (food.carbsPer100g + food.proteinPer100g + food.fatPer100g) / Math.max(food.caloriesPer100g, 1) * 0.5;
    const serving = Number(food.servingSize) || 100;
    const maxByCalories = Math.floor(remaining.calories / Math.max(1, food.caloriesPer100g) * 100);
    const grams = Math.max(10, Math.min(serving, maxByCalories, 300));
    return { id: food.id, food, score, grams, macros: calcMacros(food, grams) };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

function recommendedAmount(food, summary) {
  const remaining = summary.remaining;
  const limits = [
    food.caloriesPer100g > 0 ? Math.floor(remaining.calories / food.caloriesPer100g * 100) : 500,
    food.carbsPer100g > 0 && remaining.carbs > 0 ? Math.floor(remaining.carbs / food.carbsPer100g * 100) : 500,
    food.proteinPer100g > 0 && remaining.protein > 0 ? Math.floor(remaining.protein / food.proteinPer100g * 100) : 500,
    food.fatPer100g > 0 && remaining.fat > 0 ? Math.floor(remaining.fat / food.fatPer100g * 100) : 500,
  ];
  const max = Math.max(0, Math.min(...limits, 500));
  const deficits = [
    { label: '碳水', value: remaining.carbs, density: food.carbsPer100g },
    { label: '蛋白', value: remaining.protein, density: food.proteinPer100g },
    { label: '脂肪', value: remaining.fat, density: food.fatPer100g },
  ].filter(item => item.value > 0 && item.density > 0).sort((a, b) => b.value - a.value);
  if (!max) return { grams: 0, reason: '今日已达标' };
  const grams = deficits.length ? Math.max(10, Math.min(max, Math.ceil(deficits[0].value / deficits[0].density * 10) * 10)) : Math.min(100, max);
  return { grams, reason: deficits.length ? `补充${deficits[0].label}` : '建议份量' };
}

function createRecord(food, grams, mealType, photo) {
  const macros = calcMacros(food, grams);
  const now = new Date();
  return Object.assign({
    id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    foodId: food.id,
    foodName: food.name,
    mealType,
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    photo: photo || '',
    category: food.category || 'other',
    fiberPer100g: Number(food.fiberPer100g) || 0,
    sodiumPer100g: Number(food.sodiumPer100g) || 0,
  }, macros);
}

module.exports = {
  foods,
  MEAL_TYPES,
  MEAL_META,
  round,
  emptyMeals,
  normalizeRecords,
  calcMacros,
  allFoods,
  summarize,
  recommendations,
  recommendedAmount,
  createRecord,
};
