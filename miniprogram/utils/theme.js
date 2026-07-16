'use strict';

const storage = require('./storage');

const PALETTES = Object.freeze({
  dark: {
    background: '#1E1E1E',
    navigation: '#1E1E1E',
    tabBar: '#1A1A1A',
    text: '#F5F5F5',
    secondaryText: '#99999F',
    accent: '#FF9F0A',
    danger: '#D85A5A',
    grid: 'rgba(255,255,255,0.10)',
  },
  light: {
    background: '#F2F2F7',
    navigation: '#F2F2F7',
    tabBar: '#FFFFFF',
    text: '#1C1C1E',
    secondaryText: '#6E6E73',
    accent: '#D97706',
    danger: '#C43D3D',
    grid: 'rgba(60,60,67,0.14)',
  },
});

function preference() {
  const value = storage.getDietState().settings.theme;
  return ['system', 'dark', 'light'].includes(value) ? value : 'system';
}

function systemTheme() {
  try {
    const app = getApp();
    if (app && app.globalData && app.globalData.systemTheme) return app.globalData.systemTheme;
  } catch (error) {}
  const info = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
  return info.theme === 'light' ? 'light' : 'dark';
}

function current() {
  const selected = preference();
  return selected === 'system' ? systemTheme() : selected;
}

function palette(value) {
  return PALETTES[value || current()] || PALETTES.dark;
}

function apply() {
  const resolved = current();
  const colors = palette(resolved);
  try {
    const app = getApp();
    if (app && app.globalData) app.globalData.resolvedTheme = resolved;
  } catch (error) {}
  wx.setNavigationBarColor({
    frontColor: resolved === 'dark' ? '#ffffff' : '#000000',
    backgroundColor: colors.navigation,
    animation: { duration: 160, timingFunc: 'easeIn' },
  });
  wx.setBackgroundColor({ backgroundColor: colors.background });
  if (wx.setTabBarStyle) {
    wx.setTabBarStyle({
      color: colors.secondaryText,
      selectedColor: colors.accent,
      backgroundColor: colors.tabBar,
      borderStyle: resolved === 'dark' ? 'white' : 'black',
    });
  }
  return `${resolved}-theme`;
}

module.exports = { PALETTES, preference, current, palette, apply };
