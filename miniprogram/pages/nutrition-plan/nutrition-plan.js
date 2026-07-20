const storage=require('../../utils/storage');
const cycleUtils=require('../../utils/nutrition-cycle');
const dates=require('../../utils/date');
const theme=require('../../utils/theme');

Page({
  data:{themeClass:'',enabled:false,cycle:null,dayRows:[],today:dates.dateKey(Date.now()),todayForm:{calories:1600,carbs:40,protein:35,fat:25},todayTotal:100,todayTargets:null,hasTodayOverride:false},
  onLoad(){this.load();},
  onShow(){this.setData({themeClass:theme.apply()});},
  load(){const state=storage.getDietState();const cycleState=cycleUtils.normalizeCycleState(state.settings.nutritionCycle,state.settings.targets);const cycle=cycleState.cycle||cycleUtils.createDefaultCycle(state.settings.targets);const currentDay=cycleUtils.cycleDay(cycle,this.data.today);const override=cycleState.overrides[this.data.today];const todayForm=override||currentDay||{calories:state.settings.targets.calories,carbs:40,protein:35,fat:25};this.setData({themeClass:theme.apply(),enabled:cycleState.enabled,cycle,todayForm:{calories:todayForm.calories,carbs:todayForm.carbs,protein:todayForm.protein,fat:todayForm.fat},hasTodayOverride:Boolean(override)},()=>{this.refreshDays();this.refreshToday();});},
  setEnabled(event){this.setData({enabled:event.currentTarget.dataset.value==='true'});},
  inputMeta(event){this.setData({[`cycle.${event.currentTarget.dataset.field}`]:event.detail.value});},
  changeStartDate(event){this.setData({'cycle.startDate':event.detail.value});},
  setRepeat(event){this.setData({'cycle.repeat':event.currentTarget.dataset.value==='true'});},
  changeLength(event){const length=Math.max(1,Math.min(31,Math.round(Number(event.detail.value)||1)));const days=this.data.cycle.days.slice();while(days.length<length){const previous=days[days.length-1]||{calories:1600,carbs:40,protein:35,fat:25};days.push(cycleUtils.normalizeDay(Object.assign({},previous,{name:`第${days.length+1}天`}),days.length));}this.setData({'cycle.cycleLength':length,'cycle.days':days.slice(0,length)},()=>this.refreshDays());},
  inputDay(event){const index=Number(event.currentTarget.dataset.index);const field=event.currentTarget.dataset.field;this.setData({[`cycle.days[${index}].${field}`]:event.detail.value},()=>this.refreshDays());},
  refreshDays(){const dayRows=(this.data.cycle&&this.data.cycle.days||[]).map((day,index)=>Object.assign({},day,{arrayIndex:index,total:cycleUtils.ratioTotal(day),targets:cycleUtils.macroTargets(day.calories,day)}));this.setData({dayRows});},
  applyFirstToAll(){const first=this.data.cycle.days[0];if(!first)return;const days=this.data.cycle.days.map((day,index)=>cycleUtils.normalizeDay(Object.assign({},first,{name:day.name||`第${index+1}天`}),index));this.setData({'cycle.days':days},()=>this.refreshDays());wx.showToast({title:'已应用到全部日期',icon:'success'});},
  inputToday(event){this.setData({[`todayForm.${event.currentTarget.dataset.field}`]:event.detail.value},()=>this.refreshToday());},
  refreshToday(){this.setData({todayTotal:cycleUtils.ratioTotal(this.data.todayForm),todayTargets:cycleUtils.macroTargets(this.data.todayForm.calories,this.data.todayForm)});},
  saveToday(){if(this.data.todayTotal!==100)return wx.showToast({title:'今日比例合计需为100%',icon:'none'});const state=storage.getDietState();const cycleState=cycleUtils.normalizeCycleState(state.settings.nutritionCycle,state.settings.targets);cycleState.overrides[this.data.today]={calories:Number(this.data.todayForm.calories),carbs:Number(this.data.todayForm.carbs),protein:Number(this.data.todayForm.protein),fat:Number(this.data.todayForm.fat)};state.settings.nutritionCycle=cycleState;storage.saveDietState(state);this.setData({hasTodayOverride:true});wx.showToast({title:'今日目标已保存',icon:'success'});},
  clearToday(){const state=storage.getDietState();const cycleState=cycleUtils.normalizeCycleState(state.settings.nutritionCycle,state.settings.targets);delete cycleState.overrides[this.data.today];state.settings.nutritionCycle=cycleState;storage.saveDietState(state);this.setData({hasTodayOverride:false});wx.showToast({title:'已恢复计划目标',icon:'success'});this.load();},
  save(){const invalid=this.data.cycle.days.find(day=>cycleUtils.ratioTotal(day)!==100);if(invalid)return wx.showToast({title:`第${invalid.index}天比例不是100%`,icon:'none'});const state=storage.getDietState();const previous=cycleUtils.normalizeCycleState(state.settings.nutritionCycle,state.settings.targets);state.settings.nutritionCycle={enabled:this.data.enabled,cycle:cycleUtils.normalizeCycle(Object.assign({},this.data.cycle,{updatedAt:Date.now()}),state.settings.targets),overrides:previous.overrides};storage.saveDietState(state);wx.showToast({title:this.data.enabled?'周期计划已启用':'周期计划已保存',icon:'success'});},
});
