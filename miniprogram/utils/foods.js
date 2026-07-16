'use strict';

const BUILTIN_FOODS = [
  // --- 主食 ---
  {id:'b-rice',name:'白米饭',caloriesPer100g:116,proteinPer100g:2.6,carbsPer100g:25.9,fatPer100g:0.3,servingSize:150,source:'builtin'},
  {id:'b-noodle',name:'面条(煮)',caloriesPer100g:110,proteinPer100g:3.4,carbsPer100g:22.8,fatPer100g:0.5,servingSize:200,source:'builtin'},
  {id:'b-bun',name:'馒头',caloriesPer100g:221,proteinPer100g:7.0,carbsPer100g:44.2,fatPer100g:1.1,servingSize:100,source:'builtin'},
  {id:'b-bread',name:'全麦面包',caloriesPer100g:247,proteinPer100g:13.0,carbsPer100g:41.0,fatPer100g:3.4,servingSize:60,source:'builtin'},
  {id:'b-whitebread',name:'白面包',caloriesPer100g:265,proteinPer100g:8.0,carbsPer100g:49.0,fatPer100g:3.2,servingSize:60,source:'builtin'},
  {id:'b-oatmeal',name:'燕麦片',caloriesPer100g:367,proteinPer100g:13.5,carbsPer100g:66.3,fatPer100g:6.7,servingSize:40,source:'builtin'},
  {id:'b-brownrice',name:'糙米饭',caloriesPer100g:111,proteinPer100g:2.6,carbsPer100g:23.0,fatPer100g:0.9,servingSize:150,source:'builtin'},
  {id:'b-corn',name:'玉米',caloriesPer100g:96,proteinPer100g:3.4,carbsPer100g:21.0,fatPer100g:1.2,servingSize:200,source:'builtin'},
  {id:'b-sweetpotato',name:'红薯',caloriesPer100g:86,proteinPer100g:1.6,carbsPer100g:20.1,fatPer100g:0.1,servingSize:200,source:'builtin'},
  {id:'b-potato',name:'土豆',caloriesPer100g:77,proteinPer100g:2.0,carbsPer100g:17.5,fatPer100g:0.1,servingSize:150,source:'builtin'},
  {id:'b-noodle-rice',name:'米粉',caloriesPer100g:109,proteinPer100g:0.6,carbsPer100g:24.3,fatPer100g:0.1,servingSize:200,source:'builtin'},
  {id:'b-dumpling',name:'饺子(猪肉白菜)',caloriesPer100g:225,proteinPer100g:9.0,carbsPer100g:27.0,fatPer100g:9.0,servingSize:150,source:'builtin'},
  {id:'b-zongzi',name:'粽子',caloriesPer100g:195,proteinPer100g:4.5,carbsPer100g:36.0,fatPer100g:3.5,servingSize:150,source:'builtin'},

  // --- 肉蛋水产 ---
  {id:'b-chickenbr',name:'鸡胸肉',caloriesPer100g:133,proteinPer100g:31.0,carbsPer100g:0,fatPer100g:1.2,servingSize:100,source:'builtin'},
  {id:'b-chickenleg',name:'鸡腿肉(去皮)',caloriesPer100g:158,proteinPer100g:26.0,carbsPer100g:0,fatPer100g:5.5,servingSize:120,source:'builtin'},
  {id:'b-chickenwing',name:'鸡翅(烤)',caloriesPer100g:194,proteinPer100g:21.7,carbsPer100g:0,fatPer100g:11.8,servingSize:100,source:'builtin'},
  {id:'b-egg',name:'鸡蛋(煮)',caloriesPer100g:144,proteinPer100g:13.3,carbsPer100g:1.5,fatPer100g:8.8,servingSize:60,source:'builtin'},
  {id:'b-eggwhite',name:'蛋白',caloriesPer100g:60,proteinPer100g:11.0,carbsPer100g:0.7,fatPer100g:0.2,servingSize:60,source:'builtin'},
  {id:'b-beeflean',name:'牛肉(瘦)',caloriesPer100g:125,proteinPer100g:20.2,carbsPer100g:0.2,fatPer100g:4.2,servingSize:100,source:'builtin'},
  {id:'b-beefrib',name:'牛肉(肥瘦)',caloriesPer100g:215,proteinPer100g:18.0,carbsPer100g:0.1,fatPer100g:15.0,servingSize:100,source:'builtin'},
  {id:'b-porklean',name:'猪肉(瘦)',caloriesPer100g:143,proteinPer100g:20.3,carbsPer100g:1.5,fatPer100g:6.2,servingSize:100,source:'builtin'},
  {id:'b-porkbelly',name:'五花肉',caloriesPer100g:395,proteinPer100g:14.0,carbsPer100g:0,fatPer100g:37.0,servingSize:80,source:'builtin'},
  {id:'b-salmon',name:'三文鱼',caloriesPer100g:208,proteinPer100g:20.4,carbsPer100g:0,fatPer100g:13.4,servingSize:120,source:'builtin'},
  {id:'b-shrimp',name:'虾仁',caloriesPer100g:99,proteinPer100g:20.3,carbsPer100g:0.2,fatPer100g:0.3,servingSize:100,source:'builtin'},
  {id:'b-fish',name:'草鱼',caloriesPer100g:113,proteinPer100g:16.6,carbsPer100g:0,fatPer100g:5.2,servingSize:120,source:'builtin'},
  {id:'b-tuna',name:'金枪鱼(水浸)',caloriesPer100g:116,proteinPer100g:26.0,carbsPer100g:0,fatPer100g:0.8,servingSize:100,source:'builtin'},
  {id:'b-tofu',name:'豆腐(嫩)',caloriesPer100g:76,proteinPer100g:8.1,carbsPer100g:1.9,fatPer100g:4.8,servingSize:150,source:'builtin'},
  {id:'b-tofudry',name:'豆腐干',caloriesPer100g:140,proteinPer100g:16.2,carbsPer100g:3.3,fatPer100g:8.2,servingSize:100,source:'builtin'},
  {id:'b-milk',name:'纯牛奶',caloriesPer100g:42,proteinPer100g:3.4,carbsPer100g:5.0,fatPer100g:1.0,servingSize:200,source:'builtin'},
  {id:'b-yogurt',name:'无糖酸奶',caloriesPer100g:61,proteinPer100g:3.5,carbsPer100g:7.0,fatPer100g:3.3,servingSize:150,source:'builtin'},
  {id:'b-yogurt-sweet',name:'风味酸奶',caloriesPer100g:85,proteinPer100g:3.0,carbsPer100g:12.0,fatPer100g:3.0,servingSize:150,source:'builtin'},

  // --- 蔬菜 ---
  {id:'v-broccoli',name:'西兰花',caloriesPer100g:34,proteinPer100g:2.8,carbsPer100g:6.6,fatPer100g:0.4,servingSize:100,source:'builtin'},
  {id:'v-spinach',name:'菠菜',caloriesPer100g:23,proteinPer100g:2.9,carbsPer100g:3.6,fatPer100g:0.4,servingSize:150,source:'builtin'},
  {id:'v-cabbage',name:'大白菜',caloriesPer100g:13,proteinPer100g:1.5,carbsPer100g:2.2,fatPer100g:0.1,servingSize:150,source:'builtin'},
  {id:'v-cucumber',name:'黄瓜',caloriesPer100g:15,proteinPer100g:0.7,carbsPer100g:3.6,fatPer100g:0.1,servingSize:150,source:'builtin'},
  {id:'v-tomato',name:'番茄',caloriesPer100g:18,proteinPer100g:0.9,carbsPer100g:3.9,fatPer100g:0.2,servingSize:150,source:'builtin'},
  {id:'v-carrot',name:'胡萝卜',caloriesPer100g:41,proteinPer100g:0.9,carbsPer100g:9.6,fatPer100g:0.2,servingSize:100,source:'builtin'},
  {id:'v-lettuce',name:'生菜',caloriesPer100g:15,proteinPer100g:1.4,carbsPer100g:2.9,fatPer100g:0.2,servingSize:100,source:'builtin'},
  {id:'v-celery',name:'芹菜',caloriesPer100g:14,proteinPer100g:0.7,carbsPer100g:3.0,fatPer100g:0.2,servingSize:100,source:'builtin'},
  {id:'v-bellpepper',name:'甜椒',caloriesPer100g:31,proteinPer100g:1.0,carbsPer100g:6.0,fatPer100g:0.3,servingSize:100,source:'builtin'},
  {id:'v-kelp',name:'海带',caloriesPer100g:12,proteinPer100g:1.2,carbsPer100g:2.0,fatPer100g:0.1,servingSize:100,source:'builtin'},
  {id:'v-mushroom',name:'香菇',caloriesPer100g:26,proteinPer100g:2.2,carbsPer100g:5.2,fatPer100g:0.3,servingSize:100,source:'builtin'},
  {id:'v-cauliflower',name:'菜花',caloriesPer100g:25,proteinPer100g:1.9,carbsPer100g:5.0,fatPer100g:0.3,servingSize:150,source:'builtin'},
  {id:'v-greenbean',name:'四季豆',caloriesPer100g:31,proteinPer100g:2.0,carbsPer100g:5.7,fatPer100g:0.3,servingSize:100,source:'builtin'},
  {id:'v-cornsweet',name:'甜玉米粒',caloriesPer100g:86,proteinPer100g:3.3,carbsPer100g:19.0,fatPer100g:1.2,servingSize:100,source:'builtin'},

  // --- 水果 ---
  {id:'f-apple',name:'苹果',caloriesPer100g:52,proteinPer100g:0.3,carbsPer100g:13.8,fatPer100g:0.2,servingSize:200,source:'builtin'},
  {id:'f-banana',name:'香蕉',caloriesPer100g:89,proteinPer100g:1.1,carbsPer100g:22.8,fatPer100g:0.3,servingSize:120,source:'builtin'},
  {id:'f-orange',name:'橙子',caloriesPer100g:47,proteinPer100g:0.9,carbsPer100g:11.8,fatPer100g:0.1,servingSize:200,source:'builtin'},
  {id:'f-grape',name:'葡萄',caloriesPer100g:69,proteinPer100g:0.7,carbsPer100g:18.1,fatPer100g:0.2,servingSize:150,source:'builtin'},
  {id:'f-strawberry',name:'草莓',caloriesPer100g:32,proteinPer100g:0.7,carbsPer100g:7.7,fatPer100g:0.3,servingSize:150,source:'builtin'},
  {id:'f-blueberry',name:'蓝莓',caloriesPer100g:57,proteinPer100g:0.7,carbsPer100g:14.5,fatPer100g:0.3,servingSize:100,source:'builtin'},
  {id:'f-watermelon',name:'西瓜',caloriesPer100g:30,proteinPer100g:0.6,carbsPer100g:7.6,fatPer100g:0.2,servingSize:300,source:'builtin'},
  {id:'f-kiwi',name:'猕猴桃',caloriesPer100g:61,proteinPer100g:1.1,carbsPer100g:14.7,fatPer100g:0.5,servingSize:100,source:'builtin'},
  {id:'f-avocado',name:'牛油果',caloriesPer100g:160,proteinPer100g:2.0,carbsPer100g:8.5,fatPer100g:14.7,servingSize:100,source:'builtin'},

  // --- 坚果酱料 ---
  {id:'n-peanut',name:'花生(生)',caloriesPer100g:567,proteinPer100g:25.8,carbsPer100g:16.1,fatPer100g:49.2,servingSize:20,source:'builtin'},
  {id:'n-almond',name:'杏仁',caloriesPer100g:579,proteinPer100g:21.2,carbsPer100g:21.7,fatPer100g:49.9,servingSize:20,source:'builtin'},
  {id:'n-walnut',name:'核桃仁',caloriesPer100g:654,proteinPer100g:15.2,carbsPer100g:13.7,fatPer100g:65.2,servingSize:20,source:'builtin'},
  {id:'n-peanutbutter',name:'花生酱',caloriesPer100g:588,proteinPer100g:25.1,carbsPer100g:20.0,fatPer100g:50.0,servingSize:20,source:'builtin'},
  {id:'n-oliveoil',name:'橄榄油',caloriesPer100g:884,proteinPer100g:0,carbsPer100g:0,fatPer100g:100.0,servingSize:10,source:'builtin'},
  {id:'n-honey',name:'蜂蜜',caloriesPer100g:304,proteinPer100g:0.3,carbsPer100g:82.4,fatPer100g:0,servingSize:15,source:'builtin'},

  // --- 饮品 ---
  {id:'d-coffee-black',name:'黑咖啡',caloriesPer100g:2,proteinPer100g:0.3,carbsPer100g:0,fatPer100g:0,servingSize:250,source:'builtin'},
  {id:'d-tea',name:'绿茶/红茶(无糖)',caloriesPer100g:1,proteinPer100g:0,carbsPer100g:0.1,fatPer100g:0,servingSize:250,source:'builtin'},
  {id:'d-soymilk',name:'无糖豆浆',caloriesPer100g:33,proteinPer100g:2.9,carbsPer100g:1.6,fatPer100g:1.8,servingSize:250,source:'builtin'},
  {id:'d-protein-whey',name:'乳清蛋白粉',caloriesPer100g:400,proteinPer100g:80.0,carbsPer100g:10.0,fatPer100g:5.0,servingSize:30,source:'builtin'},
  {id:'d-protein-soy',name:'大豆蛋白粉',caloriesPer100g:375,proteinPer100g:75.0,carbsPer100g:15.0,fatPer100g:3.0,servingSize:30,source:'builtin'},

  // --- 速食/加工 ---
  {id:'p-instantnoodle',name:'方便面(包)',caloriesPer100g:462,proteinPer100g:8.0,carbsPer100g:61.0,fatPer100g:21.0,servingSize:100,source:'builtin'},
  {id:'p-ham',name:'火腿肠',caloriesPer100g:212,proteinPer100g:14.0,carbsPer100g:7.0,fatPer100g:15.0,servingSize:50,source:'builtin'},
  {id:'p-sausage',name:'烤肠',caloriesPer100g:322,proteinPer100g:16.0,carbsPer100g:12.0,fatPer100g:24.0,servingSize:60,source:'builtin'},
  {id:'p-fishball',name:'鱼丸',caloriesPer100g:110,proteinPer100g:9.0,carbsPer100g:12.0,fatPer100g:2.0,servingSize:100,source:'builtin'},
  {id:'p-cannedtuna',name:'金枪鱼罐头(油浸)',caloriesPer100g:198,proteinPer100g:24.0,carbsPer100g:0,fatPer100g:10.0,servingSize:100,source:'builtin'},
  {id:'p-granola',name:'格兰诺拉麦片',caloriesPer100g:471,proteinPer100g:10.0,carbsPer100g:64.0,fatPer100g:20.0,servingSize:40,source:'builtin'},
]

module.exports = Object.freeze(BUILTIN_FOODS);
