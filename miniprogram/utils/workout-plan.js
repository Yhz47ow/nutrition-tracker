'use strict';

const dates=require('./date');

const DAY_TYPES=Object.freeze([
  {value:'training',label:'训练日'},
  {value:'rest',label:'休息日'},
]);

function normalizePlan(plan) {
  const source=plan&&typeof plan==='object'?plan:{};
  const date=/^\d{4}-\d{2}-\d{2}$/.test(String(source.date||''))?String(source.date):dates.dateKey(Date.now());
  return {
    id:String(source.id||`plan_${date}`),
    date,
    dayType:source.dayType==='rest'?'rest':'training',
    title:String(source.title||'').trim(),
    details:String(source.details||'').trim(),
    note:String(source.note||'').trim(),
    updatedAt:Number(source.updatedAt)||Date.now(),
  };
}

function normalizePlans(plans) {
  const byDate=new Map();
  (Array.isArray(plans)?plans:[]).map(normalizePlan).forEach(plan=>{
    const current=byDate.get(plan.date);
    if(!current||plan.updatedAt>=current.updatedAt)byDate.set(plan.date,plan);
  });
  return Array.from(byDate.values()).sort((a,b)=>a.date.localeCompare(b.date));
}

function findPlan(plans,date) {
  return normalizePlans(plans).find(item=>item.date===date)||null;
}

function savePlan(plans,input) {
  const plan=normalizePlan(input);const next=normalizePlans(plans).filter(item=>item.date!==plan.date);next.push(plan);
  return normalizePlans(next);
}

function deletePlan(plans,date) {
  return normalizePlans(plans).filter(item=>item.date!==date);
}

function emptyForm(date) {
  return {id:`plan_${date}`,date,dayType:'training',title:'',details:'',note:'',updatedAt:Date.now()};
}

function monthCalendar(month,selectedDate,plans,workouts) {
  const [year,monthNumber]=String(month).split('-').map(Number);
  const first=new Date(year,monthNumber-1,1).getDay();
  const count=new Date(year,monthNumber,0).getDate();
  const planMap=new Map(normalizePlans(plans).map(item=>[item.date,item]));
  const completed=new Set((workouts||[]).map(item=>item.date));
  const calendar=[];
  for(let index=0;index<first;index++)calendar.push({blank:true,key:`blank_${index}`});
  for(let day=1;day<=count;day++){
    const key=`${year}-${String(monthNumber).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const plan=planMap.get(key);
    calendar.push({key,day,active:key===selectedDate,dayType:plan?plan.dayType:'',planned:Boolean(plan),completed:completed.has(key)});
  }
  return calendar;
}

module.exports={DAY_TYPES,normalizePlan,normalizePlans,findPlan,savePlan,deletePlan,emptyForm,monthCalendar};
