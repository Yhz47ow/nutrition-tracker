'use strict';

const workoutPlan=require('./workout-plan');
const nutritionCycle=require('./nutrition-cycle');

const BASE_TARGETS=Object.freeze({calories:1600,carbs:160,protein:120,fat:44});
const DEFAULT_NUTRITION_PLAN=Object.freeze({
  strategy:'training-rest',
  training:Object.freeze(Object.assign({},BASE_TARGETS)),
  rest:Object.freeze(Object.assign({},BASE_TARGETS)),
});

function normalizeTargets(targets,fallback=BASE_TARGETS) {
  const source=Object.assign({},fallback,targets||{});
  return {
    calories:Math.max(1,Number(source.calories)||fallback.calories),
    carbs:Math.max(0,Number(source.carbs)||0),
    protein:Math.max(0,Number(source.protein)||0),
    fat:Math.max(0,Number(source.fat)||0),
  };
}

function normalizeNutritionPlan(plan,fallback=BASE_TARGETS) {
  const source=plan&&typeof plan==='object'?plan:{};
  const base=normalizeTargets(fallback,BASE_TARGETS);
  return {
    strategy:'training-rest',
    training:normalizeTargets(source.training,base),
    rest:normalizeTargets(source.rest,base),
  };
}

function resolveTargets(settings,plans,date) {
  const safeSettings=settings||{};
  const fallback=normalizeTargets(safeSettings.targets,BASE_TARGETS);
  const plan=workoutPlan.findPlan(plans,date);
  const nutrition=normalizeNutritionPlan(safeSettings.nutritionPlan,fallback);
  const cycleResult=nutritionCycle.resolve(safeSettings.nutritionCycle,date);
  if(cycleResult)return {targets:cycleResult.targets,dayType:'cycle',label:cycleResult.source==='override'?'今日自定义目标':`周期第${cycleResult.cycleDay.index}天`,plan:null,source:cycleResult.source};
  if(plan&&plan.dayType==='training')return {targets:nutrition.training,dayType:'training',label:'训练日目标',plan};
  if(plan&&plan.dayType==='rest')return {targets:nutrition.rest,dayType:'rest',label:'休息日目标',plan};
  return {targets:fallback,dayType:'default',label:'默认目标',plan:null};
}

module.exports={BASE_TARGETS,DEFAULT_NUTRITION_PLAN,normalizeTargets,normalizeNutritionPlan,resolveTargets};
