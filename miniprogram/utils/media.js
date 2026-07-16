'use strict';

function extension(path) {
  const match = String(path || '').match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0] : '.jpg';
}

function persistImage(tempPath) {
  if (!tempPath) return Promise.resolve('');
  const target = `${wx.env.USER_DATA_PATH}/food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${extension(tempPath)}`;
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().copyFile({ srcPath: tempPath, destPath: target, success: () => resolve(target), fail: reject });
  });
}

function deleteImage(path) {
  if (!path || !String(path).startsWith(wx.env.USER_DATA_PATH)) return;
  wx.getFileSystemManager().unlink({ filePath: path, fail: () => {} });
}

function readBase64(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({ filePath, encoding:'base64', success:result=>resolve(result.data), fail:reject });
  });
}

function writeBase64(data, suffix) {
  const target = `${wx.env.USER_DATA_PATH}/food_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${suffix || '.jpg'}`;
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().writeFile({ filePath:target, data, encoding:'base64', success:()=>resolve(target), fail:reject });
  });
}

async function embedBackupImages(backup) {
  const output = JSON.parse(JSON.stringify(backup));
  for (const date of Object.keys(output.dietRecords || {})) {
    for (const meal of ['breakfast','lunch','dinner','snack']) {
      for (const item of output.dietRecords[date][meal] || []) {
        if (!item.photo || !String(item.photo).startsWith(wx.env.USER_DATA_PATH)) continue;
        try {
          const suffix = extension(item.photo).toLowerCase();
          const mime = suffix === '.png' ? 'image/png' : suffix === '.webp' ? 'image/webp' : 'image/jpeg';
          item.photo = `data:${mime};base64,${await readBase64(item.photo)}`;
        } catch (error) {
          item.photo = '';
        }
      }
    }
  }
  return output;
}

async function restoreBackupImages(payload) {
  const output = JSON.parse(JSON.stringify(payload));
  const records = output.dietRecords || output.records || {};
  for (const date of Object.keys(records)) {
    for (const meal of ['breakfast','lunch','dinner','snack']) {
      for (const item of records[date][meal] || []) {
        const match = String(item.photo || '').match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
        if (!match) continue;
        const suffix = match[1] === 'png' ? '.png' : match[1] === 'webp' ? '.webp' : '.jpg';
        try { item.photo = await writeBase64(match[2], suffix); }
        catch (error) { item.photo = ''; }
      }
    }
  }
  return output;
}

function clearAllImages() {
  const manager = wx.getFileSystemManager();
  manager.readdir({ dirPath:wx.env.USER_DATA_PATH, success:result => {
    (result.files || []).filter(name => name.startsWith('food_')).forEach(name => {
      manager.unlink({ filePath:`${wx.env.USER_DATA_PATH}/${name}`, fail:()=>{} });
    });
  }, fail:()=>{} });
}

module.exports = { persistImage, deleteImage, embedBackupImages, restoreBackupImages, clearAllImages };
