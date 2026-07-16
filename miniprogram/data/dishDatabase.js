'use strict';

// 家常菜营养由 foodId 对应基础食材按克重实时累加，不保存重复的固定营养值。
const DISHES = [
  {id:'dish-tomato-egg',name:'番茄炒蛋',aliases:['西红柿炒鸡蛋'],pinyinInitials:'fqcdd',ingredients:[['v-tomato',150],['b-egg',100],['cn-rapeseed-oil',10],['cn-salt',1]],suggestedServing:180},
  {id:'dish-pepper-pork',name:'青椒肉丝',aliases:['辣椒肉丝'],pinyinInitials:'qjrs',ingredients:[['cn-green-pepper',120],['b-porklean',100],['cn-rapeseed-oil',10],['cn-soy-sauce',8]],suggestedServing:180},
  {id:'dish-mapo-tofu',name:'麻婆豆腐',aliases:[],pinyinInitials:'mpdf',ingredients:[['b-tofu',250],['b-porklean',40],['cn-rapeseed-oil',12],['cn-soy-sauce',8]],suggestedServing:200},
  {id:'dish-steamed-fish',name:'清蒸鲈鱼',aliases:['清蒸鱼'],pinyinInitials:'qzlyqzy',ingredients:[['cn-bass',250],['cn-ginger',10],['cn-soy-sauce',10],['cn-rapeseed-oil',5]],suggestedServing:180},
  {id:'dish-egg-fried-rice',name:'蛋炒饭',aliases:['鸡蛋炒饭'],pinyinInitials:'dcf',ingredients:[['b-rice',250],['b-egg',60],['cn-rapeseed-oil',10],['cn-leek',10]],suggestedServing:300},
  {id:'dish-kungpao-chicken',name:'宫保鸡丁',aliases:[],pinyinInitials:'gbjd',ingredients:[['b-chickenbr',150],['n-peanut',20],['v-cucumber',80],['cn-rapeseed-oil',12],['cn-soy-sauce',8]],suggestedServing:220},
  {id:'dish-yuxiang-pork',name:'鱼香肉丝',aliases:[],pinyinInitials:'yxrs',ingredients:[['b-porklean',120],['cn-wood-ear',50],['v-carrot',50],['cn-green-pepper',50],['cn-rapeseed-oil',12]],suggestedServing:200},
  {id:'dish-braised-pork',name:'红烧肉',aliases:['红烧五花肉'],pinyinInitials:'hsr',ingredients:[['b-porkbelly',180],['cn-soy-sauce',12],['cn-rapeseed-oil',5],['cn-ginger',8]],suggestedServing:100},
  {id:'dish-sweet-sour-rib',name:'糖醋排骨',aliases:[],pinyinInitials:'tcpg',ingredients:[['cn-pork-rib',200],['cn-rapeseed-oil',12],['n-honey',15],['cn-vinegar',12],['cn-soy-sauce',8]],suggestedServing:150},
  {id:'dish-potato-beef',name:'土豆炖牛肉',aliases:[],pinyinInitials:'tddnr',ingredients:[['b-beeflean',120],['b-potato',200],['v-carrot',50],['cn-rapeseed-oil',10],['cn-soy-sauce',8]],suggestedServing:280},
  {id:'dish-cabbage',name:'手撕包菜',aliases:['炒圆白菜'],pinyinInitials:'ssbccybc',ingredients:[['cn-cabbage-round',300],['cn-rapeseed-oil',12],['cn-garlic',8],['cn-salt',1]],suggestedServing:200},
  {id:'dish-garlic-broccoli',name:'蒜蓉西兰花',aliases:[],pinyinInitials:'srxlh',ingredients:[['v-broccoli',250],['cn-garlic',12],['cn-rapeseed-oil',10],['cn-salt',1]],suggestedServing:200},
  {id:'dish-eggplant',name:'红烧茄子',aliases:['烧茄子'],pinyinInitials:'hsqzsqz',ingredients:[['cn-eggplant',250],['cn-green-pepper',50],['cn-rapeseed-oil',15],['cn-soy-sauce',10]],suggestedServing:220},
  {id:'dish-celery-pork',name:'芹菜炒肉',aliases:['芹菜肉丝'],pinyinInitials:'qccr',ingredients:[['v-celery',180],['b-porklean',100],['cn-rapeseed-oil',10],['cn-soy-sauce',8]],suggestedServing:200},
  {id:'dish-waxgourd-rib-soup',name:'冬瓜排骨汤',aliases:[],pinyinInitials:'dgpgt',ingredients:[['cn-wax-gourd',300],['cn-pork-rib',150],['cn-ginger',8],['cn-salt',2]],suggestedServing:300},
  {id:'dish-fish-tofu-soup',name:'鲫鱼豆腐汤',aliases:[],pinyinInitials:'jydft',ingredients:[['cn-crucian',200],['b-tofu',150],['cn-rapeseed-oil',5],['cn-ginger',8],['cn-salt',2]],suggestedServing:300},
  {id:'dish-shrimp-egg',name:'虾仁炒蛋',aliases:[],pinyinInitials:'xrcd',ingredients:[['b-shrimp',120],['b-egg',120],['cn-rapeseed-oil',10],['cn-salt',1]],suggestedServing:180},
  {id:'dish-mushroom-bokchoy',name:'香菇炒青菜',aliases:['香菇小白菜'],pinyinInitials:'xgcqc',ingredients:[['cn-bokchoy',250],['v-mushroom',100],['cn-rapeseed-oil',10],['cn-salt',1]],suggestedServing:220},
  {id:'dish-cold-cucumber',name:'凉拌黄瓜',aliases:['拍黄瓜'],pinyinInitials:'lbhgphg',ingredients:[['v-cucumber',250],['cn-sesame-oil',5],['cn-vinegar',10],['cn-soy-sauce',6],['cn-garlic',8]],suggestedServing:180},
  {id:'dish-tomato-beef',name:'番茄炖牛腩',aliases:['西红柿炖牛腩'],pinyinInitials:'fqdnn',ingredients:[['b-beefrib',150],['v-tomato',250],['cn-onion',80],['cn-rapeseed-oil',8]],suggestedServing:280},
  {id:'dish-chicken-mushroom',name:'香菇炖鸡',aliases:[],pinyinInitials:'xgdj',ingredients:[['cn-chicken-raw',200],['v-mushroom',100],['cn-ginger',8],['cn-soy-sauce',10]],suggestedServing:220},
  {id:'dish-steamed-egg',name:'鸡蛋羹',aliases:['蒸水蛋'],pinyinInitials:'jdg',ingredients:[['b-egg',100],['cn-water',150],['cn-soy-sauce',5],['cn-sesame-oil',3]],suggestedServing:200},
  {id:'dish-scallion-noodle',name:'葱油拌面',aliases:[],pinyinInitials:'cybm',ingredients:[['b-noodle',250],['cn-leek',20],['cn-rapeseed-oil',12],['cn-soy-sauce',10]],suggestedServing:260},
  {id:'dish-tofu-cabbage',name:'白菜炖豆腐',aliases:[],pinyinInitials:'bcddf',ingredients:[['v-cabbage',250],['b-tofu',200],['cn-rapeseed-oil',8],['cn-salt',1]],suggestedServing:300},
];

module.exports = Object.freeze(DISHES.map(dish => Object.freeze(Object.assign({}, dish, {
  ingredients:Object.freeze(dish.ingredients.map(item => Object.freeze({foodId:item[0],grams:item[1]}))),
  source:'estimated-recipe-v1',
}))));
