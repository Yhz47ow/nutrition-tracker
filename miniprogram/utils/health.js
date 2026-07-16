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

module.exports = { DEFAULT_PROFILE, normalizeProfile, calculateBmr };
