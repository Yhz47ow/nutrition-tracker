'use strict';

function pad(value) {
  return String(value).padStart(2, '0');
}

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value == null ? Date.now() : value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(key, delta) {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + Number(delta || 0));
  return dateKey(date);
}

function formatDate(key) {
  const date = new Date(`${key}T12:00:00`);
  const today = dateKey(Date.now());
  if (key === today) return '今天';
  if (key === addDays(today, -1)) return '昨天';
  if (key === addDays(today, 1)) return '明天';
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${date.getMonth() + 1}月${date.getDate()}日 周${weekdays[date.getDay()]}`;
}

function monthKey(value) {
  const date = value instanceof Date ? value : new Date(value == null ? Date.now() : value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours) return `${hours}小时${minutes}分`;
  if (minutes) return `${minutes}分${rest ? `${rest}秒` : ''}`;
  return `${rest}秒`;
}

module.exports = { pad, dateKey, addDays, formatDate, monthKey, formatDuration };
