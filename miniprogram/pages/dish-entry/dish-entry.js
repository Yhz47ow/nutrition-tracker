const storage=require('../../utils/storage');
const diet=require('../../utils/diet');
const dates=require('../../utils/date');
const dishLibrary=require('../../utils/dish-library');
const theme=require('../../utils/theme');

Page({
  data:{themeClass:'',dish:null,ingredients:[],totals:null,date:'',meal:'lunch',mealOptions:diet.MEAL_TYPES.map(type=>({type,name:diet.MEAL_META[type].name}))},
  onLoad(){
    const app=getApp();const dish=app.globalData.pendingDish;
    if(!dish){wx.showModal({title:'没有选择菜肴',content:'请返回食物库重新选择。',showCancel:false,success:()=>wx.navigateBack()});return;}
    const ingredients=dishLibrary.resolveIngredients(dish).map(item=>this.presentIngredient(item));
    this.setData({themeClass:theme.apply(),dish,ingredients,date:app.globalData.pendingDate||dates.dateKey(Date.now()),meal:app.globalData.pendingMeal||'lunch'},()=>this.recalculate());
  },
  onShow(){this.setData({themeClass:theme.apply()});},
  presentIngredient(item){const macros=Number(item.grams)>0?diet.calcMacros(item.food,item.grams):{calories:0,protein:0,fat:0,carbs:0,fiber:0,sodium:0,grams:0};return Object.assign({},item,{id:item.food.id,name:item.food.name,categoryLabel:item.food.categoryLabel,macros});},
  inputGrams(event){const index=Number(event.currentTarget.dataset.index);const ingredients=this.data.ingredients.slice();ingredients[index]=this.presentIngredient({food:ingredients[index].food,grams:Math.max(0,Number(event.detail.value)||0)});this.setData({ingredients},()=>this.recalculate());},
  adjustGrams(event){const index=Number(event.currentTarget.dataset.index);const ingredients=this.data.ingredients.slice();ingredients[index]=this.presentIngredient({food:ingredients[index].food,grams:Math.max(0,Number(ingredients[index].grams)+Number(event.currentTarget.dataset.delta))});this.setData({ingredients},()=>this.recalculate());},
  recalculate(){this.setData({totals:dishLibrary.calculate(this.data.ingredients)});},
  useSuggested(){const current=Number(this.data.totals&&this.data.totals.grams)||1;const factor=Number(this.data.dish.suggestedServing)/current;const ingredients=this.data.ingredients.map(item=>this.presentIngredient({food:item.food,grams:Math.max(1,Math.round(item.grams*factor))}));this.setData({ingredients},()=>this.recalculate());},
  reset(){const ingredients=dishLibrary.resolveIngredients(this.data.dish).map(item=>this.presentIngredient(item));this.setData({ingredients},()=>this.recalculate());},
  selectMeal(event){this.setData({meal:event.currentTarget.dataset.meal});},
  save(){
    const ingredients=this.data.ingredients.filter(item=>Number(item.grams)>0);if(!ingredients.length)return wx.showToast({title:'请至少保留一种食材',icon:'none'});
    const state=storage.getDietState();const meals=diet.normalizeRecords(state.records,this.data.date);meals[this.data.meal].push(...dishLibrary.createRecords(this.data.dish,ingredients,this.data.meal));state.records[this.data.date]=meals;storage.saveDietState(state);getApp().globalData.pendingDish=null;
    wx.showToast({title:'菜肴已记录',icon:'success'});setTimeout(()=>wx.navigateBack(),500);
  },
});
