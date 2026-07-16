const storage=require('../../utils/storage');
const foodLibrary=require('../../utils/food-library');
const theme=require('../../utils/theme');

Page({
  data:{themeClass:'',tab:'builtin',query:'',foods:[],templates:[],categories:[{key:'all',label:'全部'}].concat(foodLibrary.categories),category:'all'},
  onShow(){this.setData({themeClass:theme.apply()});this.refresh();},
  refresh(){
    const state=storage.getDietState();const favoriteSet=new Set((state.favoriteFoods||[]).map(String));
    let pool=this.data.tab==='custom'?state.customFoods:foodLibrary.builtins;
    const foods=foodLibrary.filterFoods(pool,this.data.query,this.data.category).map(item=>Object.assign({},item,{favorite:favoriteSet.has(String(item.id))}));
    const templates=(state.mealTemplates||[]).filter(item=>!this.data.query||item.name.includes(this.data.query));
    this.setData({foods,templates});
  },
  switchTab(event){this.setData({tab:event.currentTarget.dataset.tab},()=>this.refresh());},
  inputQuery(event){this.setData({query:event.detail.value},()=>this.refresh());},
  setCategory(event){this.setData({category:event.currentTarget.dataset.category},()=>this.refresh());},
  newFood(){getApp().globalData.editFoodId='';wx.navigateTo({url:'/pages/custom-food/custom-food'});},
  editFood(event){getApp().globalData.editFoodId=event.currentTarget.dataset.id;wx.navigateTo({url:'/pages/custom-food/custom-food'});},
  deleteFood(event){const id=event.currentTarget.dataset.id;wx.showModal({title:'删除自定义食物',content:'历史记录和已保存套餐不会受影响。',success:result=>{if(!result.confirm)return;const state=storage.getDietState();state.customFoods=state.customFoods.filter(item=>item.id!==id);state.favoriteFoods=state.favoriteFoods.filter(item=>String(item)!==String(id));storage.saveDietState(state);this.refresh();}});},
  addFood(event){const state=storage.getDietState();const food=foodLibrary.allFoods(state.customFoods).find(item=>item.id===event.currentTarget.dataset.id);if(!food)return;getApp().globalData.pendingFood=food;wx.navigateTo({url:'/pages/food-entry/food-entry'});},
  toggleFavorite(event){const state=storage.getDietState();state.favoriteFoods=foodLibrary.toggleFavorite(state.favoriteFoods,event.currentTarget.dataset.id);storage.saveDietState(state);this.refresh();},
  newTemplate(){getApp().globalData.editMealTemplateId='';wx.navigateTo({url:'/pages/meal-form/meal-form'});},
  editTemplate(event){getApp().globalData.editMealTemplateId=event.currentTarget.dataset.id;wx.navigateTo({url:'/pages/meal-form/meal-form'});},
  deleteTemplate(event){const id=event.currentTarget.dataset.id;wx.showModal({title:'删除套餐',content:'确定删除这个快捷套餐吗？',success:result=>{if(!result.confirm)return;const state=storage.getDietState();state.mealTemplates=state.mealTemplates.filter(item=>item.id!==id);storage.saveDietState(state);this.refresh();}});},
});
