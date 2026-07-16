const storage=require('../../utils/storage');
const diet=require('../../utils/diet');
const dates=require('../../utils/date');
const foodLibrary=require('../../utils/food-library');
const mealTemplates=require('../../utils/meal-templates');
const dishLibrary=require('../../utils/dish-library');
const theme=require('../../utils/theme');

Page({
  data:{themeClass:'',tab:'builtin',query:'',foods:[],dishes:[],templates:[],categories:[{key:'all',label:'全部'}].concat(foodLibrary.categories),category:'all'},
  onShow(){
    const app=getApp();const reset=Boolean(app.globalData.openFoodLibraryForEntry);app.globalData.openFoodLibraryForEntry=false;
    this.setData(Object.assign({themeClass:theme.apply()},reset?{tab:'builtin',query:'',category:'all'}:{}),()=>this.refresh());
  },
  refresh(){
    const state=storage.getDietState();const favoriteSet=new Set((state.favoriteFoods||[]).map(String));
    let pool=this.data.tab==='custom'?state.customFoods:foodLibrary.builtins;
    if(this.data.tab==='favorite')pool=foodLibrary.allFoods(state.customFoods).filter(item=>favoriteSet.has(String(item.id)));
    const foods=foodLibrary.filterFoods(pool,this.data.query,this.data.category).map(item=>Object.assign({},item,{favorite:favoriteSet.has(String(item.id))}));
    const templates=(state.mealTemplates||[]).filter(item=>!this.data.query||item.name.includes(this.data.query));
    this.setData({foods,dishes:dishLibrary.list(this.data.query),templates});
  },
  switchTab(event){this.setData({tab:event.currentTarget.dataset.tab},()=>this.refresh());},
  inputQuery(event){this.setData({query:event.detail.value},()=>this.refresh());},
  setCategory(event){this.setData({category:event.currentTarget.dataset.category},()=>this.refresh());},
  newFood(){getApp().globalData.editFoodId='';wx.navigateTo({url:'/pages/custom-food/custom-food'});},
  editFood(event){getApp().globalData.editFoodId=event.currentTarget.dataset.id;wx.navigateTo({url:'/pages/custom-food/custom-food'});},
  deleteFood(event){const id=event.currentTarget.dataset.id;wx.showModal({title:'删除自定义食物',content:'历史记录和已保存套餐不会受影响。',success:result=>{if(!result.confirm)return;const state=storage.getDietState();state.customFoods=state.customFoods.filter(item=>item.id!==id);state.favoriteFoods=state.favoriteFoods.filter(item=>String(item)!==String(id));storage.saveDietState(state);this.refresh();}});},
  addFood(event){const state=storage.getDietState();const food=foodLibrary.allFoods(state.customFoods).find(item=>item.id===event.currentTarget.dataset.id);if(!food)return;getApp().globalData.pendingFood=food;wx.navigateTo({url:'/pages/food-entry/food-entry'});},
  selectDish(event){const dish=dishLibrary.dishes.find(item=>item.id===event.currentTarget.dataset.id);if(!dish)return;getApp().globalData.pendingDish=dish;wx.navigateTo({url:'/pages/dish-entry/dish-entry'});},
  toggleFavorite(event){const state=storage.getDietState();state.favoriteFoods=foodLibrary.toggleFavorite(state.favoriteFoods,event.currentTarget.dataset.id);storage.saveDietState(state);this.refresh();},
  newTemplate(){getApp().globalData.editMealTemplateId='';wx.navigateTo({url:'/pages/meal-form/meal-form'});},
  editTemplate(event){getApp().globalData.editMealTemplateId=event.currentTarget.dataset.id;wx.navigateTo({url:'/pages/meal-form/meal-form'});},
  deleteTemplate(event){const id=event.currentTarget.dataset.id;wx.showModal({title:'删除套餐',content:'确定删除这个快捷套餐吗？',success:result=>{if(!result.confirm)return;const state=storage.getDietState();state.mealTemplates=state.mealTemplates.filter(item=>item.id!==id);storage.saveDietState(state);this.refresh();}});},
  recordTemplate(event){
    const item=this.data.templates.find(template=>template.id===event.currentTarget.dataset.id);if(!item)return;
    const app=getApp();const state=storage.getDietState();const date=app.globalData.pendingDate||dates.dateKey(Date.now());const meal=app.globalData.pendingMeal||'lunch';
    const meals=diet.normalizeRecords(state.records,date);meals[meal].push(...mealTemplates.createRecords(item,meal));state.records[date]=meals;storage.saveDietState(state);
    wx.showToast({title:`已记录${item.components.length}项`,icon:'success'});
  },
});
