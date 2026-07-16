const workoutData=require('../../utils/workout-data');
Page({
  data:{editId:'',name:'',bodyPart:'胸部',note:'',parts:workoutData.BODY_PARTS.slice(1)},
  onLoad(){const id=getApp().globalData.editExerciseId||'';const state=workoutData.load();const item=state.customExercises.find(exercise=>exercise.id===id);if(item)this.setData({editId:id,name:item.name,bodyPart:item.bodyPart,note:item.note||''});},
  inputName(event){this.setData({name:event.detail.value});},inputNote(event){this.setData({note:event.detail.value});},choosePart(event){this.setData({bodyPart:this.data.parts[Number(event.detail.value)]});},
  save(){const name=this.data.name.trim();if(!name)return wx.showToast({title:'请输入动作名称',icon:'none'});const state=workoutData.load();const item={id:this.data.editId||`custom_exercise_${Date.now()}`,name,bodyPart:this.data.bodyPart,note:this.data.note.trim(),isCustom:true};const index=state.customExercises.findIndex(exercise=>exercise.id===item.id);if(index>=0)state.customExercises[index]=item;else state.customExercises.push(item);workoutData.save(state);wx.showToast({title:'动作已保存',icon:'success'});setTimeout(()=>wx.navigateBack(),450);},
});
