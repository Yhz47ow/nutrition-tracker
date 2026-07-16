const storage = require('../../utils/storage');
const diet = require('../../utils/diet');
const dates = require('../../utils/date');
const workoutData = require('../../utils/workout-data');
const media = require('../../utils/media');
const theme = require('../../utils/theme');

Page({
  data: {
    themeClass: '',
    currentDate: dates.dateKey(Date.now()),
    summary: null,
    recommendations: [],
    recentWorkout: null,
    activeWorkout: null,
  },

  onShow() {
    this.setData({ themeClass: theme.apply() });
    this.refresh();
  },

  refresh() {
    const state = storage.getDietState();
    const workout = workoutData.load();
    const summary = diet.summarize(state.records, this.data.currentDate, state.settings.targets);
    const latest = [...workout.workouts].sort((a, b) => b.startedAt - a.startedAt)[0];
    this.setData({
      summary,
      recommendations: diet.recommendations(summary, state.customFoods),
      activeWorkout: workout.activeWorkout ? {
        parts: workoutData.workoutParts(workout.activeWorkout),
        sets: workoutData.completedSets(workout.activeWorkout),
        duration: dates.formatDuration((Date.now() - workout.activeWorkout.startedAt) / 1000),
      } : null,
      recentWorkout: latest ? {
        parts: workoutData.workoutParts(latest),
        duration: dates.formatDuration(latest.duration),
        calories: latest.estimatedCalories,
        date: latest.date,
      } : null,
    });
  },

  changeDate(event) {
    const currentDate = dates.addDays(this.data.currentDate, Number(event.currentTarget.dataset.delta));
    this.setData({ currentDate }, () => this.refresh());
  },

  chooseDate(event) {
    this.setData({ currentDate: event.detail.value }, () => this.refresh());
  },

  today() {
    this.setData({ currentDate: dates.dateKey(Date.now()) }, () => this.refresh());
  },

  openSettings() { wx.navigateTo({ url: '/pages/settings/settings' }); },

  startWorkout() { wx.navigateTo({ url: '/pages/training/training' }); },

  addFood(event) {
    const app = getApp();
    app.globalData.pendingMeal = event.currentTarget.dataset.meal || 'lunch';
    app.globalData.pendingDate = this.data.currentDate;
    app.globalData.openFoodLibraryForEntry = true;
    wx.switchTab({ url: '/pages/library/library' });
  },

  quickAdd(event) {
    const recommendation = this.data.recommendations[Number(event.currentTarget.dataset.index)];
    if (!recommendation) return;
    const state = storage.getDietState();
    const date = this.data.currentDate;
    const meals = diet.normalizeRecords(state.records, date);
    const meal = diet.MEAL_TYPES.map(type => ({ type, calories: meals[type].reduce((sum, item) => sum + Number(item.calories || 0), 0) }))
      .sort((a, b) => a.calories - b.calories)[0].type;
    meals[meal].push(diet.createRecord(recommendation.food, recommendation.grams, meal));
    state.records[date] = meals;
    storage.saveDietState(state);
    wx.showToast({ title: `已加入${diet.MEAL_META[meal].name}`, icon: 'success' });
    this.refresh();
  },

  deleteFood(event) {
    const { meal, index } = event.currentTarget.dataset;
    wx.showModal({ title: '删除记录', content: '确定删除这条饮食记录吗？', success: result => {
      if (!result.confirm) return;
      const state = storage.getDietState();
      const meals = diet.normalizeRecords(state.records, this.data.currentDate);
      const removed = meals[meal].splice(Number(index), 1)[0];
      if (removed && removed.photo) media.deleteImage(removed.photo);
      state.records[this.data.currentDate] = meals;
      storage.saveDietState(state);
      this.refresh();
    }});
  },

  copyMeal(event) {
    const meal = event.currentTarget.dataset.meal;
    const today = dates.dateKey(Date.now());
    const state = storage.getDietState();
    const source = diet.normalizeRecords(state.records, this.data.currentDate)[meal];
    if (!source.length) return wx.showToast({ title: '这一餐没有记录', icon: 'none' });
    const target = diet.normalizeRecords(state.records, today);
    source.forEach(item => target[meal].push(Object.assign({}, item, { id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` })));
    state.records[today] = target;
    storage.saveDietState(state);
    wx.showToast({ title: '已复制到今天', icon: 'success' });
    if (this.data.currentDate === today) this.refresh();
  },

  previewPhoto(event) {
    const path = event.currentTarget.dataset.path;
    if (path) wx.previewImage({ current: path, urls: [path] });
  },
});
