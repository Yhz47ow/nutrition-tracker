const test = require('node:test');
const assert = require('node:assert/strict');
const WorkoutCore = require('../workout-core.js');

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

test('first-run migration creates workout keys and preserves nutrition data', () => {
  const storage = new MemoryStorage({ nutrition_records: '{"2026-07-13":{}}' });
  const result = WorkoutCore.load(storage);

  assert.equal(result.schemaVersion, 1);
  assert.deepEqual(result.workouts, []);
  assert.deepEqual(result.customExercises, []);
  assert.equal(storage.getItem('nutrition_records'), '{"2026-07-13":{}}');
  assert.equal(storage.getItem(WorkoutCore.STORAGE_KEYS.schemaVersion), '1');
});

test('legacy workout payload migrates to normalized versioned keys', () => {
  const storage = new MemoryStorage({
    nutrition_workout_data: JSON.stringify({
      workouts: [{ id: 'w1', date: '2026-07-13', startedAt: 1000, endedAt: 61000, exercises: [] }],
      customExercises: [{ id: 'c1', name: '器械推胸', bodyPart: '胸部' }],
    }),
  });

  const result = WorkoutCore.load(storage);
  assert.equal(result.workouts[0].duration, 60);
  assert.equal(result.customExercises[0].isCustom, true);
  assert.ok(storage.getItem(WorkoutCore.STORAGE_KEYS.workouts));
});

test('rest timer derives remaining time from end timestamp', () => {
  const timer = WorkoutCore.createRestTimer(90, { workoutId: 'w1', exerciseInstanceId: 'e1' }, 1000);

  assert.equal(WorkoutCore.getRemainingMs(timer, 31000), 60000);
  assert.equal(WorkoutCore.getRemainingMs(timer, 92000), 0);
  assert.equal(WorkoutCore.timerProgress(timer, 46000), 0.5);
});

test('pause, resume and add time keep timer accurate', () => {
  const timer = WorkoutCore.createRestTimer(90, {}, 1000);
  const paused = WorkoutCore.pauseTimer(timer, 31000);
  assert.equal(paused.paused, true);
  assert.equal(paused.remainingMs, 60000);

  const extended = WorkoutCore.addTimerSeconds(paused, 10);
  assert.equal(extended.remainingMs, 70000);

  const resumed = WorkoutCore.resumeTimer(extended, 50000);
  assert.equal(resumed.paused, false);
  assert.equal(resumed.endAt, 120000);
  assert.equal(WorkoutCore.getRemainingMs(resumed, 80000), 40000);
});

test('new set copies the latest completed weight and reps', () => {
  const exercise = WorkoutCore.createWorkoutExercise({ id: 'bench', name: '卧推', bodyPart: '胸部' }, 0);
  exercise.sets[0].weight = 80;
  exercise.sets[0].reps = 8;
  exercise.sets[0].completed = true;

  const next = WorkoutCore.createNextSet(exercise);
  assert.equal(next.setNumber, 2);
  assert.equal(next.weight, 80);
  assert.equal(next.reps, 8);
  assert.equal(next.completed, false);
});

test('cloud merge deduplicates completed workouts and custom exercises by id', () => {
  const current = {
    workouts: [{ id: 'w1', startedAt: 1000, date: '2026-07-12', exercises: [] }],
    customExercises: [{ id: 'c1', name: '动作 A', bodyPart: '背部' }],
    activeWorkout: WorkoutCore.createWorkout(5000),
    restTimer: null,
  };
  const incoming = {
    workouts: [
      { id: 'w1', startedAt: 1000, date: '2026-07-12', note: '云端更新', exercises: [] },
      { id: 'w2', startedAt: 2000, date: '2026-07-13', exercises: [] },
    ],
    customExercises: [{ id: 'c1', name: '动作 A（更新）', bodyPart: '背部' }],
  };

  const merged = WorkoutCore.mergeData(current, incoming);
  assert.equal(merged.workouts.length, 2);
  assert.equal(merged.workouts.find(item => item.id === 'w1').note, '云端更新');
  assert.equal(merged.customExercises.length, 1);
  assert.equal(merged.customExercises[0].name, '动作 A（更新）');
  assert.equal(merged.activeWorkout.id, current.activeWorkout.id);
});

test('calorie estimate uses six kcal per training minute', () => {
  assert.equal(WorkoutCore.estimateCalories(3600), 360);
  assert.equal(WorkoutCore.estimateCalories(0), 0);
});
