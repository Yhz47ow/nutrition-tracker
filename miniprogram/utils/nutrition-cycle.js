'use strict';

const dates=require('./date');

const DEFAULT_RATIO=Object.freeze({carbs:40,protein:35,fat:25});
const MAX_CYCLE_DAYS=180;
const DEFAULT_TAPER=Object.freeze({startCalories:2000,stageDays:7,stageCount:12,carbDrop:10});

function number(value,fallback=0){return Number.isFinite(Number(value))?Number(value):fallback;}

function macroTargets(calories,ratios){
  const kcal=Math.max(1,number(calories,1600));const source=ratios||DEFAULT_RATIO;
  return {calories:Math.round(kcal),carbs:Math.round(kcal*number(source.carbs)/100/4),protein:Math.round(kcal*number(source.protein)/100/4),fat:Math.round(kcal*number(source.fat)/100/9)};
}

function round1(value){return Math.round(number(value)*10)/10;}

function ratiosFromGrams(carbs,protein,fat){
  const energy=number(carbs)*4+number(protein)*4+number(fat)*9;
  if(energy<=0)return {carbs:0,protein:0,fat:0};
  const carbRatio=round1(number(carbs)*4/energy*100);
  const proteinRatio=round1(number(protein)*4/energy*100);
  return {carbs:carbRatio,protein:proteinRatio,fat:round1(100-carbRatio-proteinRatio)};
}

function normalizeTaperSettings(settings){
  const source=Object.assign({},DEFAULT_TAPER,settings||{});
  return {
    startCalories:Math.max(1,Math.round(number(source.startCalories,DEFAULT_TAPER.startCalories))),
    stageDays:7,
    stageCount:Math.max(12,Math.min(16,Math.round(number(source.stageCount,DEFAULT_TAPER.stageCount)))),
    carbDrop:Math.max(0,round1(source.carbDrop))
  };
}

function generate532Taper(settings){
  const config=normalizeTaperSettings(settings);
  const cycleLength=config.stageDays*config.stageCount;
  if(cycleLength>MAX_CYCLE_DAYS)return {error:`计划总天数不能超过${MAX_CYCLE_DAYS}天`,config,days:[]};
  const baseCarbs=round1(config.startCalories*0.5/4);
  const protein=round1(config.startCalories*0.3/4);
  const fat=round1(config.startCalories*0.2/9);
  const lastCarbs=round1(baseCarbs-(config.stageCount-1)*config.carbDrop);
  if(lastCarbs<=0)return {error:'降碳幅度过大，请减少计划周数或每周降幅',config,days:[]};
  const days=[];
  for(let stage=0;stage<config.stageCount;stage+=1){
    const carbs=round1(baseCarbs-stage*config.carbDrop);
    const calories=Math.round(carbs*4+protein*4+fat*9);
    const ratios=ratiosFromGrams(carbs,protein,fat);
    for(let day=0;day<config.stageDays;day+=1){
      days.push(normalizeDay({name:`第${stage+1}周 · 第${day+1}天`,calories,carbs:ratios.carbs,protein:ratios.protein,fat:ratios.fat},days.length));
    }
  }
  return {config,days,cycleLength,baseTargets:{carbs:baseCarbs,protein,fat},lastTargets:{carbs:lastCarbs,protein,fat}};
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
  const length=Math.max(1,Math.min(MAX_CYCLE_DAYS,Math.round(number(cycle.cycleLength,7))));const days=Array.isArray(cycle.days)?cycle.days:[];const fallback={calories:fallbackTargets&&fallbackTargets.calories||1600,carbs:DEFAULT_RATIO.carbs,protein:DEFAULT_RATIO.protein,fat:DEFAULT_RATIO.fat};
  const strategy=cycle.strategy&&cycle.strategy.type==='532-taper'?{type:'532-taper',settings:normalizeTaperSettings(cycle.strategy.settings)}:null;
  return {id:String(cycle.id||`cycle_${Date.now()}`),name:String(cycle.name||'我的周期饮食').trim()||'我的周期饮食',startDate:/^\d{4}-\d{2}-\d{2}$/.test(String(cycle.startDate||''))?String(cycle.startDate):dates.dateKey(Date.now()),cycleLength:length,repeat:cycle.repeat!==false,days:Array.from({length},(_,index)=>normalizeDay(days[index],index,fallback)),strategy,updatedAt:number(cycle.updatedAt,Date.now())};
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

module.exports={DEFAULT_RATIO,DEFAULT_TAPER,MAX_CYCLE_DAYS,macroTargets,ratiosFromGrams,normalizeTaperSettings,generate532Taper,normalizeDay,createDefaultCycle,normalizeCycle,ratioTotal,cycleDay,normalizeCycleState,resolve};
