'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function createRuntime() {
  const values = new Map();
  const files = new Map();
  let shared = null;
  global.wx = {
    env: { USER_DATA_PATH:'/user' },
    getStorageSync(key) { return values.has(key) ? values.get(key) : ''; },
    setStorageSync(key, value) { values.set(key, value); },
    removeStorageSync(key) { values.delete(key); },
    getFileSystemManager() {
      return {
        writeFile({filePath,data,success}) { files.set(filePath, data); success({}); },
        readFile({filePath,success,fail}) { files.has(filePath) ? success({data:files.get(filePath)}) : fail(new Error('missing')); },
      };
    },
    shareFileMessage(options) { shared = options; options.success({}); },
    chooseMessageFile(options) {
      const [path, data] = [...files.entries()][0];
      options.success({tempFiles:[{path,size:Buffer.byteLength(data)}]});
    },
  };
  return { files, get shared() { return shared; } };
}

test('backup exports to chat and can be selected for import', async () => {
  const runtime = createRuntime();
  const storage = require('../../miniprogram/utils/storage');
  const dataIo = require('../../miniprogram/utils/data-io');
  storage.initialize();
  const diet = storage.getDietState();
  diet.records['2026-07-16'] = {breakfast:[{id:'egg',foodName:'鸡蛋'}],lunch:[],dinner:[],snack:[]};
  diet.settings.profile = {sex:'male',age:30,heightCm:175,weightKg:70};
  diet.favoriteFoods = ['b-egg'];
  diet.mealTemplates = [{id:'meal-1',name:'早餐',components:[]}];
  storage.saveDietState(diet);

  const exported = await dataIo.exportToChat();
  assert.match(exported.fileName, /^食练记备份-\d{4}-\d{2}-\d{2}\.json$/);
  assert.equal(runtime.shared.filePath, exported.filePath);
  const parsed = JSON.parse(runtime.files.get(exported.filePath));
  assert.equal(parsed.dietRecords['2026-07-16'].breakfast[0].foodName, '鸡蛋');
  assert.equal(parsed.userSettings.profile.heightCm, 175);
  assert.deepEqual(parsed.favoriteFoods, ['b-egg']);
  assert.equal(parsed.mealTemplates[0].id, 'meal-1');

  const imported = await dataIo.importFromChat();
  assert.equal(imported.payload.dietRecords['2026-07-16'].breakfast[0].id, 'egg');
});
