const storage = require('../../utils/storage');
const diet = require('../../utils/diet');
const foodLibrary = require('../../utils/food-library');
const theme = require('../../utils/theme');

Page({
  data:{
    themeClass:'', editId:'', categories:foodLibrary.categories, categoryIndex:0,
    form:{name:'',category:'grain',servingSize:100,caloriesPerServing:'',proteinPerServing:'',fatPerServing:'',carbsPerServing:'',fiberPerServing:'',sodiumPerServing:'',pinyinInitials:''},
    actualAmount:'', actualResult:null,
  },
  onLoad(){
    const id=getApp().globalData.editFoodId||'';
    const state=storage.getDietState();
    const food=state.customFoods.find(item=>item.id===id);
    const form=food?foodLibrary.foodToServingForm(food):this.data.form;
    const categoryIndex=Math.max(0,foodLibrary.categories.findIndex(item=>item.key===form.category));
    this.setData({themeClass:theme.apply(),editId:id,form,categoryIndex});
  },
  onShow(){this.setData({themeClass:theme.apply()});},
  inputField(event){this.setData({[`form.${event.currentTarget.dataset.field}`]:event.detail.value},()=>this.calculateActual());},
  selectCategory(event){const categoryIndex=Number(event.detail.value)||0;this.setData({categoryIndex,'form.category':foodLibrary.categories[categoryIndex].key});},
  inputActual(event){this.setData({actualAmount:event.detail.value},()=>this.calculateActual());},
  calculateActual(){
    const amount=Number(this.data.actualAmount);if(!amount)return this.setData({actualResult:null});
    const food=foodLibrary.perServingToFood(this.data.form,this.data.editId||'preview');
    this.setData({actualResult:diet.calcMacros(food,amount)});
  },
  save(){
    const name=String(this.data.form.name||'').trim();
    if(!name)return wx.showToast({title:'请输入食物名称',icon:'none'});
    if(!(Number(this.data.form.servingSize)>0))return wx.showToast({title:'请输入正确的每份克重',icon:'none'});
    const item=foodLibrary.perServingToFood(this.data.form,this.data.editId||undefined);
    const state=storage.getDietState();
    const index=state.customFoods.findIndex(food=>food.id===item.id);
    if(index>=0)state.customFoods[index]=item;else state.customFoods.push(item);
    storage.saveDietState(state);wx.showToast({title:'已保存',icon:'success'});setTimeout(()=>wx.navigateBack(),450);
  },
});
