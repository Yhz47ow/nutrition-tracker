const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'native-app.js'), 'utf8');

function boot(capacitor){
  const calls = [];
  const document = {
    readyState:'complete',
    documentElement:{classList:{toggle:(name, enabled) => calls.push(['class', name, enabled])}},
    getElementById:() => null,
    querySelectorAll:() => [],
  };
  const navigator = {vibrate:value => calls.push(['vibrate', value])};
  const window = {Capacitor:capacitor};
  vm.runInNewContext(source, {window, document, navigator, console, Event});
  return {window, calls};
}

test('native bridge keeps a browser fallback for haptics', async () => {
  const {window, calls} = boot(null);
  assert.equal(window.NativeApp.isNative(), false);
  assert.equal(window.NativeApp.platform(), 'web');
  await window.NativeApp.haptic();
  assert.deepEqual(calls.at(-1), ['vibrate', 12]);
});

test('native bridge exposes Capacitor platform and plugins', async () => {
  const hapticCalls = [];
  const haptics = {impact:options => { hapticCalls.push(options); return Promise.resolve(); }};
  const restTimer = {schedule:() => Promise.resolve()};
  const {window} = boot({
    isNativePlatform:() => true,
    getPlatform:() => 'ios',
    Plugins:{Haptics:haptics, RestTimer:restTimer},
  });
  assert.equal(window.NativeApp.isNative(), true);
  assert.equal(window.NativeApp.platform(), 'ios');
  assert.equal(window.NativeApp.plugin('RestTimer'), restTimer);
  await window.NativeApp.haptic('MEDIUM');
  assert.equal(hapticCalls.length, 1);
  assert.equal(hapticCalls[0].style, 'MEDIUM');
});

test('app shell loads the native bridge before workout modules', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const nativeIndex = html.indexOf('native-app.js?v=2.0.0');
  const workoutIndex = html.indexOf('workout-core.js?v=2.0.0');
  assert.ok(nativeIndex >= 0);
  assert.ok(workoutIndex > nativeIndex);
});
