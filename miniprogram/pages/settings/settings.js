const storage = require('../../utils/storage');
const theme = require('../../utils/theme');
const media = require('../../utils/media');
const dataIo = require('../../utils/data-io');

Page({
  data: {
    themeClass: 'dark-theme',
    targets: {},
    theme: 'system',
    themeOptions: [
      { value: 'system', label: '跟随系统' },
      { value: 'dark', label: '深色' },
      { value: 'light', label: '浅色' },
    ],
  },

  onShow() {
    const state = storage.getDietState();
    this.setData({ themeClass: theme.apply(), targets: state.settings.targets, theme: state.settings.theme });
  },

  inputTarget(event) {
    this.setData({ [`targets.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  preset(event) {
    const calories = Math.max(1, Number(this.data.targets.calories) || 1600);
    const ratios = event.currentTarget.dataset.mode === 'fatloss' ? [.4, .35, .25] : [.5, .25, .25];
    this.setData({
      'targets.carbs': Math.round(calories * ratios[0] / 4),
      'targets.protein': Math.round(calories * ratios[1] / 4),
      'targets.fat': Math.round(calories * ratios[2] / 9),
    });
  },

  selectTheme(event) {
    this.setData({ theme: event.currentTarget.dataset.theme }, () => this.save());
  },

  save() {
    const state = storage.getDietState();
    state.settings.targets = {
      calories: Math.max(1, Number(this.data.targets.calories) || 1600),
      carbs: Math.max(0, Number(this.data.targets.carbs) || 0),
      protein: Math.max(0, Number(this.data.targets.protein) || 0),
      fat: Math.max(0, Number(this.data.targets.fat) || 0),
    };
    state.settings.theme = this.data.theme;
    storage.saveDietState(state);
    this.setData({ themeClass: theme.apply() });
    wx.showToast({ title: '设置已保存', icon: 'success' });
  },

  async exportBackup() {
    wx.showLoading({ title: '正在生成备份' });
    try {
      await dataIo.exportToChat();
      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      if (String(error.errMsg || '').includes('cancel')) return;
      wx.showModal({ title: '导出失败', content: error.message || '无法分享备份文件', showCancel: false });
    }
  },

  async importBackup() {
    try {
      const result = await dataIo.importFromChat();
      wx.showModal({
        title: '导入本地备份',
        content: '导入会合并饮食、训练和自定义数据，不会删除当前记录。',
        success: async answer => {
          if (!answer.confirm) return;
          wx.showLoading({ title: '正在导入' });
          try {
            storage.importBackup(result.payload);
            wx.hideLoading();
            this.onShow();
            wx.showToast({ title: '导入成功', icon: 'success' });
          } catch (error) {
            wx.hideLoading();
            wx.showModal({ title: '导入失败', content: error.message || '文件格式不正确', showCancel: false });
          }
        },
      });
    } catch (error) {
      if (String(error.errMsg || '').includes('cancel')) return;
      wx.showModal({ title: '导入失败', content: error.message || '无法读取聊天文件', showCancel: false });
    }
  },

  clearAll() {
    wx.showModal({
      title: '清除全部本地数据',
      content: '将删除饮食、训练、自定义食物、照片和设置，且无法撤销。建议先导出备份。',
      confirmText: '全部删除',
      confirmColor: theme.palette().danger,
      success: result => {
        if (!result.confirm) return;
        media.clearAllImages();
        storage.clearUserData();
        this.onShow();
        wx.showToast({ title: '已清除', icon: 'success' });
      },
    });
  },
});
