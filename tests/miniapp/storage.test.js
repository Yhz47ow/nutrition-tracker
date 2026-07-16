'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function createWxMock() {
  const values = new Map();
  return {
    values,
    getStorageSync(key) { return values.has(key) ? values.get(key) : ''; },
    setStorageSync(key, value) { values.set(key, value); },
    removeStorageSync(key) { values.delete(key); },
  };
}

test('initialization creates plain local storage collections', () => {
  global.wx = createWxMock();
  const storage = require('../../miniprogram/utils/storage');
  storage.initialize();
  assert.deepEqual(wx.getStorageSync('dietRecords'), {});
  assert.deepEqual(wx.getStorageSync('workoutHistory'), []);
  assert.deepEqual(wx.getStorageSync('exerciseLibrary'), []);
  assert.equal(wx.getStorageSync('userSettings').targets.protein, 120);
  assert.equal(wx.getStorageSync('userSettings').theme, 'system');
});

test('theme preference supports system, dark and light modes', () => {
  global.wx = Object.assign(createWxMock(), {
    getSystemInfoSync() { return { theme:'dark' }; },
    setNavigationBarColor() {},
    setBackgroundColor() {},
    setTabBarStyle() {},
  });
  global.getApp = () => ({ globalData:{ systemTheme:'dark' } });
  const storage = require('../../miniprogram/utils/storage');
  const theme = require('../../miniprogram/utils/theme');
  storage.initialize();
  assert.equal(theme.current(), 'dark');
  const state = storage.getDietState();
  state.settings.theme = 'light';
  storage.saveDietState(state);
  assert.equal(theme.apply(), 'light-theme');
});

test('version one default theme migrates to follow system', () => {
  global.wx = createWxMock();
  wx.setStorageSync('localSchemaVersion', 1);
  wx.setStorageSync('userSettings', {targets:{calories:1800},theme:'light'});
  const storage = require('../../miniprogram/utils/storage');
  storage.initialize();
  assert.equal(wx.getStorageSync('localSchemaVersion'), 2);
  assert.equal(wx.getStorageSync('userSettings').theme, 'system');
  assert.equal(wx.getStorageSync('userSettings').targets.calories, 1800);
});

test('legacy PWA backup imports without replacing current records', () => {
  global.wx = createWxMock();
  const storage = require('../../miniprogram/utils/storage');
  storage.initialize();
  storage.saveDietState({
    records: {'2026-07-15': {breakfast:[{id:'local',foodName:'鸡蛋'}],lunch:[],dinner:[],snack:[]}},
    customFoods: [],
    settings: storage.DEFAULT_SETTINGS,
  });
  storage.importBackup({
    records: {'2026-07-15': {breakfast:[{id:'imported',foodName:'牛奶'}],lunch:[],dinner:[],snack:[]}},
    customFoods: [{id:'custom-1',name:'测试食物'}],
    targets: {calories: 2000},
    workouts: [{id:'workout-1',date:'2026-07-15'}],
    customExercises: [{id:'exercise-1',name:'测试动作'}],
  });
  const backup = storage.createBackup();
  assert.equal(backup.dietRecords['2026-07-15'].breakfast.length, 2);
  assert.equal(backup.customFoods[0].id, 'custom-1');
  assert.equal(backup.userSettings.targets.calories, 2000);
  assert.equal(backup.workoutHistory[0].id, 'workout-1');
  assert.equal(backup.exerciseLibrary[0].id, 'exercise-1');
});
