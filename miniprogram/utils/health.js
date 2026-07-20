'use strict';

const DEFAULT_PROFILE = Object.freeze({
  sex: '',
  age: '',
  heightCm: '',
  weightKg: '',
});

function normalizeProfile(profile) {
  const source = profile && typeof profile === 'object' ? profile : {};
  return {
    sex: source.sex === 'male' || source.sex === 'female' ? source.sex : '',
    age: source.age === '' || source.age == null ? '' : Math.max(0, Math.round(Number(source.age) || 0)),
    heightCm: source.heightCm === '' || source.heightCm == null ? '' : Math.max(0, Math.round((Number(source.heightCm) || 0) * 10) / 10),
    weightKg: source.weightKg === '' || source.weightKg == null ? '' : Math.max(0, Math.round((Number(source.weightKg) || 0) * 10) / 10),
  };
}

function calculateBmr(profile) {
  const value = normalizeProfile(profile);
  const age = Number(value.age);
  const height = Number(value.heightCm);
  const weight = Number(value.weightKg);
  if (!value.sex || age < 10 || age > 120 || height < 80 || height > 250 || weight < 20 || weight > 400) return null;
  const offset = value.sex === 'male' ? 5 : -161;
  return Math.round(10 * weight + 6.25 * height - 5 * age + offset);
}

const MACRO_PRESETS = Object.freeze({
  fatloss: Object.freeze({ carbs:0.40, protein:0.35, fat:0.25 }),
  balanced: Object.freeze({ carbs:0.50, protein:0.25, fat:0.25 }),
});

function macroTargetsForPreset(calories, mode) {
  const energy=Math.max(1,Number(calories)||1600);
  const ratios=MACRO_PRESETS[mode]||MACRO_PRESETS.balanced;
  return {
    calories:Math.round(energy),
    carbs:Math.round(energy*ratios.carbs/4),
    protein:Math.round(energy*ratios.protein/4),
    fat:Math.round(energy*ratios.fat/9),
  };
}

function detectMacroPreset(targets) {
  const source=targets||{};
  for(const mode of Object.keys(MACRO_PRESETS)) {
    const expected=macroTargetsForPreset(source.calories,mode);
    if(['carbs','protein','fat'].every(key=>Math.abs(Number(source[key])-expected[key])<=1))return mode;
  }
  return '';
}

module.exports = { DEFAULT_PROFILE, MACRO_PRESETS, normalizeProfile, calculateBmr, macroTargetsForPreset, detectMacroPreset };
