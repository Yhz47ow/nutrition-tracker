'use strict';

const dishes=require('../data/dishDatabase');
const diet=require('./diet');
const foodLibrary=require('./food-library');

function resolveIngredients(dish) {
  return (dish.ingredients||[]).map(component => {
    const food=foodLibrary.builtins.find(item=>item.id===component.foodId);
    if(!food)throw new Error(`菜肴 ${dish.name} 引用了不存在的食材 ${component.foodId}`);
    return {food:foodLibrary.normalizeFood(food),grams:Number(component.grams)||0};
  });
}

function calculate(ingredients) {
  const result=(ingredients||[]).reduce((sum,item)=>{
    if(!(Number(item.grams)>0))return sum;
    const macros=diet.calcMacros(item.food,item.grams);
    Object.keys(sum).forEach(key=>{sum[key]+=Number(macros[key])||0;});
    return sum;
  },{grams:0,calories:0,protein:0,fat:0,carbs:0,fiber:0,sodium:0});
  Object.keys(result).forEach(key=>{result[key]=diet.round(result[key]);});
  return result;
}

function matches(dish,query) {
  const value=String(query||'').trim().toLowerCase().replace(/\s/g,'');if(!value)return true;
  return [dish.name,dish.pinyinInitials].concat(dish.aliases||[]).some(field=>String(field||'').toLowerCase().replace(/\s/g,'').includes(value));
}

function list(query) {
  return dishes.filter(dish=>matches(dish,query)).map(dish=>{
    const ingredients=resolveIngredients(dish);
    return Object.assign({},dish,{ingredientCount:ingredients.length,totals:calculate(ingredients)});
  });
}

function createRecords(dish,ingredients,mealType) {
  const batchId=`dish_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  return (ingredients||[]).map(item=>{
    const record=diet.createRecord(item.food,item.grams,mealType);
    return Object.assign(record,{componentName:record.foodName,foodName:`${dish.name} · ${record.foodName}`,dishId:dish.id,dishName:dish.name,dishBatchId:batchId});
  });
}

module.exports={dishes,resolveIngredients,calculate,matches,list,createRecords};
