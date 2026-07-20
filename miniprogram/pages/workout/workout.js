const workoutData=require('../../utils/workout-data');
const workoutPlan=require('../../utils/workout-plan');
const dates=require('../../utils/date');
const theme=require('../../utils/theme');

Page({
  data:{
    themeClass:'dark-theme',tab:'current',active:null,latest:null,
    filter:'全部',query:'',bodyParts:workoutData.BODY_PARTS,exercises:[],
    planMonth:dates.monthKey(Date.now()),planCalendar:[],planSelectedDate:dates.dateKey(Date.now()),planForm:workoutPlan.emptyForm(dates.dateKey(Date.now())),planExists:false,dayTypes:workoutPlan.DAY_TYPES,
    month:dates.monthKey(Date.now()),calendar:[],selectedDate:dates.dateKey(Date.now()),dayWorkouts:[],trend:null,
  },
  onShow(){this.setData({themeClass:theme.apply()});this.refresh();},
  refresh(){
    this._state=workoutData.load();
    const active=this._state.activeWorkout?{parts:workoutData.workoutParts(this._state.activeWorkout),sets:workoutData.completedSets(this._state.activeWorkout),duration:dates.formatDuration((Date.now()-this._state.activeWorkout.startedAt)/1000)}:null;
    const latest=[...this._state.workouts].sort((a,b)=>b.startedAt-a.startedAt)[0];
    this.setData({active,latest:latest?this.presentWorkout(latest):null});
    this.refreshExercises();this.refreshPlanCalendar();this.refreshCalendar();
  },
  presentWorkout(workout){return Object.assign({},workout,{parts:workoutData.workoutParts(workout),durationLabel:dates.formatDuration(workout.duration),exerciseRows:(workout.exercises||[]).map(exercise=>Object.assign({},exercise,{setsLabel:(exercise.sets||[]).filter(set=>set.completed).map(set=>`${set.setNumber}. ${set.weight}kg × ${set.reps}`).join(' · ')}))});},
  switchTab(event){const tab=event.currentTarget.dataset.tab;this.setData({tab},()=>{if(tab==='plan')this.refreshPlanCalendar();});},
  start(){wx.navigateTo({url:'/pages/training/training'});},

  changePlanMonth(event){
    const [year,month]=this.data.planMonth.split('-').map(Number);const date=new Date(year,month-1+Number(event.currentTarget.dataset.delta),1);
    this.setData({planMonth:dates.monthKey(date),planSelectedDate:dates.dateKey(date)},()=>this.refreshPlanCalendar());
  },
  refreshPlanCalendar(){
    if(!this._state)this._state=workoutData.load();
    const planCalendar=workoutPlan.monthCalendar(this.data.planMonth,this.data.planSelectedDate,this._state.plans,this._state.workouts);
    const existing=workoutPlan.findPlan(this._state.plans,this.data.planSelectedDate);
    this.setData({planCalendar,planForm:existing||workoutPlan.emptyForm(this.data.planSelectedDate),planExists:Boolean(existing)});
  },
  choosePlanDay(event){const date=event.currentTarget.dataset.date;if(!date)return;this.setData({planSelectedDate:date},()=>this.refreshPlanCalendar());},
  planToday(){const date=dates.dateKey(Date.now());this.setData({planMonth:dates.monthKey(Date.now()),planSelectedDate:date},()=>this.refreshPlanCalendar());},
  setPlanDayType(event){this.setData({'planForm.dayType':event.currentTarget.dataset.type});},
  inputPlanField(event){this.setData({[`planForm.${event.currentTarget.dataset.field}`]:event.detail.value});},
  savePlan(){
    if(!this._state)this._state=workoutData.load();
    const input=Object.assign({},this.data.planForm,{date:this.data.planSelectedDate,updatedAt:Date.now()});
    if(input.dayType==='rest'){input.title='';input.details='';}
    this._state.plans=workoutPlan.savePlan(this._state.plans,input);workoutData.save(this._state);
    this.refreshPlanCalendar();wx.showToast({title:input.dayType==='rest'?'休息日已保存':'训练计划已保存',icon:'success'});
  },
  deletePlan(){
    if(!this.data.planExists)return;
    wx.showModal({title:'删除当天计划',content:`删除 ${this.data.planSelectedDate} 的安排？`,success:result=>{if(!result.confirm)return;this._state.plans=workoutPlan.deletePlan(this._state.plans,this.data.planSelectedDate);workoutData.save(this._state);this.refreshPlanCalendar();wx.showToast({title:'计划已删除',icon:'success'});}});
  },

  inputQuery(event){this.setData({query:event.detail.value},()=>this.refreshExercises());},
  setFilter(event){this.setData({filter:event.currentTarget.dataset.part},()=>this.refreshExercises());},
  refreshExercises(){if(!this._state)this._state=workoutData.load();const q=this.data.query.trim().toLowerCase();const exercises=workoutData.allExercises(this._state).filter(item=>(this.data.filter==='全部'||item.bodyPart===this.data.filter)&&(!q||`${item.name} ${item.bodyPart} ${item.note||''}`.toLowerCase().includes(q))).map(item=>Object.assign({},item,{short:workoutData.BODY_PART_SHORT[item.bodyPart]||'其'}));this.setData({exercises});},
  newExercise(){getApp().globalData.editExerciseId='';wx.navigateTo({url:'/pages/exercise-form/exercise-form'});},
  editExercise(event){getApp().globalData.editExerciseId=event.currentTarget.dataset.id;wx.navigateTo({url:'/pages/exercise-form/exercise-form'});},
  deleteExercise(event){const id=event.currentTarget.dataset.id;wx.showModal({title:'删除自定义动作',content:'历史训练不会受影响。',success:r=>{if(!r.confirm)return;this._state.customExercises=this._state.customExercises.filter(item=>item.id!==id);workoutData.save(this._state);this.refresh();}});},
  addDirect(event){const exercise=workoutData.findExercise(this._state,event.currentTarget.dataset.id);if(!exercise)return;if(!this._state.activeWorkout)this._state.activeWorkout=workoutData.Core.createWorkout();this._state.activeWorkout.exercises.push(workoutData.Core.createWorkoutExercise(exercise,this._state.activeWorkout.exercises.length));this._state.activeWorkout.currentExerciseIndex=this._state.activeWorkout.exercises.length-1;workoutData.save(this._state);wx.navigateTo({url:'/pages/training/training'});},

  changeMonth(event){const [year,month]=this.data.month.split('-').map(Number);const date=new Date(year,month-1+Number(event.currentTarget.dataset.delta),1);this.setData({month:dates.monthKey(date),selectedDate:dates.dateKey(date)},()=>this.refreshCalendar());},
  refreshCalendar(){if(!this._state)this._state=workoutData.load();const [year,month]=this.data.month.split('-').map(Number);const first=new Date(year,month-1,1).getDay();const count=new Date(year,month,0).getDate();const workoutDates=new Set(this._state.workouts.map(item=>item.date));const calendar=[];for(let i=0;i<first;i++)calendar.push({blank:true,key:`b${i}`});for(let day=1;day<=count;day++){const key=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;calendar.push({key,day,has:workoutDates.has(key),active:key===this.data.selectedDate});}const dayWorkouts=this._state.workouts.filter(item=>item.date===this.data.selectedDate).map(item=>this.presentWorkout(item));this.setData({calendar,dayWorkouts});},
  chooseDay(event){const selectedDate=event.currentTarget.dataset.date;this.setData({selectedDate},()=>this.refreshCalendar());},
  showTrend(event){const items=workoutData.recentTrend(this._state.workouts,event.currentTarget.dataset.id,event.currentTarget.dataset.name);this.setData({trend:{name:event.currentTarget.dataset.name,items}},()=>{if(items.length)this.drawTrend(items);});},
  drawTrend(items){if(!wx.createSelectorQuery)return;wx.createSelectorQuery().in(this).select('#trendCanvas').fields({node:true,size:true}).exec(result=>{const target=result&&result[0];if(!target||!target.node)return;const canvas=target.node;const width=target.width||300;const height=target.height||180;const dpr=wx.getWindowInfo?wx.getWindowInfo().pixelRatio:1;canvas.width=width*dpr;canvas.height=height*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const colors=theme.palette();const left=42,right=18,top=18,bottom=30;const chartWidth=Math.max(1,width-left-right);const chartHeight=Math.max(1,height-top-bottom);const weights=items.map(item=>Number(item.weight)||0);const min=Math.min(...weights);const max=Math.max(...weights);const range=Math.max(1,max-min);ctx.lineWidth=1;ctx.strokeStyle=colors.grid;ctx.fillStyle=colors.secondaryText;ctx.font='10px sans-serif';for(let i=0;i<=3;i++){const y=top+chartHeight*i/3;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(width-right,y);ctx.stroke();const value=max-range*i/3;ctx.fillText(`${Math.round(value*10)/10}`,4,y+3);}const points=items.map((item,index)=>({x:left+(items.length===1?chartWidth/2:chartWidth*index/(items.length-1)),y:top+(max-Number(item.weight||0))/range*chartHeight}));ctx.lineWidth=3;ctx.strokeStyle=colors.accent;ctx.beginPath();points.forEach((point,index)=>index?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));ctx.stroke();ctx.fillStyle=colors.accent;points.forEach(point=>{ctx.beginPath();ctx.arc(point.x,point.y,4,0,Math.PI*2);ctx.fill();});ctx.fillStyle=colors.secondaryText;const labelIndexes=items.length>1?[0,items.length-1]:[0];labelIndexes.forEach(index=>{const label=String(items[index].date||'').slice(5);ctx.fillText(label,Math.max(left-8,Math.min(width-right-28,points[index].x-14)),height-8);});});},
  closeTrend(){this.setData({trend:null});},
  noop(){},
});
