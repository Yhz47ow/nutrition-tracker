'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const foods=require('../../miniprogram/data/foodDatabase');
const guideline=require('../../miniprogram/data/guideline');
const library=require('../../miniprogram/utils/food-library');
const templates=require('../../miniprogram/utils/meal-templates');
const dishLibrary=require('../../miniprogram/utils/dish-library');

test('Chinese food database has complete guideline-compatible fields and stable ids',()=>{
  const categoryKeys=new Set(guideline.FOOD_CATEGORIES.map(item=>item.key));
  const foundationKeys=new Set(['grain','vegetable','fruit','livestock','aquatic','egg','dairy','soyNuts','oil']);
  const ids=new Set(foods.map(item=>item.id));
  assert.ok(foods.length>=200);
  assert.equal(ids.size,foods.length);
  for(const id of ['b-rice','b-egg','b-fish','b-tofu','b-milk'])assert.ok(ids.has(id));
  foods.forEach(food=>{
    assert.ok(categoryKeys.has(food.category),`${food.name} category`);
    for(const field of ['servingSize','ediblePortion','fiberPer100g','sodiumPer100g'])assert.equal(typeof food[field],'number',`${food.name} ${field}`);
    assert.ok(food.pinyinInitials,`${food.name} pinyin initials`);
    assert.ok(food.reference,`${food.name} reference`);
    if(food.dataLayer==='foundation')assert.ok(foundationKeys.has(food.category),`${food.name} strict foundation category`);
  });
});

test('food search supports Chinese, initials and category filtering',()=>{
  assert.ok(library.filterFoods(foods,'米饭','all').some(item=>item.id==='b-rice'));
  assert.ok(library.filterFoods(foods,'西红柿','vegetable').some(item=>item.id==='v-tomato'));
  assert.ok(library.filterFoods(foods,'bf','all').some(item=>item.id==='b-rice'));
  assert.ok(library.filterFoods(foods,'jxr','livestock').some(item=>item.id==='b-chickenbr'));
  assert.equal(library.filterFoods(foods,'jxr','fruit').length,0);
});

test('custom per-serving nutrition derives shared per-100g values',()=>{
  const food=library.perServingToFood({name:'自制饭团',category:'grain',servingSize:50,caloriesPerServing:100,proteinPerServing:5,fatPerServing:2,carbsPerServing:20,fiberPerServing:1,sodiumPerServing:10,pinyinInitials:'zzft'},'custom-1');
  assert.equal(food.caloriesPer100g,200);
  assert.equal(food.proteinPer100g,10);
  assert.equal(food.fiberPer100g,2);
  assert.equal(food.sodiumPer100g,20);
  assert.equal(library.foodToServingForm(food).caloriesPerServing,100);
});

test('kJ and kcal conversion is understandable and lossless enough for labels',()=>{
  assert.equal(library.energyToKcal(418.4,'kj'),100);
  assert.equal(library.kcalToKj(100),418.4);
  const food=library.perServingToFood({name:'能量棒',category:'other',servingSize:50,energyPerServing:418.4,energyUnit:'kj'},'custom-kj');
  assert.equal(food.caloriesPer100g,200);
});

test('favorites toggle and meal templates retain component snapshots',()=>{
  assert.deepEqual(library.toggleFavorite([], 'b-rice'),['b-rice']);
  assert.deepEqual(library.toggleFavorite(['b-rice'], 'b-rice'),[]);
  const rice=foods.find(item=>item.id==='b-rice');const egg=foods.find(item=>item.id==='b-egg');
  const template=templates.createTemplate('早餐',[{food:rice,grams:150},{food:egg,grams:60}],'meal-1');
  assert.equal(template.components.length,2);
  assert.equal(template.components[0].foodName,'白米饭');
  assert.equal(template.totals.grams,210);
  assert.equal(templates.createRecords(template,'breakfast').length,2);
});

test('home-style dishes resolve ingredients and recalculate nutrition locally',()=>{
  assert.ok(dishLibrary.dishes.length>=20);
  dishLibrary.dishes.forEach(dish=>assert.doesNotThrow(()=>dishLibrary.resolveIngredients(dish)));
  const dish=dishLibrary.dishes.find(item=>item.id==='dish-tomato-egg');
  const ingredients=dishLibrary.resolveIngredients(dish);
  const original=dishLibrary.calculate(ingredients);
  const adjusted=ingredients.map(item=>({food:item.food,grams:item.food.id==='cn-rapeseed-oil'?0:item.grams}));
  assert.ok(dishLibrary.calculate(adjusted).calories<original.calories);
  const records=dishLibrary.createRecords(dish,ingredients,'lunch');
  assert.equal(records.length,ingredients.length);
  assert.ok(records.every(item=>item.dishId===dish.id&&item.category));
  assert.ok(records[0].foodName.startsWith('番茄炒蛋 · '));
});
