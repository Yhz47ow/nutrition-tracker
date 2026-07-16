'use strict';

const diet = require('./diet');
const foodLibrary = require('./food-library');

function snapshot(food, grams) {
  const normalized = foodLibrary.normalizeFood(food);
  return {
    foodId:normalized.id, foodName:normalized.name, grams:Math.max(1, Number(grams) || normalized.servingSize),
    category:normalized.category, caloriesPer100g:normalized.caloriesPer100g,
    proteinPer100g:normalized.proteinPer100g, fatPer100g:normalized.fatPer100g,
    carbsPer100g:normalized.carbsPer100g, fiberPer100g:normalized.fiberPer100g,
    sodiumPer100g:normalized.sodiumPer100g, servingSize:normalized.servingSize,
  };
}

function componentFood(component) {
  return foodLibrary.normalizeFood({
    id:component.foodId, name:component.foodName, category:component.category,
    caloriesPer100g:component.caloriesPer100g, proteinPer100g:component.proteinPer100g,
    fatPer100g:component.fatPer100g, carbsPer100g:component.carbsPer100g,
    fiberPer100g:component.fiberPer100g, sodiumPer100g:component.sodiumPer100g,
    servingSize:component.servingSize || component.grams, source:'template',
  });
}

function totals(components) {
  const result = (components || []).reduce((sum, component) => {
    const macros = diet.calcMacros(componentFood(component), component.grams);
    Object.keys(sum).forEach(key => { sum[key] += Number(macros[key]) || 0; });
    return sum;
  }, { grams:0, calories:0, protein:0, fat:0, carbs:0, fiber:0, sodium:0 });
  Object.keys(result).forEach(key => { result[key] = diet.round(result[key]); });
  return result;
}

function createTemplate(name, components, id) {
  const now = new Date().toISOString();
  const list = (components || []).map(item => snapshot(item.food || componentFood(item), item.grams));
  return { id:id || `meal_${Date.now()}`, name:String(name || '').trim(), components:list, totals:totals(list), createdAt:now, updatedAt:now };
}

function createRecords(template, mealType) {
  return (template.components || []).map(component => diet.createRecord(componentFood(component), component.grams, mealType));
}

module.exports = { snapshot, componentFood, totals, createTemplate, createRecords };
