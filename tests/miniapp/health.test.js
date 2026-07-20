'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const health = require('../../miniprogram/utils/health');

test('Mifflin-St Jeor BMR uses sex, age, height and weight', () => {
  assert.equal(health.calculateBmr({sex:'male',age:30,heightCm:175,weightKg:70}), 1649);
  assert.equal(health.calculateBmr({sex:'female',age:30,heightCm:165,weightKg:55}), 1270);
});

test('BMR stays unavailable for incomplete or implausible profiles', () => {
  assert.equal(health.calculateBmr({heightCm:175,weightKg:70}), null);
  assert.equal(health.calculateBmr({sex:'male',age:5,heightCm:175,weightKg:70}), null);
});

test('macro presets convert calorie ratios into grams', () => {
  assert.deepEqual(health.macroTargetsForPreset(1600,'fatloss'),{calories:1600,carbs:160,protein:140,fat:44});
  assert.deepEqual(health.macroTargetsForPreset(1600,'balanced'),{calories:1600,carbs:200,protein:100,fat:44});
  assert.equal(health.detectMacroPreset({calories:1600,carbs:160,protein:140,fat:44}),'fatloss');
  assert.equal(health.detectMacroPreset({calories:1600,carbs:150,protein:120,fat:50}),'');
});
