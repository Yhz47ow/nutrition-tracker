const storage = require('./utils/storage');
const theme = require('./utils/theme');

App({
  globalData: {
    pendingFood: null,
    pendingMeal: 'lunch',
    pendingDate: '',
    editFoodId: '',
    editExerciseId: '',
    systemTheme: 'dark',
    resolvedTheme: 'dark',
  },

  onLaunch() {
    storage.initialize();
    const systemInfo = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
    this.globalData.systemTheme = systemInfo.theme === 'light' ? 'light' : 'dark';
    theme.apply();
    if (wx.onThemeChange) wx.onThemeChange(event => this.syncSystemTheme(event));
  },

  syncSystemTheme(event) {
    this.globalData.systemTheme = event && event.theme === 'light' ? 'light' : 'dark';
    const themeClass = theme.apply();
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    const page = pages[pages.length - 1];
    if (page && page.setData && Object.prototype.hasOwnProperty.call(page.data || {}, 'themeClass')) {
      page.setData({ themeClass });
    }
  },
});
