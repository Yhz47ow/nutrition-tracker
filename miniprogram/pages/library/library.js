const storage = require('../../utils/storage');
const diet = require('../../utils/diet');
const theme = require('../../utils/theme');

Page({
  data:{ themeClass:'', tab:'builtin', query:'', foods:[] },
  onShow(){ this.setData({themeClass:theme.apply()}); this.refresh(); },
  refresh(){ const state=storage.getDietState(); const pool=this.data.tab==='custom'?state.customFoods:diet.foods; const q=this.data.query.trim().toLowerCase(); this.setData({foods:q?pool.filter(item=>item.name.toLowerCase().includes(q)):pool}); },
  switchTab(event){ this.setData({tab:event.currentTarget.dataset.tab},()=>this.refresh()); },
  inputQuery(event){ this.setData({query:event.detail.value},()=>this.refresh()); },
  newFood(){ getApp().globalData.editFoodId=''; wx.navigateTo({url:'/pages/custom-food/custom-food'}); },
  editFood(event){ getApp().globalData.editFoodId=event.currentTarget.dataset.id; wx.navigateTo({url:'/pages/custom-food/custom-food'}); },
  deleteFood(event){ const id=event.currentTarget.dataset.id; wx.showModal({title:'删除自定义食物',content:'已添加到饮食记录中的历史数据不会受影响。',success:result=>{if(!result.confirm)return;const state=storage.getDietState();state.customFoods=state.customFoods.filter(item=>item.id!==id);storage.saveDietState(state);this.refresh();}}); },
  addFood(event){ const state=storage.getDietState(); const food=(this.data.tab==='custom'?state.customFoods:diet.foods).find(item=>item.id===event.currentTarget.dataset.id); if(!food)return;getApp().globalData.pendingFood=food;wx.navigateTo({url:'/pages/food-entry/food-entry'}); },
});
