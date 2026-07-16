const storage = require('../../utils/storage');
const diet = require('../../utils/diet');
const foodLibrary = require('../../utils/food-library');
const templates = require('../../utils/meal-templates');
const dates = require('../../utils/date');
const theme = require('../../utils/theme');

Page({
  data:{themeClass:'',tab:'local',query:'',results:[],mealTemplates:[],categories:[{key:'all',label:'全部'}].concat(foodLibrary.categories),category:'all',pendingMeal:'lunch',favoriteFoods:[]},
  onShow(){this.setData({themeClass:theme.apply(),pendingMeal:getApp().globalData.pendingMeal||'lunch'});this.refresh();},
  refresh(){
    const state=storage.getDietState();
    const favoriteSet=new Set((state.favoriteFoods||[]).map(String));
    let pool=this.data.tab==='custom'?state.customFoods:foodLibrary.allFoods(state.customFoods);
    if(this.data.tab==='favorite')pool=pool.filter(item=>favoriteSet.has(String(item.id)));
    const results=foodLibrary.filterFoods(pool,this.data.query,this.data.category).map(item=>Object.assign({},item,{favorite:favoriteSet.has(String(item.id))}));
    const mealTemplates=(state.mealTemplates||[]).filter(item=>!this.data.query||item.name.includes(this.data.query));
    this.setData({results,mealTemplates,favoriteFoods:state.favoriteFoods||[]});
  },
  switchTab(event){this.setData({tab:event.currentTarget.dataset.tab},()=>this.refresh());},
  inputQuery(event){this.setData({query:event.detail.value},()=>this.refresh());},
  setCategory(event){this.setData({category:event.currentTarget.dataset.category},()=>this.refresh());},
  selectFood(event){const food=this.data.results[Number(event.currentTarget.dataset.index)];if(!food)return;getApp().globalData.pendingFood=food;wx.navigateTo({url:'/pages/food-entry/food-entry'});},
  toggleFavorite(event){const id=event.currentTarget.dataset.id;const state=storage.getDietState();state.favoriteFoods=foodLibrary.toggleFavorite(state.favoriteFoods,id);storage.saveDietState(state);this.refresh();},
  recordTemplate(event){
    const item=this.data.mealTemplates.find(template=>template.id===event.currentTarget.dataset.id);if(!item)return;
    const state=storage.getDietState();const date=getApp().globalData.pendingDate||dates.dateKey(Date.now());const meal=this.data.pendingMeal;
    const meals=diet.normalizeRecords(state.records,date);meals[meal].push(...templates.createRecords(item,meal));state.records[date]=meals;storage.saveDietState(state);
    wx.showToast({title:`已记录${item.components.length}项`,icon:'success'});
  },
  newCustom(){getApp().globalData.editFoodId='';wx.navigateTo({url:'/pages/custom-food/custom-food'});},
  newTemplate(){getApp().globalData.editMealTemplateId='';wx.navigateTo({url:'/pages/meal-form/meal-form'});},
});
