'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const cycle=require('../../miniprogram/utils/nutrition-cycle');

test('custom nutrition cycle repeats from its start date',()=>{
  const plan=cycle.normalizeCycle({id:'c1',name:'7天',startDate:'2026-07-20',cycleLength:3,repeat:true,days:[{name:'高',calories:2200,carbs:50,protein:25,fat:25},{name:'中',calories:2000,carbs:40,protein:30,fat:30},{name:'低',calories:1800,carbs:25,protein:40,fat:35}]});
  assert.equal(cycle.cycleDay(plan,'2026-07-19'),null);
  assert.equal(cycle.cycleDay(plan,'2026-07-20').name,'高');
  assert.equal(cycle.cycleDay(plan,'2026-07-23').name,'高');
  assert.deepEqual(cycle.macroTargets(2000,{carbs:45,protein:30,fat:25}),{calories:2000,carbs:225,protein:150,fat:56});
});

test('today override has priority even when the cycle is disabled',()=>{
  const result=cycle.resolve({enabled:false,cycle:null,overrides:{'2026-07-20':{calories:1900,carbs:40,protein:35,fat:25}}},'2026-07-20');
  assert.equal(result.source,'override');
  assert.equal(result.targets.protein,166);
});

test('single-run cycle stops after its configured length',()=>{
  const plan=cycle.normalizeCycle({startDate:'2026-07-20',cycleLength:2,repeat:false,days:[{calories:1800,carbs:40,protein:35,fat:25},{calories:2000,carbs:40,protein:35,fat:25}]});
  assert.equal(cycle.cycleDay(plan,'2026-07-22'),null);
});

test('532 taper keeps protein and fat stable while reducing only carbs',()=>{
  const result=cycle.generate532Taper({startCalories:2000,stageDays:7,stageCount:4,carbDrop:20});
  assert.equal(result.error,undefined);
  assert.equal(result.cycleLength,28);
  assert.equal(result.days.length,28);
  assert.deepEqual(result.baseTargets,{carbs:250,protein:150,fat:44.4});
  assert.deepEqual(result.lastTargets,{carbs:190,protein:150,fat:44.4});
  const first=cycle.macroTargets(result.days[0].calories,result.days[0]);
  const last=cycle.macroTargets(result.days[27].calories,result.days[27]);
  assert.equal(first.protein,last.protein);
  assert.equal(first.fat,last.fat);
  assert.equal(first.carbs-last.carbs,60);
  assert.equal(result.days[0].name,'第1阶段 · 第1天');
  assert.equal(result.days[7].name,'第2阶段 · 第1天');
});

test('532 taper rejects plans beyond the local cycle limit',()=>{
  const result=cycle.generate532Taper({startCalories:1800,stageDays:15,stageCount:3,carbDrop:20});
  assert.equal(result.error,'计划总天数不能超过31天');
});
