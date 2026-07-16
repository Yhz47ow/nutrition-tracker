const storage = require('./utils/storage');

App({
  globalData: {
    pendingFood: null,
    pendingMeal: 'lunch',
    pendingDate: '',
    editFoodId: '',
    editExerciseId: '',
  },

  onLaunch() {
    storage.initialize();
  },
});
