'use strict';

const storage = require('./storage');

function current() {
  return storage.getDietState().settings.theme === 'dark' ? 'dark' : 'light';
}

function apply() {
  const dark = current() === 'dark';
  wx.setNavigationBarColor({
    frontColor: '#ffffff',
    backgroundColor: dark ? '#171d1a' : '#2f855a',
    animation: { duration: 160, timingFunc: 'easeIn' },
  });
  wx.setBackgroundColor({ backgroundColor: dark ? '#0d1110' : '#f4f6f8' });
  return dark ? 'dark' : '';
}

module.exports = { current, apply };
