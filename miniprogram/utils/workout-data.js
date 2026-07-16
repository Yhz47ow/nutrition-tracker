'use strict';

const Core = require('./workout-core');
const storage = require('./storage');

const BODY_PARTS = ['全部', '胸部', '背部', '腿部', '肩部', '手臂', '核心', '其他'];
const BODY_PART_SHORT = { 胸部:'胸', 背部:'背', 腿部:'腿', 肩部:'肩', 手臂:'臂', 核心:'核', 其他:'其' };
const PRESET_EXERCISES = Object.freeze([
  {id:'chest-bench-press',name:'杠铃卧推',bodyPart:'胸部',note:'胸大肌、肱三头肌'},
  {id:'chest-incline-dumbbell-press',name:'上斜哑铃卧推',bodyPart:'胸部',note:'上胸、肱三头肌'},
  {id:'chest-dumbbell-fly',name:'哑铃飞鸟',bodyPart:'胸部',note:'胸大肌'},
  {id:'chest-push-up',name:'俯卧撑',bodyPart:'胸部',note:'胸部、肩前束'},
  {id:'chest-cable-crossover',name:'绳索夹胸',bodyPart:'胸部',note:'胸大肌'},
  {id:'back-pull-up',name:'引体向上',bodyPart:'背部',note:'背阔肌、肱二头肌'},
  {id:'back-lat-pulldown',name:'高位下拉',bodyPart:'背部',note:'背阔肌'},
  {id:'back-barbell-row',name:'杠铃划船',bodyPart:'背部',note:'背阔肌、斜方肌'},
  {id:'back-seated-row',name:'坐姿绳索划船',bodyPart:'背部',note:'中背部'},
  {id:'back-one-arm-row',name:'单臂哑铃划船',bodyPart:'背部',note:'背阔肌'},
  {id:'legs-back-squat',name:'杠铃深蹲',bodyPart:'腿部',note:'股四头肌、臀部'},
  {id:'legs-leg-press',name:'腿举',bodyPart:'腿部',note:'股四头肌、臀部'},
  {id:'legs-romanian-deadlift',name:'罗马尼亚硬拉',bodyPart:'腿部',note:'腘绳肌、臀部'},
  {id:'legs-lunge',name:'哑铃弓步',bodyPart:'腿部',note:'股四头肌、臀部'},
  {id:'legs-leg-extension',name:'腿屈伸',bodyPart:'腿部',note:'股四头肌'},
  {id:'legs-leg-curl',name:'腿弯举',bodyPart:'腿部',note:'腘绳肌'},
  {id:'legs-calf-raise',name:'站姿提踵',bodyPart:'腿部',note:'小腿'},
  {id:'shoulders-overhead-press',name:'杠铃推举',bodyPart:'肩部',note:'三角肌、肱三头肌'},
  {id:'shoulders-dumbbell-press',name:'哑铃肩推',bodyPart:'肩部',note:'三角肌'},
  {id:'shoulders-lateral-raise',name:'哑铃侧平举',bodyPart:'肩部',note:'三角肌中束'},
  {id:'shoulders-rear-delt-fly',name:'俯身反向飞鸟',bodyPart:'肩部',note:'三角肌后束'},
  {id:'shoulders-face-pull',name:'绳索面拉',bodyPart:'肩部',note:'三角肌后束、上背'},
  {id:'arms-barbell-curl',name:'杠铃弯举',bodyPart:'手臂',note:'肱二头肌'},
  {id:'arms-dumbbell-curl',name:'哑铃弯举',bodyPart:'手臂',note:'肱二头肌'},
  {id:'arms-hammer-curl',name:'锤式弯举',bodyPart:'手臂',note:'肱肌、肱二头肌'},
  {id:'arms-triceps-pushdown',name:'绳索下压',bodyPart:'手臂',note:'肱三头肌'},
  {id:'arms-skull-crusher',name:'仰卧臂屈伸',bodyPart:'手臂',note:'肱三头肌'},
  {id:'arms-dips',name:'双杠臂屈伸',bodyPart:'手臂',note:'肱三头肌、胸部'},
  {id:'core-plank',name:'平板支撑',bodyPart:'核心',note:'核心稳定'},
  {id:'core-crunch',name:'卷腹',bodyPart:'核心',note:'腹直肌'},
  {id:'core-hanging-leg-raise',name:'悬垂举腿',bodyPart:'核心',note:'下腹、髋屈肌'},
  {id:'core-russian-twist',name:'俄罗斯转体',bodyPart:'核心',note:'腹斜肌'},
  {id:'core-ab-wheel',name:'健腹轮',bodyPart:'核心',note:'腹部、核心稳定'},
]);

function load() {
  const raw = storage.getWorkoutState();
  return {
    workouts: (raw.workouts || []).map(Core.normalizeWorkout),
    customExercises: (raw.customExercises || []).map(Core.normalizeCustomExercise).filter(item => item.name),
    activeWorkout: raw.activeWorkout ? Core.normalizeWorkout(raw.activeWorkout) : null,
    restTimer: Core.normalizeTimer(raw.restTimer),
  };
}

function save(state) {
  storage.saveWorkoutState({
    workouts: (state.workouts || []).map(Core.normalizeWorkout),
    customExercises: (state.customExercises || []).map(Core.normalizeCustomExercise),
    activeWorkout: state.activeWorkout ? Core.normalizeWorkout(state.activeWorkout) : null,
    restTimer: Core.normalizeTimer(state.restTimer),
  });
}

function allExercises(state) {
  return PRESET_EXERCISES.concat(state && state.customExercises || []);
}

function findExercise(state, id) {
  return allExercises(state).find(item => item.id === id);
}

function workoutParts(workout) {
  const parts = Array.from(new Set((workout && workout.exercises || []).map(item => item.bodyPart).filter(Boolean)));
  return parts.length ? parts.join('、') : '未添加动作';
}

function completedSets(workout) {
  return (workout && workout.exercises || []).reduce((sum, item) => sum + (item.sets || []).filter(set => set.completed).length, 0);
}

function recentTrend(workouts, exerciseId, name, limit = 8) {
  return [...(workouts || [])].sort((a, b) => b.startedAt - a.startedAt).map(workout => {
    const exercise = (workout.exercises || []).find(item => item.exerciseId === exerciseId || item.exerciseName === name);
    if (!exercise) return null;
    const done = (exercise.sets || []).filter(set => set.completed);
    if (!done.length) return null;
    const best = done.reduce((current, set) => Number(set.weight) > Number(current.weight) ? set : current, done[0]);
    return { date: workout.date, weight: best.weight, reps: best.reps };
  }).filter(Boolean).slice(0, limit).reverse();
}

module.exports = {
  Core,
  BODY_PARTS,
  BODY_PART_SHORT,
  PRESET_EXERCISES,
  load,
  save,
  allExercises,
  findExercise,
  workoutParts,
  completedSets,
  recentTrend,
};
