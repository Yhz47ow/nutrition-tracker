'use strict';

const storage = require('./storage');
const media = require('./media');
const dates = require('./date');

const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

function utf8ByteLength(value) {
  return Array.from(String(value || '')).reduce((total, character) => {
    const code = character.codePointAt(0);
    return total + (code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4);
  }, 0);
}

function writeFile(filePath, data) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().writeFile({ filePath, data, encoding: 'utf8', success: resolve, fail: reject });
  });
}

function readFile(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({ filePath, encoding: 'utf8', success: result => resolve(result.data), fail: reject });
  });
}

function shareFile(filePath, fileName) {
  if (!wx.shareFileMessage) return Promise.reject(new Error('当前微信版本不支持分享文件，请升级微信后重试'));
  return new Promise((resolve, reject) => {
    wx.shareFileMessage({ filePath, fileName, success: resolve, fail: reject });
  });
}

function chooseJsonFile() {
  return new Promise((resolve, reject) => {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: result => {
        const file = result.tempFiles && result.tempFiles[0];
        if (!file) return reject(new Error('没有选择备份文件'));
        if (Number(file.size) > MAX_BACKUP_BYTES) return reject(new Error('备份文件超过 10MB，无法导入'));
        resolve(file.path);
      },
      fail: reject,
    });
  });
}

async function exportToChat() {
  const backup = await media.embedBackupImages(storage.createBackup());
  const data = JSON.stringify(backup, null, 2);
  const bytes = utf8ByteLength(data);
  if (bytes > MAX_BACKUP_BYTES) throw new Error('备份超过 10MB，请先删除部分食物照片后重试');
  const fileName = `食练记备份-${dates.dateKey(Date.now())}.json`;
  const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
  await writeFile(filePath, data);
  await shareFile(filePath, fileName);
  return { filePath, fileName, bytes };
}

async function importFromChat() {
  const filePath = await chooseJsonFile();
  const data = await readFile(filePath);
  let parsed;
  try { parsed = JSON.parse(data); }
  catch (error) { throw new Error('所选文件不是有效的 JSON 备份'); }
  const payload = await media.restoreBackupImages(parsed);
  return { filePath, payload };
}

module.exports = { MAX_BACKUP_BYTES, exportToChat, importFromChat };
