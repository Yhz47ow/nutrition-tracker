'use strict';

const health = require('./health');

const KEYS = Object.freeze({
  schemaVersion: 'localSchemaVersion',
  dietRecords: 'dietRecords',
  customFoods: 'customFoods',
  mealTemplates: 'mealTemplates',
  favoriteFoods: 'favoriteFoods',
  userSettings: 'userSettings',
  workoutHistory: 'workoutHistory',
  workoutPlans: 'workoutPlans',
  exerciseLibrary: 'exerciseLibrary',
  activeWorkout: 'activeWorkout',
  restTimer: 'restTimer',
});

const DEFAULT_SETTINGS = Object.freeze({
  targets: { calories: 1600, carbs: 160, protein: 120, fat: 44 },
  theme: 'system',
  profile: health.DEFAULT_PROFILE,
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function read(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    return value === '' || value == null ? clone(fallback) : value;
  } catch (error) {
    return clone(fallback);
  }
}

function write(key, value) {
  wx.setStorageSync(key, value);
  return value;
}

function remove(key) {
  try { wx.removeStorageSync(key); } catch (error) {}
}

function initialize() {
  let version = read(KEYS.schemaVersion, 0);
  if (!version) {
    write(KEYS.dietRecords, {});
    write(KEYS.customFoods, []);
    write(KEYS.mealTemplates, []);
    write(KEYS.favoriteFoods, []);
    write(KEYS.userSettings, clone(DEFAULT_SETTINGS));
    write(KEYS.workoutHistory, []);
    write(KEYS.workoutPlans, []);
    write(KEYS.exerciseLibrary, []);
    write(KEYS.schemaVersion, 1);
    version = 1;
  }
  const settings = read(KEYS.userSettings, DEFAULT_SETTINGS);
  settings.targets = Object.assign({}, DEFAULT_SETTINGS.targets, settings.targets || {});
  settings.profile = health.normalizeProfile(settings.profile);
  settings.theme = version < 2
    ? (settings.theme === 'dark' ? 'dark' : 'system')
    : (['system', 'dark', 'light'].includes(settings.theme) ? settings.theme : 'system');
  write(KEYS.userSettings, settings);
  if (version < 4) {
    const mealTemplates = read(KEYS.mealTemplates, []);
    const favoriteFoods = read(KEYS.favoriteFoods, []);
    write(KEYS.mealTemplates, Array.isArray(mealTemplates) ? mealTemplates : []);
    write(KEYS.favoriteFoods, Array.isArray(favoriteFoods) ? favoriteFoods : []);
  }
  if (version < 5) {
    const workoutPlans=read(KEYS.workoutPlans,[]);
    write(KEYS.workoutPlans,Array.isArray(workoutPlans)?workoutPlans:[]);
  }
  write(KEYS.schemaVersion, 5);
}

function getDietState() {
  return {
    records: read(KEYS.dietRecords, {}),
    customFoods: read(KEYS.customFoods, []),
    mealTemplates: read(KEYS.mealTemplates, []),
    favoriteFoods: read(KEYS.favoriteFoods, []),
    settings: read(KEYS.userSettings, DEFAULT_SETTINGS),
  };
}

function saveDietState(state) {
  write(KEYS.dietRecords, state.records || {});
  write(KEYS.customFoods, state.customFoods || []);
  write(KEYS.mealTemplates, state.mealTemplates || []);
  write(KEYS.favoriteFoods, state.favoriteFoods || []);
  if (state.settings) write(KEYS.userSettings, state.settings);
}

function getWorkoutState() {
  return {
    workouts: read(KEYS.workoutHistory, []),
    plans: read(KEYS.workoutPlans, []),
    customExercises: read(KEYS.exerciseLibrary, []),
    activeWorkout: read(KEYS.activeWorkout, null),
    restTimer: read(KEYS.restTimer, null),
  };
}

function saveWorkoutState(state) {
  write(KEYS.workoutHistory, state.workouts || []);
  write(KEYS.workoutPlans, state.plans || []);
  write(KEYS.exerciseLibrary, state.customExercises || []);
  if (state.activeWorkout) write(KEYS.activeWorkout, state.activeWorkout);
  else remove(KEYS.activeWorkout);
  if (state.restTimer) write(KEYS.restTimer, state.restTimer);
  else remove(KEYS.restTimer);
}

function mergeRecords(current, incoming) {
  const next = clone(current || {});
  Object.keys(incoming || {}).forEach(date => {
    const target = next[date] || { breakfast: [], lunch: [], dinner: [], snack: [] };
    ['breakfast', 'lunch', 'dinner', 'snack'].forEach(meal => {
      const map = new Map((incoming[date][meal] || []).map(item => [String(item.id), item]));
      (target[meal] || []).forEach(item => map.set(String(item.id), item));
      target[meal] = Array.from(map.values());
    });
    next[date] = target;
  });
  return next;
}

function mergeById(current, incoming) {
  const map = new Map();
  (incoming || []).forEach(item => map.set(String(item.id), item));
  (current || []).forEach(item => map.set(String(item.id), item));
  return Array.from(map.values());
}

function createBackup() {
  const diet = getDietState();
  const workout = getWorkoutState();
  return {
    version: 7,
    platform: 'wechat-mini-program',
    exportedAt: new Date().toISOString(),
    dietRecords: diet.records,
    customFoods: diet.customFoods,
    mealTemplates: diet.mealTemplates,
    favoriteFoods: diet.favoriteFoods,
    userSettings: diet.settings,
    workoutHistory: workout.workouts,
    workoutPlans: workout.plans,
    exerciseLibrary: workout.customExercises,
    activeWorkout: workout.activeWorkout,
    restTimer: workout.restTimer,
  };
}

function importBackup(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('备份文件格式不正确');
  const currentDiet = getDietState();
  const currentWorkout = getWorkoutState();

  const incomingRecords = payload.dietRecords || payload.records || {};
  const incomingSettings = payload.userSettings || (payload.targets ? { targets: payload.targets } : {});
  const incomingWorkouts = payload.workoutHistory || payload.workouts || [];
  const incomingPlans = payload.workoutPlans || payload.plans || [];
  const incomingExercises = payload.exerciseLibrary || payload.customExercises || [];

  const settings = Object.assign({}, currentDiet.settings, incomingSettings);
  settings.targets = Object.assign({}, DEFAULT_SETTINGS.targets, currentDiet.settings.targets || {}, incomingSettings.targets || {});
  settings.profile = health.normalizeProfile(incomingSettings.profile || currentDiet.settings.profile);
  settings.theme = ['system', 'dark', 'light'].includes(settings.theme) ? settings.theme : 'system';
  saveDietState({
    records: mergeRecords(currentDiet.records, incomingRecords),
    customFoods: mergeById(currentDiet.customFoods, payload.customFoods || []),
    mealTemplates: mergeById(currentDiet.mealTemplates, payload.mealTemplates || []),
    favoriteFoods: Array.from(new Set((currentDiet.favoriteFoods || []).concat(payload.favoriteFoods || []).map(String))),
    settings,
  });
  saveWorkoutState({
    workouts: mergeById(currentWorkout.workouts, incomingWorkouts),
    plans: mergeById(currentWorkout.plans, incomingPlans),
    customExercises: mergeById(currentWorkout.customExercises, incomingExercises),
    activeWorkout: currentWorkout.activeWorkout || payload.activeWorkout || null,
    restTimer: currentWorkout.restTimer || payload.restTimer || null,
  });
  return createBackup();
}

function clearUserData() {
  Object.values(KEYS).forEach(remove);
  initialize();
}

module.exports = {
  KEYS,
  DEFAULT_SETTINGS,
  clone,
  read,
  write,
  remove,
  initialize,
  getDietState,
  saveDietState,
  getWorkoutState,
  saveWorkoutState,
  createBackup,
  importBackup,
  clearUserData,
};
