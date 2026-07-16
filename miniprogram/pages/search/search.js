const storage = require('../../utils/storage');
const diet = require('../../utils/diet');
const theme = require('../../utils/theme');

Page({
  data: { themeClass:'', tab:'local', query:'', results:[], loading:false, pendingMeal:'lunch' },

  onShow() {
    this.setData({ themeClass: theme.apply(), pendingMeal: getApp().globalData.pendingMeal || 'lunch' });
    this.refreshLocal();
  },

  refreshLocal() {
    const state = storage.getDietState();
    const pool = this.data.tab === 'custom' ? state.customFoods : diet.allFoods(state.customFoods);
    const query = this.data.query.trim().toLowerCase();
    this.setData({ results: query ? pool.filter(item => item.name.toLowerCase().includes(query)) : pool });
  },

  switchTab(event) {
    const tab = event.currentTarget.dataset.tab;
    this.setData({ tab, results: tab === 'online' ? [] : this.data.results }, () => {
      if (tab !== 'online') this.refreshLocal();
    });
  },

  inputQuery(event) { this.setData({ query: event.detail.value }, () => { if (this.data.tab !== 'online') this.refreshLocal(); }); },

  search() {
    if (this.data.tab !== 'online') return this.refreshLocal();
    const query = this.data.query.trim();
    if (!query) return wx.showToast({ title:'请输入食物名称', icon:'none' });
    this.setData({ loading:true, results:[] });
    wx.request({
      url:'https://world.openfoodfacts.org/cgi/search.pl',
      data:{ search_terms:query, search_simple:1, action:'process', json:1, page_size:30 },
      success: response => {
        const results = (response.data && response.data.products || []).map((item, index) => diet.parseProduct(item, index)).filter(Boolean);
        this.setData({ results });
      },
      fail: () => wx.showModal({ title:'联网搜索不可用', content:'请检查网络，或先使用内置食物和自定义食物。', showCancel:false }),
      complete: () => this.setData({ loading:false }),
    });
  },

  selectFood(event) {
    const food = this.data.results[Number(event.currentTarget.dataset.index)];
    if (!food) return;
    const app = getApp();
    app.globalData.pendingFood = food;
    wx.navigateTo({ url:'/pages/food-entry/food-entry' });
  },

  newCustom() { getApp().globalData.editFoodId=''; wx.navigateTo({ url:'/pages/custom-food/custom-food' }); },
});
