'use strict';

const CATEGORY_OPTIONS = Object.freeze([
  { key:'grain', label:'谷薯类', shortLabel:'谷薯', min:250, max:400, unit:'g' },
  { key:'vegetable', label:'蔬菜', shortLabel:'蔬菜', min:300, max:500, unit:'g' },
  { key:'fruit', label:'水果', shortLabel:'水果', min:200, max:350, unit:'g' },
  { key:'livestock', label:'畜禽肉', shortLabel:'畜禽肉', min:40, max:75, unit:'g' },
  { key:'aquatic', label:'水产品', shortLabel:'水产品', min:40, max:75, unit:'g' },
  { key:'egg', label:'蛋类', shortLabel:'蛋类', min:40, max:50, unit:'g' },
  { key:'dairy', label:'奶及奶制品', shortLabel:'奶类', min:300, max:500, unit:'g' },
  { key:'soyNuts', label:'大豆及坚果', shortLabel:'豆坚果', min:25, max:35, unit:'g' },
  { key:'salt', label:'盐', shortLabel:'盐', min:0, max:5, unit:'g', maxOnly:true },
  { key:'oil', label:'烹调油', shortLabel:'油', min:25, max:30, unit:'g' },
  { key:'water', label:'饮水', shortLabel:'饮水', min:1500, max:1700, unit:'ml' },
]);

const FOOD_CATEGORIES = Object.freeze(CATEGORY_OPTIONS.map(item => ({ key:item.key, label:item.label })).concat([
  { key:'condiment', label:'调味品' },
  { key:'beverage', label:'饮品' },
  { key:'other', label:'其他' },
]));

const ENERGY_RANGES = Object.freeze({
  male: { min:1800, max:2400 },
  female: { min:1600, max:2000 },
  default: { min:1600, max:2400 },
});

const MACRO_RANGES = Object.freeze({
  protein: { label:'蛋白质', min:10, max:15 },
  fat: { label:'脂肪', min:20, max:30 },
  carbs: { label:'碳水化合物', min:50, max:65 },
});

const PRINCIPLES = Object.freeze([
  '食物多样，谷类为主',
  '吃动平衡，健康体重',
  '多吃蔬果、奶类和大豆',
  '适量吃鱼、禽、蛋、瘦肉',
  '少盐少油，控糖限酒',
  '规律进餐，足量饮水',
]);

module.exports = { CATEGORY_OPTIONS, FOOD_CATEGORIES, ENERGY_RANGES, MACRO_RANGES, PRINCIPLES };
