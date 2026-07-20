'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const dietPlan=require('../../miniprogram/utils/diet-plan');

const settings={
  targets:{calories:1800,carbs:200,protein:120,fat:58},
  nutritionPlan:{
    strategy:'training-rest',
    training:{calories:2200,carbs:280,protein:150,fat:53},
    rest:{calories:1800,carbs:160,protein:150,fat:62},
  },
};

test('nutrition plan resolves training, rest and unplanned day targets',()=>{
  const plans=[
    {id:'plan_training',date:'2026-07-20',dayType:'training',updatedAt:1},
    {id:'plan_rest',date:'2026-07-21',dayType:'rest',updatedAt:1},
  ];
  assert.equal(dietPlan.resolveTargets(settings,plans,'2026-07-20').targets.calories,2200);
  assert.equal(dietPlan.resolveTargets(settings,plans,'2026-07-21').targets.carbs,160);
  const fallback=dietPlan.resolveTargets(settings,plans,'2026-07-22');
  assert.equal(fallback.dayType,'default');
  assert.equal(fallback.targets.calories,1800);
});

test('legacy settings initialize both day profiles from the default target',()=>{
  const normalized=dietPlan.normalizeNutritionPlan(null,{calories:1900,carbs:210,protein:130,fat:60});
  assert.deepEqual(normalized.training,{calories:1900,carbs:210,protein:130,fat:60});
  assert.deepEqual(normalized.rest,{calories:1900,carbs:210,protein:130,fat:60});
});

test('cycle and today override take priority over workout day targets',()=>{
  const withCycle=Object.assign({},settings,{nutritionCycle:{enabled:true,cycle:{startDate:'2026-07-20',cycleLength:1,repeat:true,days:[{calories:2100,carbs:50,protein:25,fat:25}]},overrides:{}}});
  assert.equal(dietPlan.resolveTargets(withCycle,[{date:'2026-07-20',dayType:'rest'}],'2026-07-20').targets.calories,2100);
  withCycle.nutritionCycle.overrides['2026-07-20']={calories:1950,carbs:40,protein:35,fat:25};
  assert.equal(dietPlan.resolveTargets(withCycle,[],'2026-07-20').label,'今日自定义目标');
});
