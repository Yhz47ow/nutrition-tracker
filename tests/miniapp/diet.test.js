'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const diet = require('../../miniprogram/utils/diet');

test('mini program bundles the complete built-in food library', () => {
  assert.equal(diet.foods.length, 71);
  assert.ok(diet.foods.some(item => item.name === '鸡胸肉'));
  assert.ok(diet.foods.some(item => item.name === '乳清蛋白粉'));
});

test('diet summary preserves meal macros and remaining targets', () => {
  const food = diet.foods.find(item => item.name === '白米饭');
  const record = diet.createRecord(food, 150, 'lunch');
  const summary = diet.summarize({'2026-07-16': {breakfast:[],lunch:[record],dinner:[],snack:[]}}, '2026-07-16', {calories:1600,carbs:160,protein:120,fat:44});
  assert.equal(summary.totals.mealCount, 1);
  assert.equal(summary.totals.weight, 150);
  assert.equal(summary.remaining.calories, 1426);
  assert.equal(summary.meals[1].items[0].foodName, '白米饭');
});

test('OpenFoodFacts products normalize to the shared food model', () => {
  const food = diet.parseProduct({code:'123',product_name_zh:'测试牛奶',nutriments:{'energy-kcal_100g':45,proteins_100g:3.2,carbohydrates_100g:5,fat_100g:1.5}});
  assert.deepEqual(food, {id:'api-123',name:'测试牛奶',caloriesPer100g:45,proteinPer100g:3.2,carbsPer100g:5,fatPer100g:1.5,servingSize:100,source:'api'});
});

test('recommendations fit the remaining calorie budget', () => {
  const summary = diet.summarize({}, '2026-07-16', {calories:1600,carbs:160,protein:120,fat:44});
  const items = diet.recommendations(summary, []);
  assert.ok(items.length > 0);
  assert.ok(items.every(item => item.grams >= 10 && item.macros.calories <= 1600));
});
