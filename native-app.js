(function(){
  'use strict';

  function capacitor(){
    return window.Capacitor || null;
  }

  function isNative(){
    const cap = capacitor();
    return Boolean(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  }

  function plugin(name){
    return capacitor()?.Plugins?.[name] || null;
  }

  async function haptic(style){
    const haptics = plugin('Haptics');
    if(haptics){
      try{
        await haptics.impact({ style:style || 'LIGHT' });
        return;
      }catch(error){}
    }
    if(navigator.vibrate) navigator.vibrate(12);
  }

  async function configureSystemUi(){
    if(!isNative()) return;
    try{ await plugin('StatusBar')?.setOverlaysWebView({ overlay:true }); }catch(error){}
    await setDarkSurface(false);
    try{ await plugin('SplashScreen')?.hide(); }catch(error){}
  }

  async function setDarkSurface(active){
    if(!isNative()) return;
    try{ await plugin('StatusBar')?.setStyle({ style:active ? 'LIGHT' : 'DARK' }); }catch(error){}
  }

  function closeTopLayer(){
    const musicSettings = document.getElementById('workoutMusicSettings');
    if(musicSettings?.classList.contains('show')){
      musicSettings.classList.remove('show');
      return true;
    }
    const modal = [...document.querySelectorAll('.workout-modal-overlay.show,.modal-overlay.show')].pop();
    if(modal){ modal.classList.remove('show'); return true; }
    const rest = document.getElementById('workoutRestOverlay');
    if(rest?.classList.contains('show')) return true;
    const session = document.getElementById('workoutSession');
    if(session?.classList.contains('show')){
      document.querySelector('[data-workout-action="close-session"]')?.click();
      return true;
    }
    return false;
  }

  async function configureBackButton(){
    const app = plugin('App');
    if(!app || !isNative()) return;
    try{
      await app.addListener('backButton', ({ canGoBack }) => {
        if(closeTopLayer()) return;
        if(canGoBack) history.back();
        else app.minimizeApp();
      });
      await app.addListener('appStateChange', ({ isActive }) => {
        if(isActive){
          const darkSurface = document.body?.classList.contains('workout-session-open') || document.getElementById('workoutRestOverlay')?.classList.contains('show');
          setDarkSurface(Boolean(darkSurface));
          document.dispatchEvent(new Event('visibilitychange'));
        }
      });
    }catch(error){}
  }

  window.NativeApp = Object.freeze({
    isNative,
    platform:() => capacitor()?.getPlatform?.() || 'web',
    plugin,
    haptic,
    setDarkSurface,
  });

  function init(){
    document.documentElement.classList.toggle('native-app', isNative());
    configureSystemUi();
    configureBackButton();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
