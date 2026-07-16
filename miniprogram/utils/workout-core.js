(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.WorkoutCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const SCHEMA_VERSION = 1;
  const STORAGE_KEYS = Object.freeze({
    schemaVersion: 'nutrition_workout_schema_version',
    workouts: 'nutrition_workouts_v1',
    customExercises: 'nutrition_custom_exercises_v1',
    activeWorkout: 'nutrition_active_workout_v1',
    restTimer: 'nutrition_rest_timer_v1',
    legacy: 'nutrition_workout_data',
  });

  function toFiniteNumber(value, fallback){
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function createId(prefix, now){
    const timestamp = Number.isFinite(now) ? now : Date.now();
    return `${prefix}_${timestamp.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function localDateKey(value){
    const date = value instanceof Date ? value : new Date(value == null ? Date.now() : value);
    if(Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function normalizeSet(set, index){
    const source = set && typeof set === 'object' ? set : {};
    return {
      id: String(source.id || createId('set')),
      setNumber: Math.max(1, Math.round(toFiniteNumber(source.setNumber, index + 1))),
      weight: Math.max(0, toFiniteNumber(source.weight, 0)),
      reps: Math.max(0, Math.round(toFiniteNumber(source.reps, 0))),
      completed: Boolean(source.completed),
      completedAt: source.completedAt ? toFiniteNumber(source.completedAt, null) : null,
    };
  }

  function normalizeWorkoutExercise(exercise, index){
    const source = exercise && typeof exercise === 'object' ? exercise : {};
    const sets = Array.isArray(source.sets) ? source.sets.map(normalizeSet) : [];
    return {
      id: String(source.id || createId('workout_exercise')),
      exerciseId: String(source.exerciseId || ''),
      exerciseName: String(source.exerciseName || source.name || '未命名动作').trim() || '未命名动作',
      bodyPart: String(source.bodyPart || '其他'),
      restBetweenSets: clamp(Math.round(toFiniteNumber(source.restBetweenSets, 90)), 10, 600),
      order: Math.max(0, Math.round(toFiniteNumber(source.order, index))),
      sets,
    };
  }

  function normalizeWorkout(workout){
    const source = workout && typeof workout === 'object' ? workout : {};
    const startedAt = toFiniteNumber(source.startedAt, Date.now());
    const endedAt = source.endedAt == null ? null : toFiniteNumber(source.endedAt, null);
    const duration = Math.max(0, Math.round(toFiniteNumber(
      source.duration,
      endedAt == null ? 0 : (endedAt - startedAt) / 1000
    )));
    return {
      id: String(source.id || createId('workout', startedAt)),
      date: String(source.date || localDateKey(startedAt)),
      startedAt,
      endedAt,
      duration,
      note: String(source.note || ''),
      estimatedCalories: Math.max(0, Math.round(toFiniteNumber(source.estimatedCalories, estimateCalories(duration)))),
      exercises: Array.isArray(source.exercises) ? source.exercises.map(normalizeWorkoutExercise) : [],
      currentExerciseIndex: Math.max(0, Math.round(toFiniteNumber(source.currentExerciseIndex, 0))),
    };
  }

  function normalizeCustomExercise(exercise){
    const source = exercise && typeof exercise === 'object' ? exercise : {};
    return {
      id: String(source.id || createId('custom_exercise')),
      name: String(source.name || '').trim(),
      bodyPart: String(source.bodyPart || '其他'),
      note: String(source.note || '').trim(),
      isCustom: true,
    };
  }

  function normalizeTimer(timer){
    if(!timer || typeof timer !== 'object') return null;
    const durationMs = clamp(Math.round(toFiniteNumber(timer.durationMs, 90000)), 10000, 600000);
    const paused = Boolean(timer.paused);
    return {
      id: String(timer.id || createId('rest')),
      workoutId: String(timer.workoutId || ''),
      exerciseInstanceId: String(timer.exerciseInstanceId || ''),
      startedAt: toFiniteNumber(timer.startedAt, Date.now()),
      endAt: toFiniteNumber(timer.endAt, Date.now() + durationMs),
      durationMs,
      paused,
      remainingMs: paused ? clamp(Math.round(toFiniteNumber(timer.remainingMs, durationMs)), 0, 600000) : null,
      completed: Boolean(timer.completed),
    };
  }

  function createWorkout(now){
    const startedAt = Number.isFinite(now) ? now : Date.now();
    return normalizeWorkout({
      id: createId('workout', startedAt),
      date: localDateKey(startedAt),
      startedAt,
      exercises: [],
    });
  }

  function createWorkoutExercise(exercise, order){
    return normalizeWorkoutExercise({
      id: createId('workout_exercise'),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      bodyPart: exercise.bodyPart,
      restBetweenSets: 90,
      order: toFiniteNumber(order, 0),
      sets: [{ id: createId('set'), setNumber: 1, weight: 0, reps: 0, completed: false }],
    }, toFiniteNumber(order, 0));
  }

  function createNextSet(exercise){
    const sets = Array.isArray(exercise && exercise.sets) ? exercise.sets : [];
    const previous = [...sets].reverse().find(set => set.completed) || sets[sets.length - 1] || {};
    return normalizeSet({
      id: createId('set'),
      setNumber: sets.length + 1,
      weight: toFiniteNumber(previous.weight, 0),
      reps: toFiniteNumber(previous.reps, 0),
      completed: false,
    }, sets.length);
  }

  function createRestTimer(durationSeconds, meta, now){
    const startedAt = Number.isFinite(now) ? now : Date.now();
    const durationMs = clamp(Math.round(toFiniteNumber(durationSeconds, 90) * 1000), 10000, 600000);
    return normalizeTimer({
      id: createId('rest', startedAt),
      workoutId: meta && meta.workoutId,
      exerciseInstanceId: meta && meta.exerciseInstanceId,
      startedAt,
      endAt: startedAt + durationMs,
      durationMs,
    });
  }

  function getRemainingMs(timer, now){
    const normalized = normalizeTimer(timer);
    if(!normalized || normalized.completed) return 0;
    if(normalized.paused) return Math.max(0, normalized.remainingMs || 0);
    const current = Number.isFinite(now) ? now : Date.now();
    return Math.max(0, normalized.endAt - current);
  }

  function pauseTimer(timer, now){
    const normalized = normalizeTimer(timer);
    if(!normalized || normalized.paused || normalized.completed) return normalized;
    normalized.remainingMs = getRemainingMs(normalized, now);
    normalized.paused = true;
    return normalized;
  }

  function resumeTimer(timer, now){
    const normalized = normalizeTimer(timer);
    if(!normalized || !normalized.paused || normalized.completed) return normalized;
    const current = Number.isFinite(now) ? now : Date.now();
    normalized.startedAt = current;
    normalized.endAt = current + (normalized.remainingMs || 0);
    normalized.durationMs = Math.max(normalized.durationMs, normalized.remainingMs || 0);
    normalized.remainingMs = null;
    normalized.paused = false;
    return normalized;
  }

  function addTimerSeconds(timer, seconds){
    const normalized = normalizeTimer(timer);
    if(!normalized || normalized.completed) return normalized;
    const delta = Math.round(toFiniteNumber(seconds, 0) * 1000);
    normalized.durationMs = clamp(normalized.durationMs + Math.max(0, delta), 10000, 600000);
    if(normalized.paused){
      normalized.remainingMs = clamp((normalized.remainingMs || 0) + delta, 0, 600000);
    }else{
      normalized.endAt += delta;
    }
    return normalized;
  }

  function timerProgress(timer, now){
    const normalized = normalizeTimer(timer);
    if(!normalized) return 0;
    return clamp(getRemainingMs(normalized, now) / Math.max(1, normalized.durationMs), 0, 1);
  }

  function estimateCalories(durationSeconds, coefficient){
    const perMinute = toFiniteNumber(coefficient, 6);
    return Math.max(0, Math.round((Math.max(0, toFiniteNumber(durationSeconds, 0)) / 60) * perMinute));
  }

  function formatDuration(durationSeconds){
    const total = Math.max(0, Math.round(toFiniteNumber(durationSeconds, 0)));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    if(hours > 0) return `${hours}小时${minutes}分`;
    if(minutes > 0) return `${minutes}分${seconds ? `${seconds}秒` : ''}`;
    return `${seconds}秒`;
  }

  function safeParse(value, fallback){
    try{
      const parsed = JSON.parse(value);
      return parsed == null ? fallback : parsed;
    }catch(error){
      return fallback;
    }
  }

  function load(storage){
    const empty = { schemaVersion: SCHEMA_VERSION, workouts: [], customExercises: [], activeWorkout: null, restTimer: null };
    if(!storage || typeof storage.getItem !== 'function') return empty;

    const legacy = safeParse(storage.getItem(STORAGE_KEYS.legacy), null);
    const workoutSource = safeParse(storage.getItem(STORAGE_KEYS.workouts), legacy && legacy.workouts);
    const customSource = safeParse(storage.getItem(STORAGE_KEYS.customExercises), legacy && legacy.customExercises);
    const activeSource = safeParse(storage.getItem(STORAGE_KEYS.activeWorkout), legacy && legacy.activeWorkout);
    const timerSource = safeParse(storage.getItem(STORAGE_KEYS.restTimer), legacy && legacy.restTimer);

    const data = {
      schemaVersion: SCHEMA_VERSION,
      workouts: Array.isArray(workoutSource) ? workoutSource.map(normalizeWorkout) : [],
      customExercises: Array.isArray(customSource) ? customSource.map(normalizeCustomExercise).filter(item => item.name) : [],
      activeWorkout: activeSource ? normalizeWorkout(activeSource) : null,
      restTimer: normalizeTimer(timerSource),
    };
    persist(storage, data);
    return data;
  }

  function persist(storage, data){
    if(!storage || typeof storage.setItem !== 'function') return;
    storage.setItem(STORAGE_KEYS.schemaVersion, String(SCHEMA_VERSION));
    storage.setItem(STORAGE_KEYS.workouts, JSON.stringify((data.workouts || []).map(normalizeWorkout)));
    storage.setItem(STORAGE_KEYS.customExercises, JSON.stringify((data.customExercises || []).map(normalizeCustomExercise)));
    if(data.activeWorkout){
      storage.setItem(STORAGE_KEYS.activeWorkout, JSON.stringify(normalizeWorkout(data.activeWorkout)));
    }else if(typeof storage.removeItem === 'function'){
      storage.removeItem(STORAGE_KEYS.activeWorkout);
    }
    if(data.restTimer){
      storage.setItem(STORAGE_KEYS.restTimer, JSON.stringify(normalizeTimer(data.restTimer)));
    }else if(typeof storage.removeItem === 'function'){
      storage.removeItem(STORAGE_KEYS.restTimer);
    }
  }

  function mergeById(current, incoming, normalize){
    const map = new Map();
    (Array.isArray(current) ? current : []).forEach(item => {
      const normalized = normalize(item);
      map.set(normalized.id, normalized);
    });
    (Array.isArray(incoming) ? incoming : []).forEach(item => {
      const normalized = normalize(item);
      map.set(normalized.id, normalized);
    });
    return Array.from(map.values());
  }

  function mergeData(current, incoming){
    const base = current || {};
    const next = incoming || {};
    return {
      schemaVersion: SCHEMA_VERSION,
      workouts: mergeById(base.workouts, next.workouts, normalizeWorkout),
      customExercises: mergeById(base.customExercises, next.customExercises, normalizeCustomExercise).filter(item => item.name),
      activeWorkout: base.activeWorkout ? normalizeWorkout(base.activeWorkout) : null,
      restTimer: normalizeTimer(base.restTimer),
    };
  }

  return Object.freeze({
    SCHEMA_VERSION,
    STORAGE_KEYS,
    clamp,
    createId,
    localDateKey,
    normalizeSet,
    normalizeWorkoutExercise,
    normalizeWorkout,
    normalizeCustomExercise,
    normalizeTimer,
    createWorkout,
    createWorkoutExercise,
    createNextSet,
    createRestTimer,
    getRemainingMs,
    pauseTimer,
    resumeTimer,
    addTimerSeconds,
    timerProgress,
    estimateCalories,
    formatDuration,
    load,
    persist,
    mergeData,
  });
});
