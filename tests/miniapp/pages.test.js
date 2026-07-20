'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

function createRuntime() {
  const values = new Map();
  const app = { globalData: { pendingFood:null, pendingDish:null, pendingMeal:'lunch', pendingDate:'', editFoodId:'', editMealTemplateId:'', editExerciseId:'', openFoodLibraryForEntry:false, systemTheme:'dark', resolvedTheme:'dark' } };
  global.wx = {
    env: { USER_DATA_PATH:'/tmp' },
    getStorageSync(key) { return values.has(key) ? values.get(key) : ''; },
    setStorageSync(key, value) { values.set(key, value); },
    removeStorageSync(key) { values.delete(key); },
    setNavigationBarColor() {},
    setBackgroundColor() {},
    setTabBarStyle() {},
    getSystemInfoSync() { return { theme:'dark' }; },
    getWindowInfo() { return { pixelRatio:2 }; },
    createInnerAudioContext() { return { src:'', play(){}, stop(){}, destroy(){} }; },
    showModal() {},
    showToast() {},
    navigateBack() {},
    navigateTo() {},
    switchTab() {},
    vibrateLong() {},
  };
  global.getApp = () => app;
  global.setInterval = () => 1;
  global.clearInterval = () => {};
  return { values, app };
}

function setPath(target, key, value) {
  const parts = key.split('.');
  let cursor = target;
  while (parts.length > 1) {
    const part = parts.shift();
    cursor[part] = cursor[part] || {};
    cursor = cursor[part];
  }
  cursor[parts[0]] = value;
}

function loadPage(relativePath) {
  let definition;
  global.Page = config => { definition = config; };
  const absolute = path.resolve(__dirname, '../../miniprogram/pages', relativePath, `${relativePath}.js`);
  delete require.cache[absolute];
  require(absolute);
  const page = Object.assign({}, definition, { data: JSON.parse(JSON.stringify(definition.data || {})) });
  page.setData = (values, callback) => {
    Object.entries(values).forEach(([key, value]) => setPath(page.data, key, value));
    if (callback) callback();
  };
  return page;
}

test('all mini program pages initialize with local data only', () => {
  const runtime = createRuntime();
  const storage = require('../../miniprogram/utils/storage');
  storage.initialize();

  for (const name of ['home','library','workout','records','settings']) {
    const page = loadPage(name);
    page.onShow();
    assert.equal(page.data.themeClass, 'dark-theme', `${name} theme initialized`);
  }

  runtime.app.globalData.pendingFood = require('../../miniprogram/utils/foods')[0];
  runtime.app.globalData.pendingDish = require('../../miniprogram/data/dishDatabase')[0];
  for (const name of ['food-entry','dish-entry','custom-food','meal-form','nutrition-plan','exercise-form','training']) {
    const page = loadPage(name);
    page.onLoad();
    assert.ok(page.data, `${name} initialized`);
    if (page.onUnload) page.onUnload();
  }
});

test('custom food form keeps category internal instead of asking the user', () => {
  const source=fs.readFileSync(path.resolve(__dirname,'../../miniprogram/pages/custom-food/custom-food.wxml'),'utf8');
  assert.equal(source.includes('膳食类别'),false);
  assert.equal(source.includes('拼音首字母'),false);
  createRuntime();
  const page=loadPage('custom-food');
  page.onLoad();
  assert.equal(page.data.form.category,'other');
});

test('home owns the nutrition plan entry and uses the centered compact heading',()=>{
  const home=fs.readFileSync(path.resolve(__dirname,'../../miniprogram/pages/home/home.wxml'),'utf8');
  const settings=fs.readFileSync(path.resolve(__dirname,'../../miniprogram/pages/settings/settings.wxml'),'utf8');
  assert.equal(home.includes('今日概览'),false);
  assert.equal(home.includes('营养与训练追踪'),true);
  assert.equal(home.includes('bindtap="openNutritionPlan"'),true);
  assert.equal(settings.includes('编辑周期饮食计划'),false);
  assert.equal(settings.includes('默认营养目标'),false);
  assert.equal(settings.includes('训练日与休息日'),false);
});
