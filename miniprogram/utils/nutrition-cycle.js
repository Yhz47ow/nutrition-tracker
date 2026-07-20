'use strict';

const dates=require('./date');

const DEFAULT_RATIO=Object.freeze({carbs:40,protein:35,fat:25});

function number(value,fallback=0){return Number.isFinite(Number(value))?Number(value):fallback;}

function macroTargets(calories,ratios){
  const kcal=Math.max(1,number(calories,1600));const source=ratios||DEFAULT_RATIO;
  return {calories:Math.round(kcal),carbs:Math.round(kcal*number(source.carbs)/100/4),protein:Math.round(kcal*number(source.protein)/100/4),fat:Math.round(kcal*number(source.fat)/100/9)};
}

function normalizeDay(day,index,fallback){
  const source=Object.assign({},fallback||{},day||{});
  return {index:index+1,name:String(source.name||`第${index+1}天`),calories:Math.max(1,number(source.calories,1600)),carbs:Math.max(0,number(source.carbs,DEFAULT_RATIO.carbs)),protein:Math.max(0,number(source.protein,DEFAULT_RATIO.protein)),fat:Math.max(0,number(source.fat,DEFAULT_RATIO.fat))};
}

function createDefaultCycle(targets){
  const ratios=targets&&targets.calories?{carbs:40,protein:35,fat:25}:DEFAULT_RATIO;const base=macroTargets(targets&&targets.calories||1600,ratios);
  return {id:`cycle_${Date.now()}`,name:'我的周期饮食',startDate:dates.dateKey(Date.now()),cycleLength:7,repeat:true,days:Array.from({length:7},(_,index)=>normalizeDay({name:`第${index+1}天`,calories:base.calories,carbs:ratios.carbs,protein:ratios.protein,fat:ratios.fat},index)),updatedAt:Date.now()};
}

function normalizeCycle(cycle,fallbackTargets){
  if(!cycle||typeof cycle!=='object')return null;
  const length=Math.max(1,Math.min(31,Math.round(number(cycle.cycleLength,7))));const days=Array.isArray(cycle.days)?cycle.days:[];const fallback={calories:fallbackTargets&&fallbackTargets.calories||1600,carbs:DEFAULT_RATIO.carbs,protein:DEFAULT_RATIO.protein,fat:DEFAULT_RATIO.fat};
  return {id:String(cycle.id||`cycle_${Date.now()}`),name:String(cycle.name||'我的周期饮食').trim()||'我的周期饮食',startDate:/^\d{4}-\d{2}-\d{2}$/.test(String(cycle.startDate||''))?String(cycle.startDate):dates.dateKey(Date.now()),cycleLength:length,repeat:cycle.repeat!==false,days:Array.from({length},(_,index)=>normalizeDay(days[index],index,fallback)),updatedAt:number(cycle.updatedAt,Date.now())};
}

function ratioTotal(day){return Math.round((number(day.carbs)+number(day.protein)+number(day.fat))*10)/10;}

function cycleDay(cycle,date){
  if(!cycle||!cycle.days.length)return null;const start=new Date(`${cycle.startDate}T12:00:00`);const current=new Date(`${date}T12:00:00`);const offset=Math.floor((current-start)/86400000);if(offset<0||(!cycle.repeat&&offset>=cycle.cycleLength))return null;const index=offset%cycle.cycleLength;return cycle.days[index];
}

function normalizeCycleState(state,fallbackTargets){
  const source=state&&typeof state==='object'?state:{};return {enabled:Boolean(source.enabled),cycle:normalizeCycle(source.cycle,fallbackTargets),overrides:source.overrides&&typeof source.overrides==='object'?source.overrides:{}};
}

function resolve(cycleState,date){
  const state=cycleState;if(!state)return null;const override=state.overrides&&state.overrides[date];if(override)return {targets:macroTargets(override.calories,override),source:'override',cycleDay:null};if(!state.enabled)return null;const day=cycleDay(state.cycle,date);if(!day)return null;return {targets:macroTargets(day.calories,day),source:'cycle',cycleDay:day};
}

module.exports={DEFAULT_RATIO,macroTargets,normalizeDay,createDefaultCycle,normalizeCycle,ratioTotal,cycleDay,normalizeCycleState,resolve};
