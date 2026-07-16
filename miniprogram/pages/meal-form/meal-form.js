const storage=require('../../utils/storage');
const foodLibrary=require('../../utils/food-library');
const templates=require('../../utils/meal-templates');
const theme=require('../../utils/theme');

Page({
  data:{themeClass:'',editId:'',name:'',query:'',matches:[],components:[],totals:null},
  onLoad(){
    const id=getApp().globalData.editMealTemplateId||'';const state=storage.getDietState();const item=state.mealTemplates.find(template=>template.id===id);
    const components=item?(item.components||[]).map(component=>({food:templates.componentFood(component),grams:component.grams})):[];
    this.setData({themeClass:theme.apply(),editId:id,name:item?item.name:'',components},()=>this.recalculate());
  },
  onShow(){this.setData({themeClass:theme.apply()});},
  inputName(event){this.setData({name:event.detail.value});},
  inputQuery(event){this.setData({query:event.detail.value},()=>this.search());},
  search(){const state=storage.getDietState();const query=this.data.query.trim();this.setData({matches:query?foodLibrary.filterFoods(foodLibrary.allFoods(state.customFoods),query,'all').slice(0,12):[]});},
  addFood(event){const food=this.data.matches[Number(event.currentTarget.dataset.index)];if(!food)return;const components=this.data.components.concat([{food,grams:food.servingSize||100}]);this.setData({components,query:'',matches:[]},()=>this.recalculate());},
  inputGrams(event){const index=Number(event.currentTarget.dataset.index);const components=this.data.components.slice();components[index].grams=Math.max(1,Number(event.detail.value)||1);this.setData({components},()=>this.recalculate());},
  removeFood(event){const components=this.data.components.slice();components.splice(Number(event.currentTarget.dataset.index),1);this.setData({components},()=>this.recalculate());},
  recalculate(){const parts=this.data.components.map(item=>templates.snapshot(item.food,item.grams));this.setData({totals:templates.totals(parts)});},
  save(){
    const name=this.data.name.trim();if(!name)return wx.showToast({title:'请输入套餐名称',icon:'none'});if(!this.data.components.length)return wx.showToast({title:'请至少添加一种食物',icon:'none'});
    const state=storage.getDietState();const previous=state.mealTemplates.find(item=>item.id===this.data.editId);const item=templates.createTemplate(name,this.data.components,this.data.editId||undefined);if(previous)item.createdAt=previous.createdAt;
    const index=state.mealTemplates.findIndex(template=>template.id===item.id);if(index>=0)state.mealTemplates[index]=item;else state.mealTemplates.push(item);storage.saveDietState(state);wx.showToast({title:'套餐已保存',icon:'success'});setTimeout(()=>wx.navigateBack(),450);
  },
});
