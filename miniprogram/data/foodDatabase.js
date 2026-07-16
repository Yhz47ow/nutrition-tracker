'use strict';

// 营养值均按每 100g 可食部记录。既有 id 不得修改，否则旧饮食记录无法回溯。

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

const CATEGORY_BY_ID = Object.freeze({
  'b-rice':'grain','b-noodle':'grain','b-bun':'grain','b-bread':'grain','b-whitebread':'grain','b-oatmeal':'grain','b-brownrice':'grain','b-corn':'grain','b-sweetpotato':'grain','b-potato':'grain','b-noodle-rice':'grain','b-dumpling':'grain','b-zongzi':'grain',
  'b-chickenbr':'livestock','b-chickenleg':'livestock','b-chickenwing':'livestock','b-egg':'egg','b-eggwhite':'egg','b-beeflean':'livestock','b-beefrib':'livestock','b-porklean':'livestock','b-porkbelly':'livestock','b-salmon':'aquatic','b-shrimp':'aquatic','b-fish':'aquatic','b-tuna':'aquatic','b-tofu':'soyNuts','b-tofudry':'soyNuts','b-milk':'dairy','b-yogurt':'dairy','b-yogurt-sweet':'dairy',
  'v-broccoli':'vegetable','v-spinach':'vegetable','v-cabbage':'vegetable','v-cucumber':'vegetable','v-tomato':'vegetable','v-carrot':'vegetable','v-lettuce':'vegetable','v-celery':'vegetable','v-bellpepper':'vegetable','v-kelp':'vegetable','v-mushroom':'vegetable','v-cauliflower':'vegetable','v-greenbean':'vegetable','v-cornsweet':'grain',
  'f-apple':'fruit','f-banana':'fruit','f-orange':'fruit','f-grape':'fruit','f-strawberry':'fruit','f-blueberry':'fruit','f-watermelon':'fruit','f-kiwi':'fruit','f-avocado':'fruit',
  'n-peanut':'soyNuts','n-almond':'soyNuts','n-walnut':'soyNuts','n-peanutbutter':'soyNuts','n-oliveoil':'oil','n-honey':'condiment',
  'd-coffee-black':'beverage','d-tea':'water','d-soymilk':'soyNuts','d-protein-whey':'other','d-protein-soy':'soyNuts',
  'p-instantnoodle':'grain','p-ham':'livestock','p-sausage':'livestock','p-fishball':'aquatic','p-cannedtuna':'aquatic','p-granola':'grain',
});

const SEARCH_INITIALS = Object.freeze({
  'b-rice':'bmfbf','b-noodle':'mtz','b-bun':'mt','b-bread':'qmmb','b-whitebread':'bmb','b-oatmeal':'ymp','b-brownrice':'cmf','b-corn':'ym','b-sweetpotato':'hs','b-potato':'td','b-noodle-rice':'mf','b-dumpling':'jzzrbc','b-zongzi':'zz',
  'b-chickenbr':'jxr','b-chickenleg':'jtr','b-chickenwing':'jck','b-egg':'jdz','b-eggwhite':'db','b-beeflean':'nrs','b-beefrib':'nrfs','b-porklean':'zrs','b-porkbelly':'whr','b-salmon':'swy','b-shrimp':'xr','b-fish':'cy','b-tuna':'jqy','b-tofu':'dfn','b-tofudry':'dfg','b-milk':'cnn','b-yogurt':'wtsn','b-yogurt-sweet':'fwsn',
  'v-broccoli':'xlh','v-spinach':'bc','v-cabbage':'dbc','v-cucumber':'hg','v-tomato':'fq','v-carrot':'hlb','v-lettuce':'sc','v-celery':'qc','v-bellpepper':'tj','v-kelp':'hd','v-mushroom':'xg','v-cauliflower':'ch','v-greenbean':'sjd','v-cornsweet':'tyml',
  'f-apple':'pg','f-banana':'xj','f-orange':'cz','f-grape':'pt','f-strawberry':'cm','f-blueberry':'lm','f-watermelon':'xg','f-kiwi':'mht','f-avocado':'nyg',
  'n-peanut':'hss','n-almond':'xr','n-walnut':'htr','n-peanutbutter':'hsj','n-oliveoil':'gly','n-honey':'fm',
  'd-coffee-black':'hkf','d-tea':'lchcwt','d-soymilk':'wtdj','d-protein-whey':'rqd bf','d-protein-soy':'dddbf',
  'p-instantnoodle':'fbmb','p-ham':'htc','p-sausage':'kc','p-fishball':'yw','p-cannedtuna':'jqygt','p-granola':'glnlmp',
});

const MICROS_BY_ID = Object.freeze({
  'b-rice':[0.3,2],'b-noodle':[1.2,5],'b-bun':[1.3,165],'b-bread':[6.0,430],'b-whitebread':[2.7,490],'b-oatmeal':[10.1,5],'b-brownrice':[1.8,5],'b-corn':[2.4,15],'b-sweetpotato':[3.0,55],'b-potato':[2.2,6],'b-noodle-rice':[0.9,8],'b-dumpling':[1.6,350],'b-zongzi':[0.8,180],
  'b-chickenbr':[0,45],'b-chickenleg':[0,70],'b-chickenwing':[0,80],'b-egg':[0,130],'b-eggwhite':[0,166],'b-beeflean':[0,48],'b-beefrib':[0,55],'b-porklean':[0,58],'b-porkbelly':[0,62],'b-salmon':[0,59],'b-shrimp':[0,111],'b-fish':[0,46],'b-tuna':[0,50],'b-tofu':[0.4,7],'b-tofudry':[0.8,76],'b-milk':[0,40],'b-yogurt':[0,46],'b-yogurt-sweet':[0,55],
  'v-broccoli':[2.6,33],'v-spinach':[2.2,79],'v-cabbage':[1.0,57],'v-cucumber':[0.5,2],'v-tomato':[1.2,5],'v-carrot':[2.8,69],'v-lettuce':[1.3,28],'v-celery':[1.6,80],'v-bellpepper':[2.1,4],'v-kelp':[0.5,85],'v-mushroom':[3.3,5],'v-cauliflower':[2.0,30],'v-greenbean':[2.7,6],'v-cornsweet':[2.7,15],
  'f-apple':[2.4,1],'f-banana':[2.6,1],'f-orange':[2.4,0],'f-grape':[0.9,2],'f-strawberry':[2.0,1],'f-blueberry':[2.4,1],'f-watermelon':[0.4,1],'f-kiwi':[3.0,3],'f-avocado':[6.7,7],
  'n-peanut':[8.5,18],'n-almond':[12.5,1],'n-walnut':[6.7,2],'n-peanutbutter':[6.0,400],'n-oliveoil':[0,0],'n-honey':[0.2,4],
  'd-coffee-black':[0,2],'d-tea':[0,1],'d-soymilk':[0.6,28],'d-protein-whey':[0,300],'d-protein-soy':[1,600],
  'p-instantnoodle':[2.4,1900],'p-ham':[0,900],'p-sausage':[0,850],'p-fishball':[0.5,650],'p-cannedtuna':[0,350],'p-granola':[7,180],
});

// 可继续在这里追加条目；category 必须使用 guideline.js 中的 key。
const CHINESE_STAPLES = [
  ['cn-congee','大米粥','grain',46,1.1,0.3,9.9,0.3,3,250,'dmz'],
  ['cn-millet-congee','小米粥','grain',46,1.4,0.7,8.4,0.7,4,250,'xmz'],
  ['cn-millet','小米(生)','grain',361,9.0,3.1,75.1,1.6,3,50,'xms'],
  ['cn-flour','小麦粉(标准粉)','grain',362,15.7,2.5,70.9,2.1,6,100,'xmfbzf'],
  ['cn-steamed-roll','花卷','grain',214,6.4,1.0,45.6,1.5,230,100,'hj'],
  ['cn-rice-noodle','河粉(煮)','grain',110,1.5,0.2,25.0,0.6,20,200,'hfz'],
  ['cn-lotus-root','莲藕','vegetable',47,1.9,0.2,11.5,1.2,44,150,'lo'],
  ['cn-pumpkin','南瓜','vegetable',23,0.7,0.1,5.3,0.8,1,150,'ng'],
  ['cn-wax-gourd','冬瓜','vegetable',10,0.4,0.2,2.6,0.7,2,200,'dg'],
  ['cn-eggplant','茄子','vegetable',25,1.0,0.2,5.7,3.4,2,150,'qz'],
  ['cn-rape','油菜','vegetable',18,1.8,0.5,3.8,1.1,55,150,'yc'],
  ['cn-choy-sum','菜心','vegetable',20,2.8,0.4,3.5,1.7,33,150,'cx'],
  ['cn-water-spinach','空心菜','vegetable',23,2.2,0.3,4.3,1.4,94,150,'kxc'],
  ['cn-bean-sprout','绿豆芽','vegetable',18,2.1,0.1,2.9,0.8,4,150,'ldy'],
  ['cn-garlic-chive','韭菜','vegetable',25,2.4,0.4,4.5,1.4,8,100,'jc'],
  ['cn-white-radish','白萝卜','vegetable',16,0.7,0.1,4.0,1.6,31,150,'blb'],
  ['cn-onion','洋葱','vegetable',40,1.1,0.1,9.3,1.7,4,100,'yc'],
  ['cn-garlic','大蒜','vegetable',128,4.5,0.2,27.6,1.1,19,10,'ds'],
  ['cn-pear','梨','fruit',51,0.3,0.1,13.3,2.6,2,200,'l'],
  ['cn-peach','桃','fruit',42,0.6,0.1,10.1,1.0,2,200,'t'],
  ['cn-mandarin','橘子','fruit',43,0.8,0.1,10.2,0.5,1,150,'jz'],
  ['cn-pomelo','柚子','fruit',42,0.8,0.2,9.5,0.4,3,250,'yz'],
  ['cn-mango','芒果','fruit',35,0.6,0.2,8.3,1.3,3,200,'mg'],
  ['cn-lychee','荔枝','fruit',71,0.9,0.2,16.6,0.5,2,150,'lz'],
  ['cn-pork-rib','猪排骨','livestock',278,16.7,23.1,0.7,0,44,100,'zpg'],
  ['cn-pork-liver','猪肝','livestock',129,19.3,3.5,5.0,0,68,75,'zg'],
  ['cn-duck','鸭肉','livestock',240,15.5,19.7,0.2,0,69,100,'yr'],
  ['cn-mutton','羊肉(瘦)','livestock',118,20.5,3.9,0.2,0,80,100,'yrs'],
  ['cn-crucian','鲫鱼','aquatic',108,17.1,2.7,3.8,0,41,120,'jy'],
  ['cn-bass','鲈鱼','aquatic',105,18.6,3.4,0,0,144,120,'ly'],
  ['cn-hairtail','带鱼','aquatic',127,17.7,4.9,3.1,0,150,100,'dy'],
  ['cn-clam','蛤蜊','aquatic',62,10.1,1.1,2.8,0,425,150,'gl'],
  ['cn-soybean','黄豆(干)','soyNuts',390,35.0,16.0,34.2,15.5,2,30,'hdg'],
  ['cn-redbean','红豆(干)','soyNuts',324,20.2,0.6,63.4,7.7,2,30,'hdg'],
  ['cn-mungbean','绿豆(干)','soyNuts',329,21.6,0.8,62.0,6.4,3,30,'ldg'],
  ['cn-yuba','腐竹(干)','soyNuts',461,44.6,21.7,22.3,1.0,26,50,'fzg'],
  ['cn-thick-soymilk','豆浆','soyNuts',31,3.0,1.6,1.2,1.1,4,250,'dj'],
  ['cn-cashew','腰果','soyNuts',559,17.3,36.7,41.6,3.6,251,20,'yg'],
  ['cn-sesame','黑芝麻','soyNuts',559,19.1,46.1,24.0,14.0,8,10,'hzm'],
  ['cn-whole-milk','全脂牛奶','dairy',54,3.0,3.2,3.4,0,37,250,'qznn'],
  ['cn-cheese','奶酪','dairy',328,25.7,23.5,3.5,0,584,30,'nl'],
  ['cn-duck-egg','鸭蛋','egg',180,12.6,13.0,3.1,0,106,70,'yd'],
  ['cn-quail-egg','鹌鹑蛋','egg',160,12.8,11.1,2.1,0,106,50,'acd'],
  ['cn-rapeseed-oil','菜籽油','oil',899,0,99.9,0,0,0,10,'czy'],
  ['cn-peanut-oil','花生油','oil',899,0,99.9,0,0,0,10,'hsy'],
  ['cn-salt','食盐','salt',0,0,0,0,0,39300,5,'sy'],
  ['cn-soy-sauce','酱油','condiment',63,5.6,0.1,10.1,0,5757,10,'jy'],
  ['cn-vinegar','食醋','condiment',31,2.1,0.3,4.9,0,262,10,'sc'],
  ['cn-water','饮用水','water',0,0,0,0,0,0,250,'yys'],
];

const EXTRA_FOODS = CHINESE_STAPLES.map(row => Object.freeze({
  id:row[0], name:row[1], category:row[2], caloriesPer100g:row[3], proteinPer100g:row[4],
  fatPer100g:row[5], carbsPer100g:row[6], fiberPer100g:row[7], sodiumPer100g:row[8],
  servingSize:row[9], ediblePortion:100, pinyinInitials:row[10], aliases:[], source:'builtin',
}));

const NORMALIZED_LEGACY = BUILTIN_FOODS.map(food => {
  const micros = MICROS_BY_ID[food.id] || [0, 0];
  return Object.freeze(Object.assign({}, food, {
    category: CATEGORY_BY_ID[food.id] || 'other',
    fiberPer100g: micros[0], sodiumPer100g: micros[1], ediblePortion: 100,
    pinyinInitials: SEARCH_INITIALS[food.id] || '', aliases: [],
  }));
});

module.exports = Object.freeze(NORMALIZED_LEGACY.concat(EXTRA_FOODS));
