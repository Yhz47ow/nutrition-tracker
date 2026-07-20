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
