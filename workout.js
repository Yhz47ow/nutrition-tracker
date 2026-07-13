(function(){
  'use strict';

  if(!window.WorkoutCore){
    console.error('WorkoutCore is required before workout.js');
    return;
  }

  const Core = window.WorkoutCore;
  const BODY_PARTS = ['全部','胸部','背部','腿部','肩部','手臂','核心'];
  const BODY_PART_SHORT = {胸部:'胸',背部:'背',腿部:'腿',肩部:'肩',手臂:'臂',核心:'核',其他:'其'};
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

  let data = Core.load(window.localStorage);
  let tickHandle = null;
  let pageTimerHandle = null;
  let audioContext = null;
  let pickerSelection = new Set();
  const ui = {
    tab: 'session',
    libraryFilter: '全部',
    librarySearch: '',
    pickerSearch: '',
    historyMonth: monthKey(Date.now()),
    selectedDate: latestWorkoutDate(),
    editingExerciseId: null,
  };

  function escapeHtml(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[char]));
  }

  function escapeAttr(value){
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function monthKey(value){
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function latestWorkoutDate(){
    const latest = [...(data.workouts || [])].sort((a,b) => b.startedAt - a.startedAt)[0];
    return latest ? latest.date : Core.localDateKey();
  }

  function allExercises(){
    return [...PRESET_EXERCISES, ...(data.customExercises || [])];
  }

  function findExercise(id){
    return allExercises().find(exercise => exercise.id === id);
  }

  function persist(){
    Core.persist(window.localStorage, data);
  }

  function showToastMessage(message){
    if(typeof window.showToast === 'function') window.showToast(message);
    else window.alert(message);
  }

  function formatTime(timestamp){
    return new Date(timestamp).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
  }

  function formatDate(dateKey){
    const date = new Date(`${dateKey}T12:00:00`);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function workoutBodyParts(workout){
    const parts = [...new Set((workout.exercises || []).map(exercise => exercise.bodyPart).filter(Boolean))];
    return parts.length ? parts.join(' · ') : '未选择部位';
  }

  function completedSetCount(workout){
    return (workout.exercises || []).reduce((sum, exercise) => sum + (exercise.sets || []).filter(set => set.completed).length, 0);
  }

  function renderDashboardCard(){
    const mount = document.getElementById('workoutDashboardCard');
    if(!mount) return;
    const active = data.activeWorkout;
    const latest = [...data.workouts].sort((a,b) => b.startedAt - a.startedAt)[0];
    if(active){
      const duration = Math.max(0, Math.floor((Date.now() - active.startedAt) / 1000));
      mount.innerHTML = `<div class="workout-dashboard-card">
        <div class="workout-dashboard-head">
          <div class="workout-dashboard-icon">●</div>
          <div><div class="workout-dashboard-title">训练进行中</div><div class="workout-dashboard-sub">${escapeHtml(workoutBodyParts(active))} · ${completedSetCount(active)} 组已完成</div></div>
        </div>
        <button class="workout-start-btn" data-workout-action="open-session">继续训练 · ${escapeHtml(Core.formatDuration(duration))}</button>
      </div>`;
      return;
    }

    const recentHtml = latest ? `<div class="workout-recent-grid">
      <div class="workout-recent-stat"><div class="workout-recent-label">最近训练</div><div class="workout-recent-value">${escapeHtml(workoutBodyParts(latest))}</div></div>
      <div class="workout-recent-stat"><div class="workout-recent-label">时长</div><div class="workout-recent-value">${escapeHtml(Core.formatDuration(latest.duration))}</div></div>
      <div class="workout-recent-stat"><div class="workout-recent-label">估算消耗</div><div class="workout-recent-value">${latest.estimatedCalories} kcal</div></div>
    </div>` : `<div class="workout-dashboard-sub" style="margin-bottom:10px">还没有训练记录，今天从第一组开始。</div>`;

    mount.innerHTML = `<div class="workout-dashboard-card">
      <div class="workout-dashboard-head">
        <div class="workout-dashboard-icon">＋</div>
        <div><div class="workout-dashboard-title">力量训练</div><div class="workout-dashboard-sub">记录重量、次数和组间休息</div></div>
      </div>
      ${recentHtml}
      <button class="workout-start-btn" data-workout-action="open-session">开始训练</button>
    </div>`;
  }

  function renderWorkoutScreen(){
    const screen = document.getElementById('screen-workout');
    if(!screen) return;
    screen.innerHTML = `<div class="workout-page-head">
      <div><div class="workout-page-title">训练记录</div><div class="workout-page-caption">动作、训练与恢复</div></div>
      <button class="workout-primary-action" data-workout-action="open-session">${data.activeWorkout ? '继续训练' : '开始训练'}</button>
    </div>
    <div class="workout-segments">
      <button class="${ui.tab === 'session' ? 'active' : ''}" data-workout-action="set-tab" data-tab="session">训练</button>
      <button class="${ui.tab === 'library' ? 'active' : ''}" data-workout-action="set-tab" data-tab="library">动作库</button>
      <button class="${ui.tab === 'history' ? 'active' : ''}" data-workout-action="set-tab" data-tab="history">历史</button>
    </div>
    <div id="workoutTabContent">${ui.tab === 'library' ? renderLibrary() : ui.tab === 'history' ? renderHistory() : renderSessionOverview()}</div>`;
  }

  function renderSessionOverview(){
    const active = data.activeWorkout;
    const latest = [...data.workouts].sort((a,b) => b.startedAt - a.startedAt)[0];
    if(active){
      return `<div class="workout-overview">
        <div class="workout-overview-title">本次训练进行中</div>
        <div class="workout-overview-row"><strong>${completedSetCount(active)} 组</strong><span>${escapeHtml(workoutBodyParts(active))}</span><span>${escapeHtml(Core.formatDuration((Date.now() - active.startedAt) / 1000))}</span></div>
        <button class="workout-start-btn workout-empty-action" data-workout-action="open-session">返回训练</button>
      </div>`;
    }
    if(!latest){
      return `<div class="workout-empty"><div class="workout-empty-icon">＋</div><div class="workout-empty-title">开始第一次训练</div><p>训练完成后会在这里显示概览。</p><button class="workout-primary-action workout-empty-action" data-workout-action="open-session">开始训练</button></div>`;
    }
    return `<div class="workout-overview">
      <div class="workout-overview-title">最近一次 · ${escapeHtml(formatDate(latest.date))}</div>
      <div class="workout-overview-row"><strong>${escapeHtml(Core.formatDuration(latest.duration))}</strong><span>${escapeHtml(workoutBodyParts(latest))}</span><span>约 ${latest.estimatedCalories} kcal</span></div>
    </div>
    <button class="workout-start-btn" data-workout-action="open-session">开始新的训练</button>`;
  }

  function filteredExercises(search, bodyPart){
    const query = String(search || '').trim().toLowerCase();
    return allExercises().filter(exercise => {
      const partMatches = !bodyPart || bodyPart === '全部' || exercise.bodyPart === bodyPart;
      const textMatches = !query || `${exercise.name} ${exercise.bodyPart} ${exercise.note || ''}`.toLowerCase().includes(query);
      return partMatches && textMatches;
    });
  }

  function renderLibrary(){
    const exercises = filteredExercises(ui.librarySearch, ui.libraryFilter);
    return `<div class="workout-toolbar">
      <input class="workout-search" type="search" placeholder="搜索动作或肌群" value="${escapeAttr(ui.librarySearch)}" data-workout-input="library-search">
      <button class="workout-add-custom" data-workout-action="new-custom" title="新建自定义动作">＋</button>
    </div>
    <div class="workout-filter-row">${BODY_PARTS.map(part => `<button class="${ui.libraryFilter === part ? 'active' : ''}" data-workout-action="library-filter" data-part="${escapeAttr(part)}">${escapeHtml(part)}</button>`).join('')}</div>
    <div class="workout-exercise-list">${exercises.length ? exercises.map(renderExerciseRow).join('') : '<div class="workout-empty"><div class="workout-empty-title">没有匹配的动作</div></div>'}</div>`;
  }

  function renderExerciseRow(exercise){
    const customActions = exercise.isCustom ? `<button class="workout-icon-btn" data-workout-action="edit-custom" data-id="${escapeAttr(exercise.id)}" title="编辑动作">✎</button><button class="workout-icon-btn danger" data-workout-action="delete-custom" data-id="${escapeAttr(exercise.id)}" title="删除动作">×</button>` : '';
    return `<div class="workout-exercise-row">
      <div class="workout-bodypart-swatch">${escapeHtml(BODY_PART_SHORT[exercise.bodyPart] || '其')}</div>
      <div class="workout-exercise-main"><div class="workout-exercise-name">${escapeHtml(exercise.name)}</div><div class="workout-exercise-note">${escapeHtml(exercise.bodyPart)}${exercise.note ? ` · ${escapeHtml(exercise.note)}` : ''}${exercise.isCustom ? ' · 自定义' : ''}</div></div>
      <div class="workout-row-actions">${customActions}<button class="workout-icon-btn" data-workout-action="add-direct" data-id="${escapeAttr(exercise.id)}" title="加入训练">＋</button></div>
    </div>`;
  }

  function changeHistoryMonth(delta){
    const [year, month] = ui.historyMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    ui.historyMonth = monthKey(date);
    ui.selectedDate = Core.localDateKey(date);
    renderWorkoutScreen();
  }

  function renderHistory(){
    const [year, month] = ui.historyMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const dayCount = new Date(year, month, 0).getDate();
    const workoutDates = new Set(data.workouts.map(workout => workout.date));
    const cells = [];
    for(let i = 0; i < firstDay; i++) cells.push('<span></span>');
    for(let day = 1; day <= dayCount; day++){
      const dateKey = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const classes = ['workout-day'];
      if(workoutDates.has(dateKey)) classes.push('has-workout');
      if(ui.selectedDate === dateKey) classes.push('selected');
      if(Core.localDateKey() === dateKey) classes.push('today');
      cells.push(`<button class="${classes.join(' ')}" data-workout-action="history-day" data-date="${dateKey}">${day}</button>`);
    }
    return `<div class="workout-calendar">
      <div class="workout-calendar-head"><div class="workout-calendar-title">${year}年${month}月</div><div class="workout-calendar-nav"><button data-workout-action="history-month" data-delta="-1" title="上个月">‹</button><button data-workout-action="history-month" data-delta="1" title="下个月">›</button></div></div>
      <div class="workout-weekdays">${['日','一','二','三','四','五','六'].map(day => `<span>${day}</span>`).join('')}</div>
      <div class="workout-calendar-grid">${cells.join('')}</div>
    </div>${renderHistoryDay(ui.selectedDate)}`;
  }

  function renderHistoryDay(dateKey){
    const workouts = data.workouts.filter(workout => workout.date === dateKey).sort((a,b) => b.startedAt - a.startedAt);
    if(!workouts.length) return `<div class="workout-empty"><div class="workout-empty-title">${escapeHtml(formatDate(dateKey))} 无训练记录</div></div>`;
    return `<div class="workout-page-caption" style="margin:0 0 7px">${escapeHtml(formatDate(dateKey))} · ${workouts.length} 次训练</div>${workouts.map(workout => `<div class="workout-history-card">
      <div class="workout-history-head"><div><div class="workout-history-time">${formatTime(workout.startedAt)} · ${escapeHtml(workoutBodyParts(workout))}</div><div class="workout-history-meta">${escapeHtml(Core.formatDuration(workout.duration))} · ${completedSetCount(workout)} 组 · 约 ${workout.estimatedCalories} kcal</div></div></div>
      ${workout.note ? `<div class="workout-page-caption">${escapeHtml(workout.note)}</div>` : ''}
      ${(workout.exercises || []).map(exercise => `<div class="workout-history-exercise"><div class="workout-history-exercise-head"><div class="workout-history-exercise-name">${escapeHtml(exercise.exerciseName)}</div><button class="workout-trend-link" data-workout-action="show-trend" data-id="${escapeAttr(exercise.exerciseId)}" data-name="${escapeAttr(exercise.exerciseName)}">查看趋势</button></div><div class="workout-history-sets">${(exercise.sets || []).map(set => `<span class="workout-history-set ${set.completed ? 'done' : ''}">${set.setNumber}. ${Number(set.weight).toFixed(set.weight % 1 ? 1 : 0)}kg × ${set.reps}${set.completed ? ' ✓' : ''}</span>`).join('') || '<span class="workout-page-caption">无组记录</span>'}</div></div>`).join('')}
    </div>`).join('')}`;
  }

  function ensureMounts(){
    if(!document.getElementById('workoutSession')){
      document.body.insertAdjacentHTML('beforeend', `<section id="workoutSession" class="workout-session" aria-label="训练中"><div class="workout-session-inner" id="workoutSessionContent"></div></section>
      <div id="workoutRestOverlay" class="workout-rest-overlay"><div class="workout-rest-content" id="workoutRestContent"></div></div>
      <div id="workoutPickerModal" class="workout-modal-overlay"><div class="workout-modal"><div class="workout-modal-handle"></div><div id="workoutPickerContent"></div></div></div>
      <div id="workoutExerciseModal" class="workout-modal-overlay"><div class="workout-modal"><div class="workout-modal-handle"></div><div id="workoutExerciseContent"></div></div></div>
      <div id="workoutFinishModal" class="workout-modal-overlay"><div class="workout-modal dark"><div class="workout-modal-handle"></div><div id="workoutFinishContent"></div></div></div>
      <div id="workoutTrendModal" class="workout-modal-overlay"><div class="workout-modal"><div class="workout-modal-handle"></div><div id="workoutTrendContent"></div></div></div>`);
    }
  }

  function currentExercise(){
    const workout = data.activeWorkout;
    if(!workout || !workout.exercises.length) return null;
    workout.currentExerciseIndex = Core.clamp(workout.currentExerciseIndex || 0, 0, workout.exercises.length - 1);
    return workout.exercises[workout.currentExerciseIndex];
  }

  function currentSet(exercise){
    return exercise ? exercise.sets.find(set => !set.completed) || null : null;
  }

  function renderSession(){
    const mount = document.getElementById('workoutSessionContent');
    const workout = data.activeWorkout;
    if(!mount || !workout) return;
    const exercise = currentExercise();
    const elapsed = Math.max(0, Math.floor((Date.now() - workout.startedAt) / 1000));
    if(!exercise){
      mount.innerHTML = `<div class="workout-session-head"><div><div class="workout-session-kicker">训练进行中</div><div class="workout-session-title">选择第一个动作</div></div><div class="workout-session-time" data-workout-elapsed>${escapeHtml(Core.formatDuration(elapsed))}</div></div>
      <div class="workout-session-empty"><div class="workout-dashboard-icon">＋</div><h2>添加训练动作</h2><p>可以一次选择多个动作并随时追加。</p><button class="workout-complete-set" data-workout-action="open-picker">添加动作</button></div>
      <div class="workout-session-actions"><button data-workout-action="close-session">返回首页</button><button class="finish" data-workout-action="open-finish">结束训练</button></div>`;
      return;
    }

    const activeSet = currentSet(exercise);
    mount.innerHTML = `<div class="workout-session-head">
      <div><div class="workout-session-kicker">当前动作 · ${escapeHtml(exercise.bodyPart)}</div><div class="workout-session-title">${escapeHtml(exercise.exerciseName)}</div></div>
      <div class="workout-session-time" data-workout-elapsed>${escapeHtml(Core.formatDuration(elapsed))}</div>
      <button class="workout-dark-icon" data-workout-action="close-session" title="暂时离开训练">×</button>
    </div>
    <div class="workout-exercise-strip">${workout.exercises.map((item,index) => `<button class="workout-exercise-chip ${index === workout.currentExerciseIndex ? 'active' : ''} ${(item.sets || []).some(set => set.completed) ? 'done' : ''}" data-workout-action="switch-exercise" data-index="${index}">${escapeHtml(item.exerciseName)} · ${(item.sets || []).filter(set => set.completed).length}组</button>`).join('')}<button class="workout-exercise-chip" data-workout-action="open-picker">＋ 添加动作</button></div>
    <div class="workout-dark-panel"><div class="workout-rest-setting"><div class="workout-rest-setting-label">组间休息</div><div class="workout-rest-stepper"><button data-workout-action="adjust-rest" data-delta="-15">−</button><div class="workout-rest-value">${exercise.restBetweenSets}秒</div><button data-workout-action="adjust-rest" data-delta="15">＋</button></div><button class="workout-dark-icon" data-workout-action="remove-exercise" title="移除当前动作">×</button></div></div>
    <div class="workout-dark-panel">
      ${(exercise.sets || []).filter(set => set.completed).map(set => `<div class="workout-set-history"><span>${set.setNumber}</span><span>${Number(set.weight).toFixed(set.weight % 1 ? 1 : 0)} kg</span><span>${set.reps} 次</span><span class="done-mark">✓</span></div>`).join('')}
      ${activeSet ? renderSetControls(activeSet) : `<div class="workout-session-empty" style="min-height:260px;padding:28px 12px"><div class="workout-current-set-label">本动作已完成 ${(exercise.sets || []).filter(set => set.completed).length} 组</div><button class="workout-complete-set" data-workout-action="next-set">添加下一组</button></div>`}
    </div>
    <div class="workout-session-actions"><button data-workout-action="open-picker">＋ 添加动作</button><button class="finish" data-workout-action="open-finish">结束训练</button></div>`;
  }

  function renderSetControls(set){
    return `<div class="workout-current-set-label">第 ${set.setNumber} 组</div>
    <div class="workout-input-grid">
      <div class="workout-number-control"><div class="workout-number-label">重量 kg</div><input class="workout-number-input" inputmode="decimal" type="number" min="0" step="0.5" value="${set.weight}" data-workout-input="set-weight"><div class="workout-quick-buttons"><button data-workout-action="adjust-set" data-field="weight" data-delta="-2.5">−2.5</button><button data-workout-action="adjust-set" data-field="weight" data-delta="2.5">+2.5</button><button data-workout-action="adjust-set" data-field="weight" data-delta="5">+5</button></div></div>
      <div class="workout-number-control"><div class="workout-number-label">次数</div><input class="workout-number-input" inputmode="numeric" type="number" min="1" step="1" value="${set.reps}" data-workout-input="set-reps"><div class="workout-quick-buttons"><button data-workout-action="adjust-set" data-field="reps" data-delta="-1">−1</button><button data-workout-action="adjust-set" data-field="reps" data-delta="1">+1</button><button data-workout-action="adjust-set" data-field="reps" data-delta="5">+5</button></div></div>
    </div><button class="workout-complete-set" data-workout-action="complete-set">完成本组</button>`;
  }

  function requestNotificationPermission(){
    if(!('Notification' in window) || Notification.permission !== 'default') return;
    Notification.requestPermission().catch(() => {});
  }

  function unlockAudio(){
    try{
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if(!AudioContextClass) return;
      if(!audioContext) audioContext = new AudioContextClass();
      if(audioContext.state === 'suspended') audioContext.resume();
    }catch(error){}
  }

  function playCompletionFeedback(){
    try{
      unlockAudio();
      if(audioContext){
        [0, 0.22].forEach((offset,index) => {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          oscillator.frequency.value = index ? 660 : 880;
          gain.gain.setValueAtTime(0.0001, audioContext.currentTime + offset);
          gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + offset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + offset + 0.18);
          oscillator.connect(gain).connect(audioContext.destination);
          oscillator.start(audioContext.currentTime + offset);
          oscillator.stop(audioContext.currentTime + offset + 0.2);
        });
      }
    }catch(error){}
    if(navigator.vibrate) navigator.vibrate([250, 100, 250]);
  }

  function postTimerMessage(type, timer){
    if(!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(registration => {
      const worker = navigator.serviceWorker.controller || registration.active;
      if(worker) worker.postMessage({type, timer});
    }).catch(() => {});
  }

  function cancelScheduledTimer(){
    if(pageTimerHandle) window.clearTimeout(pageTimerHandle);
    pageTimerHandle = null;
    if(data.restTimer) postTimerMessage('CANCEL_REST_NOTIFICATION', {id:data.restTimer.id});
  }

  function scheduleTimer(){
    const timer = data.restTimer;
    cancelScheduledTimer();
    if(!timer || timer.paused || timer.completed) return;
    const remaining = Core.getRemainingMs(timer);
    pageTimerHandle = window.setTimeout(syncTimer, Math.min(remaining + 80, 2147483647));
    postTimerMessage('SCHEDULE_REST_NOTIFICATION', timer);
  }

  function renderRestOverlay(){
    const overlay = document.getElementById('workoutRestOverlay');
    const content = document.getElementById('workoutRestContent');
    const timer = data.restTimer;
    if(!overlay || !content || !timer){
      if(overlay) overlay.classList.remove('show');
      return;
    }
    overlay.classList.add('show');
    const remaining = Core.getRemainingMs(timer);
    const seconds = Math.ceil(remaining / 1000);
    const progress = Core.timerProgress(timer);
    if(timer.completed || remaining <= 0){
      content.innerHTML = `<div class="workout-rest-label">休息结束</div><div class="workout-rest-ring" style="--progress:0"><div><div class="workout-rest-seconds">0</div><div class="workout-rest-unit">秒</div></div></div><div class="workout-rest-status">可以开始下一组</div><button class="workout-next-set" data-workout-action="next-set">开始下一组</button><button class="workout-rest-finish" data-workout-action="open-finish">结束本次训练</button>`;
      return;
    }
    content.innerHTML = `<div class="workout-rest-label">组间休息</div><div class="workout-rest-ring" style="--progress:${progress}"><div><div class="workout-rest-seconds" data-rest-seconds>${seconds}</div><div class="workout-rest-unit">秒</div></div></div><div class="workout-rest-status">${timer.paused ? '已暂停' : '恢复呼吸，准备下一组'}</div><div class="workout-rest-actions"><button data-workout-action="toggle-timer">${timer.paused ? '继续' : '暂停'}</button><button data-workout-action="skip-timer">跳过</button><button data-workout-action="add-timer">+10秒</button></div><button class="workout-rest-finish" data-workout-action="open-finish">结束本次训练</button>`;
  }

  function syncTimer(){
    const timer = data.restTimer;
    if(!timer || timer.paused || timer.completed) return;
    const remaining = Core.getRemainingMs(timer);
    if(remaining <= 0){
      timer.completed = true;
      timer.endAt = Date.now();
      persist();
      cancelScheduledTimer();
      renderRestOverlay();
      playCompletionFeedback();
      return;
    }
    const secondsEl = document.querySelector('[data-rest-seconds]');
    const ring = document.querySelector('.workout-rest-ring');
    if(secondsEl) secondsEl.textContent = Math.ceil(remaining / 1000);
    if(ring) ring.style.setProperty('--progress', Core.timerProgress(timer));
  }

  function beginRestTimer(){
    const workout = data.activeWorkout;
    const exercise = currentExercise();
    if(!workout || !exercise) return;
    data.restTimer = Core.createRestTimer(exercise.restBetweenSets, {workoutId:workout.id, exerciseInstanceId:exercise.id});
    persist();
    scheduleTimer();
    renderRestOverlay();
  }

  function startOrResume(){
    requestNotificationPermission();
    unlockAudio();
    if(!data.activeWorkout){
      data.activeWorkout = Core.createWorkout();
      data.restTimer = null;
      persist();
    }
    document.body.classList.add('workout-session-open');
    document.getElementById('workoutSession').classList.add('show');
    renderSession();
    if(data.restTimer){
      syncTimer();
      renderRestOverlay();
      scheduleTimer();
    }else if(!data.activeWorkout.exercises.length){
      window.setTimeout(openPicker, 80);
    }
    renderDashboardCard();
    renderWorkoutScreen();
  }

  function closeSession(){
    if(data.restTimer && !data.restTimer.completed){
      showToastMessage('倒计时仍在继续，结束时会提醒你');
    }
    document.body.classList.remove('workout-session-open');
    document.getElementById('workoutSession').classList.remove('show');
    if(!data.restTimer) document.getElementById('workoutRestOverlay').classList.remove('show');
    renderDashboardCard();
  }

  function openPicker(){
    pickerSelection = new Set();
    ui.pickerSearch = '';
    renderPicker();
    document.getElementById('workoutPickerModal').classList.add('show');
  }

  function renderPicker(){
    const mount = document.getElementById('workoutPickerContent');
    if(!mount) return;
    const exerciseList = filteredExercises(ui.pickerSearch, '全部');
    mount.innerHTML = `<div class="workout-modal-head"><div class="workout-modal-title">添加训练动作</div><button class="workout-modal-close" data-workout-action="close-modal" data-modal="workoutPickerModal">×</button></div>
    <div class="workout-toolbar"><input class="workout-search" type="search" placeholder="搜索动作或肌群" value="${escapeAttr(ui.pickerSearch)}" data-workout-input="picker-search"><button class="workout-add-custom" data-workout-action="new-custom" title="新建自定义动作">＋</button></div>
    <div class="workout-picker-list">${exerciseList.map(exercise => `<label class="workout-picker-item"><input type="checkbox" data-workout-input="picker-check" data-id="${escapeAttr(exercise.id)}" ${pickerSelection.has(exercise.id) ? 'checked' : ''}><span class="workout-picker-name">${escapeHtml(exercise.name)}</span><span class="workout-picker-part">${escapeHtml(exercise.bodyPart)}</span></label>`).join('') || '<div class="workout-empty">没有匹配动作</div>'}</div>
    <button class="workout-modal-submit" data-workout-action="confirm-picker">添加所选${pickerSelection.size ? `（${pickerSelection.size}）` : ''}</button>`;
  }

  function addSelectedExercises(){
    if(!data.activeWorkout || !pickerSelection.size){
      showToastMessage('请至少选择一个动作');
      return;
    }
    const firstNewIndex = data.activeWorkout.exercises.length;
    pickerSelection.forEach(id => {
      const exercise = findExercise(id);
      if(exercise) data.activeWorkout.exercises.push(Core.createWorkoutExercise(exercise, data.activeWorkout.exercises.length));
    });
    data.activeWorkout.currentExerciseIndex = firstNewIndex;
    persist();
    closeModal('workoutPickerModal');
    renderSession();
    renderDashboardCard();
  }

  function addExerciseDirect(id){
    const exercise = findExercise(id);
    if(!exercise) return;
    if(!data.activeWorkout) data.activeWorkout = Core.createWorkout();
    data.activeWorkout.exercises.push(Core.createWorkoutExercise(exercise, data.activeWorkout.exercises.length));
    data.activeWorkout.currentExerciseIndex = data.activeWorkout.exercises.length - 1;
    persist();
    startOrResume();
  }

  function openCustomExercise(id){
    const exercise = id ? data.customExercises.find(item => item.id === id) : null;
    ui.editingExerciseId = exercise ? exercise.id : null;
    const mount = document.getElementById('workoutExerciseContent');
    mount.innerHTML = `<div class="workout-modal-head"><div class="workout-modal-title">${exercise ? '编辑自定义动作' : '新建自定义动作'}</div><button class="workout-modal-close" data-workout-action="close-modal" data-modal="workoutExerciseModal">×</button></div>
    <div class="workout-form-group"><label>动作名称</label><input id="workoutCustomName" maxlength="40" value="${escapeAttr(exercise ? exercise.name : '')}" placeholder="例如：地雷管划船"></div>
    <div class="workout-form-group"><label>目标肌群</label><select id="workoutCustomPart">${BODY_PARTS.filter(part => part !== '全部').map(part => `<option value="${part}" ${(exercise && exercise.bodyPart === part) ? 'selected' : ''}>${part}</option>`).join('')}</select></div>
    <div class="workout-form-group"><label>备注</label><textarea id="workoutCustomNote" maxlength="160" placeholder="器械设置、动作提示等">${escapeHtml(exercise ? exercise.note : '')}</textarea></div>
    <button class="workout-modal-submit" data-workout-action="save-custom">保存动作</button>`;
    document.getElementById('workoutExerciseModal').classList.add('show');
    window.setTimeout(() => document.getElementById('workoutCustomName')?.focus(), 80);
  }

  function saveCustomExercise(){
    const name = document.getElementById('workoutCustomName').value.trim();
    const bodyPart = document.getElementById('workoutCustomPart').value;
    const note = document.getElementById('workoutCustomNote').value.trim();
    if(!name){ showToastMessage('请输入动作名称'); return; }
    if(ui.editingExerciseId){
      const index = data.customExercises.findIndex(item => item.id === ui.editingExerciseId);
      if(index >= 0) data.customExercises[index] = Core.normalizeCustomExercise({...data.customExercises[index], name, bodyPart, note});
    }else{
      data.customExercises.push(Core.normalizeCustomExercise({id:Core.createId('custom_exercise'), name, bodyPart, note, isCustom:true}));
    }
    persist();
    closeModal('workoutExerciseModal');
    renderWorkoutScreen();
    if(document.getElementById('workoutPickerModal').classList.contains('show')) renderPicker();
    showToastMessage('动作已保存');
  }

  function removeCurrentExercise(){
    const workout = data.activeWorkout;
    const exercise = currentExercise();
    if(!workout || !exercise) return;
    if(!window.confirm(`从本次训练移除“${exercise.exerciseName}”及其组记录？`)) return;
    workout.exercises.splice(workout.currentExerciseIndex, 1);
    workout.currentExerciseIndex = Math.max(0, workout.currentExerciseIndex - 1);
    persist();
    renderSession();
    renderDashboardCard();
  }

  function updateCurrentSet(field, rawValue){
    const set = currentSet(currentExercise());
    if(!set) return;
    const value = Number(rawValue);
    if(field === 'weight') set.weight = Math.max(0, Number.isFinite(value) ? Math.round(value * 2) / 2 : 0);
    if(field === 'reps') set.reps = Math.max(0, Number.isFinite(value) ? Math.round(value) : 0);
    persist();
  }

  function adjustCurrentSet(field, delta){
    const set = currentSet(currentExercise());
    if(!set) return;
    if(field === 'weight') set.weight = Math.max(0, Math.round((set.weight + delta) * 2) / 2);
    if(field === 'reps') set.reps = Math.max(0, Math.round(set.reps + delta));
    persist();
    renderSession();
  }

  function completeCurrentSet(){
    const set = currentSet(currentExercise());
    if(!set) return;
    if(set.reps < 1){
      showToastMessage('请填写本组次数');
      document.querySelector('[data-workout-input="set-reps"]')?.focus();
      return;
    }
    set.completed = true;
    set.completedAt = Date.now();
    persist();
    renderSession();
    beginRestTimer();
  }

  function addNextSet(){
    const timerExerciseId = data.restTimer && data.restTimer.exerciseInstanceId;
    if(timerExerciseId && data.activeWorkout){
      const index = data.activeWorkout.exercises.findIndex(exercise => exercise.id === timerExerciseId);
      if(index >= 0) data.activeWorkout.currentExerciseIndex = index;
    }
    const exercise = currentExercise();
    if(exercise && !currentSet(exercise)) exercise.sets.push(Core.createNextSet(exercise));
    cancelScheduledTimer();
    data.restTimer = null;
    persist();
    document.getElementById('workoutRestOverlay').classList.remove('show');
    renderSession();
  }

  function toggleTimer(){
    if(!data.restTimer || data.restTimer.completed) return;
    if(data.restTimer.paused){
      data.restTimer = Core.resumeTimer(data.restTimer);
      scheduleTimer();
    }else{
      data.restTimer = Core.pauseTimer(data.restTimer);
      cancelScheduledTimer();
    }
    persist();
    renderRestOverlay();
  }

  function skipTimer(){
    if(!data.restTimer) return;
    cancelScheduledTimer();
    data.restTimer.completed = true;
    data.restTimer.endAt = Date.now();
    persist();
    renderRestOverlay();
  }

  function addTimerSeconds(){
    if(!data.restTimer || data.restTimer.completed) return;
    data.restTimer = Core.addTimerSeconds(data.restTimer, 10);
    persist();
    scheduleTimer();
    renderRestOverlay();
  }

  function openFinishModal(){
    const workout = data.activeWorkout;
    if(!workout) return;
    const duration = Math.max(0, Math.round((Date.now() - workout.startedAt) / 1000));
    document.getElementById('workoutFinishContent').innerHTML = `<div class="workout-modal-head"><div class="workout-modal-title">结束本次训练</div><button class="workout-modal-close" data-workout-action="close-modal" data-modal="workoutFinishModal">×</button></div>
    <div class="workout-dark-panel"><div class="workout-overview-row" style="color:#aab5bc"><strong style="color:#fff">${escapeHtml(Core.formatDuration(duration))}</strong><span>${workout.exercises.length} 个动作</span><span>${completedSetCount(workout)} 组</span></div></div>
    <div class="workout-form-group"><label style="color:#9aa5ad">训练备注</label><textarea id="workoutFinishNote" style="background:#20262c;border-color:#39434b;color:#fff" placeholder="今天的状态、动作调整等">${escapeHtml(workout.note || '')}</textarea></div>
    <button class="workout-next-set" data-workout-action="confirm-finish">保存并结束训练</button>`;
    document.getElementById('workoutFinishModal').classList.add('show');
  }

  function finishWorkout(){
    const workout = data.activeWorkout;
    if(!workout) return;
    const endedAt = Date.now();
    workout.endedAt = endedAt;
    workout.duration = Math.max(0, Math.round((endedAt - workout.startedAt) / 1000));
    workout.note = document.getElementById('workoutFinishNote')?.value.trim() || '';
    workout.estimatedCalories = Core.estimateCalories(workout.duration);
    data.workouts.push(Core.normalizeWorkout(workout));
    data.workouts.sort((a,b) => b.startedAt - a.startedAt);
    cancelScheduledTimer();
    data.activeWorkout = null;
    data.restTimer = null;
    persist();
    closeModal('workoutFinishModal');
    document.getElementById('workoutRestOverlay').classList.remove('show');
    document.getElementById('workoutSession').classList.remove('show');
    document.body.classList.remove('workout-session-open');
    ui.selectedDate = workout.date;
    ui.historyMonth = monthKey(workout.startedAt);
    renderDashboardCard();
    renderWorkoutScreen();
    showToastMessage(`训练已保存 · ${Core.formatDuration(workout.duration)}`);
  }

  function showTrend(exerciseId, exerciseName){
    const points = [];
    [...data.workouts].sort((a,b) => a.startedAt - b.startedAt).forEach(workout => {
      const matches = workout.exercises.filter(exercise => exercise.exerciseId === exerciseId || exercise.exerciseName === exerciseName);
      const completed = matches.flatMap(exercise => exercise.sets || []).filter(set => set.completed);
      if(!completed.length) return;
      const maxWeight = Math.max(...completed.map(set => Number(set.weight) || 0));
      const maxReps = Math.max(...completed.filter(set => (Number(set.weight) || 0) === maxWeight).map(set => Number(set.reps) || 0));
      points.push({date:workout.date, maxWeight, maxReps});
    });
    const recent = points.slice(-12);
    const metric = recent.some(point => point.maxWeight > 0) ? 'weight' : 'reps';
    const max = Math.max(1, ...recent.map(point => metric === 'weight' ? point.maxWeight : point.maxReps));
    document.getElementById('workoutTrendContent').innerHTML = `<div class="workout-modal-head"><div><div class="workout-modal-title">${escapeHtml(exerciseName)}</div><div class="workout-page-caption">最近 ${recent.length} 次训练趋势</div></div><button class="workout-modal-close" data-workout-action="close-modal" data-modal="workoutTrendModal">×</button></div>
    <div class="workout-trend-list">${recent.length ? recent.map(point => { const value = metric === 'weight' ? point.maxWeight : point.maxReps; return `<div class="workout-trend-row"><div class="workout-trend-date">${escapeHtml(formatDate(point.date))}</div><div class="workout-trend-bar"><div class="workout-trend-fill" style="width:${Math.max(4, value / max * 100)}%"></div></div><div class="workout-trend-value">${metric === 'weight' ? `${value}kg × ${point.maxReps}` : `${value} 次`}</div></div>`; }).join('') : '<div class="workout-empty">暂无已完成组数据</div>'}</div>`;
    document.getElementById('workoutTrendModal').classList.add('show');
  }

  function closeModal(id){
    document.getElementById(id)?.classList.remove('show');
  }

  function handleAction(button){
    const action = button.dataset.workoutAction;
    if(action === 'open-session') startOrResume();
    if(action === 'close-session') closeSession();
    if(action === 'set-tab'){ ui.tab = button.dataset.tab; renderWorkoutScreen(); }
    if(action === 'library-filter'){ ui.libraryFilter = button.dataset.part; renderWorkoutScreen(); }
    if(action === 'new-custom') openCustomExercise();
    if(action === 'edit-custom') openCustomExercise(button.dataset.id);
    if(action === 'delete-custom'){
      const item = data.customExercises.find(exercise => exercise.id === button.dataset.id);
      if(item && window.confirm(`删除自定义动作“${item.name}”？历史训练不会受影响。`)){
        data.customExercises = data.customExercises.filter(exercise => exercise.id !== item.id);
        persist(); renderWorkoutScreen();
      }
    }
    if(action === 'add-direct') addExerciseDirect(button.dataset.id);
    if(action === 'history-month') changeHistoryMonth(Number(button.dataset.delta));
    if(action === 'history-day'){ ui.selectedDate = button.dataset.date; renderWorkoutScreen(); }
    if(action === 'show-trend') showTrend(button.dataset.id, button.dataset.name);
    if(action === 'open-picker') openPicker();
    if(action === 'close-modal') closeModal(button.dataset.modal);
    if(action === 'confirm-picker') addSelectedExercises();
    if(action === 'save-custom') saveCustomExercise();
    if(action === 'switch-exercise'){ data.activeWorkout.currentExerciseIndex = Number(button.dataset.index); persist(); renderSession(); }
    if(action === 'adjust-rest'){
      const exercise = currentExercise();
      if(exercise){ exercise.restBetweenSets = Core.clamp(exercise.restBetweenSets + Number(button.dataset.delta), 10, 600); persist(); renderSession(); }
    }
    if(action === 'remove-exercise') removeCurrentExercise();
    if(action === 'adjust-set') adjustCurrentSet(button.dataset.field, Number(button.dataset.delta));
    if(action === 'complete-set') completeCurrentSet();
    if(action === 'toggle-timer') toggleTimer();
    if(action === 'skip-timer') skipTimer();
    if(action === 'add-timer') addTimerSeconds();
    if(action === 'next-set') addNextSet();
    if(action === 'open-finish') openFinishModal();
    if(action === 'confirm-finish') finishWorkout();
  }

  function handleInput(target){
    const type = target.dataset.workoutInput;
    if(type === 'library-search'){ ui.librarySearch = target.value; renderWorkoutScreen(); document.querySelector('[data-workout-input="library-search"]')?.focus(); }
    if(type === 'picker-search'){ ui.pickerSearch = target.value; renderPicker(); document.querySelector('[data-workout-input="picker-search"]')?.focus(); }
    if(type === 'picker-check'){
      if(target.checked) pickerSelection.add(target.dataset.id); else pickerSelection.delete(target.dataset.id);
      const submit = document.querySelector('[data-workout-action="confirm-picker"]');
      if(submit) submit.textContent = `添加所选${pickerSelection.size ? `（${pickerSelection.size}）` : ''}`;
    }
    if(type === 'set-weight') updateCurrentSet('weight', target.value);
    if(type === 'set-reps') updateCurrentSet('reps', target.value);
  }

  function getSyncData(){
    return {
      workoutSchemaVersion: Core.SCHEMA_VERSION,
      workouts: data.workouts.map(Core.normalizeWorkout),
      customExercises: data.customExercises.map(Core.normalizeCustomExercise),
    };
  }

  function mergeSyncData(payload, options){
    if(!payload || (!Array.isArray(payload.workouts) && !Array.isArray(payload.customExercises))) return;
    data = options && options.preferLocal ? Core.mergeData(payload, data) : Core.mergeData(data, payload);
    persist();
    ui.selectedDate = latestWorkoutDate();
    ui.historyMonth = monthKey(`${ui.selectedDate}T12:00:00`);
    renderDashboardCard();
    renderWorkoutScreen();
  }

  function init(){
    ensureMounts();
    renderDashboardCard();
    renderWorkoutScreen();
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-workout-action]');
      if(button){ event.preventDefault(); handleAction(button); }
      const modal = event.target.classList.contains('workout-modal-overlay') ? event.target : null;
      if(modal) modal.classList.remove('show');
    });
    document.addEventListener('input', event => {
      if(event.target.dataset.workoutInput) handleInput(event.target);
    });
    document.addEventListener('change', event => {
      if(event.target.dataset.workoutInput === 'picker-check') handleInput(event.target);
    });
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'visible'){
        syncTimer(); renderRestOverlay(); renderSession(); renderDashboardCard();
      }else if(data.restTimer && !data.restTimer.paused && !data.restTimer.completed){
        scheduleTimer();
      }
    });
    if('serviceWorker' in navigator){
      navigator.serviceWorker.addEventListener('message', event => {
        if(event.data && event.data.type === 'REST_TIMER_FINISHED') syncTimer();
      });
    }
    tickHandle = window.setInterval(() => {
      syncTimer();
      const elapsed = document.querySelector('[data-workout-elapsed]');
      if(elapsed && data.activeWorkout) elapsed.textContent = Core.formatDuration((Date.now() - data.activeWorkout.startedAt) / 1000);
    }, 250);
    if(data.restTimer){
      document.body.classList.add('workout-session-open');
      document.getElementById('workoutSession').classList.add('show');
      renderSession();
      syncTimer();
      renderRestOverlay();
      scheduleTimer();
    }
  }

  window.WorkoutApp = Object.freeze({
    init,
    render: renderWorkoutScreen,
    renderDashboardCard,
    start: startOrResume,
    getSyncData,
    mergeSyncData,
    getPresetExercises: () => [...PRESET_EXERCISES],
  });

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
