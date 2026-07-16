'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function createWxMock() {
  const values = new Map();
  return {
    getStorageSync(key) { return values.has(key) ? values.get(key) : ''; },
    setStorageSync(key, value) { values.set(key, value); },
    removeStorageSync(key) { values.delete(key); },
  };
}

test('workout state uses local collections and preset body-part groups', () => {
  global.wx = createWxMock();
  const storage = require('../../miniprogram/utils/storage');
  const workout = require('../../miniprogram/utils/workout-data');
  storage.initialize();
  const state = workout.load();
  assert.equal(workout.PRESET_EXERCISES.length, 33);
  assert.deepEqual(new Set(workout.PRESET_EXERCISES.map(item => item.bodyPart)), new Set(['胸部','背部','腿部','肩部','手臂','核心']));
  state.customExercises.push({id:'custom',name:'地雷管划船',bodyPart:'背部',note:'测试',isCustom:true});
  workout.save(state);
  assert.equal(workout.load().customExercises[0].name, '地雷管划船');
});

test('active workout and timestamp timer survive storage reload', () => {
  global.wx = createWxMock();
  const storage = require('../../miniprogram/utils/storage');
  const workout = require('../../miniprogram/utils/workout-data');
  storage.initialize();
  const state = workout.load();
  state.activeWorkout = workout.Core.createWorkout(1000);
  state.activeWorkout.exercises.push(workout.Core.createWorkoutExercise(workout.PRESET_EXERCISES[0], 0));
  state.restTimer = workout.Core.createRestTimer(90, {workoutId:state.activeWorkout.id,exerciseInstanceId:state.activeWorkout.exercises[0].id}, 2000);
  workout.save(state);
  const restored = workout.load();
  assert.equal(restored.activeWorkout.exercises[0].exerciseName, '杠铃卧推');
  assert.equal(workout.Core.getRemainingMs(restored.restTimer, 32000), 60000);
});
