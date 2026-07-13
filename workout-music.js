(function(){
  'use strict';

  if(!window.WorkoutMusicCore){
    console.error('WorkoutMusicCore is required before workout-music.js');
    return;
  }

  const Core = window.WorkoutMusicCore;
  const audio = new Audio();
  audio.preload = 'metadata';
  let config = loadConfig();
  let runtimeTracks = [];
  let runtimeObjectUrls = [];
  let isPlaying = false;
  let drawerOpen = false;
  let audioContext = null;
  let noiseSource = null;
  let noiseGain = null;
  let nativeAppleState = null;
  let nativeAppleStateSignature = '';
  let nativeAppleLoadedSongId = '';

  function loadConfig(){
    try{
      return Core.normalizeConfig(JSON.parse(localStorage.getItem(Core.STORAGE_KEY) || '{}'));
    }catch(error){
      return Core.normalizeConfig({});
    }
  }

  function persist(){
    try{ localStorage.setItem(Core.STORAGE_KEY, JSON.stringify(config)); }catch(error){}
  }

  function escapeHtml(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[char]));
  }

  function escapeAttr(value){
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function showToastMessage(message){
    if(typeof window.showToast === 'function') window.showToast(message);
    else console.info(message);
  }

  function haptic(pattern){
    if(window.NativeApp?.isNative()){
      NativeApp.haptic('LIGHT');
      return;
    }
    if(navigator.vibrate) navigator.vibrate(pattern || 12);
  }

  function platform(){
    return Core.PLATFORMS[config.platform];
  }

  function nativeApplePlugin(){
    if(config.platform !== 'apple' || !window.NativeApp?.isNative() || NativeApp.platform() !== 'ios') return null;
    return NativeApp.plugin('AppleMusic');
  }

  function isNativeApple(){
    return Boolean(nativeApplePlugin() && Core.extractAppleMusicId(config.source));
  }

  function tracks(){
    return runtimeTracks.length ? runtimeTracks : Core.parseLocalPlaylist(config.playlistText);
  }

  function currentTrack(){
    const list = tracks();
    if(!list.length) return null;
    const index = Math.min(config.currentTrack, list.length - 1);
    return list[index];
  }

  function currentMetadata(){
    if(isNativeApple() && nativeAppleState?.title){
      return {
        title:nativeAppleState.title,
        artist:nativeAppleState.artist || 'Apple Music',
        coverUrl:nativeAppleState.coverUrl || config.coverUrl || '',
      };
    }
    return Core.displayMetadata(config, config.platform === 'local' ? currentTrack() : null);
  }

  function ensureMounts(){
    if(!document.getElementById('workoutMusicShell')){
      document.body.insertAdjacentHTML('beforeend', `<div id="workoutMusicShell" class="workout-music-shell" aria-label="训练音乐控制">
        <div id="workoutMusicDrawer" class="workout-music-drawer"></div>
        <div id="workoutMusicBar" class="workout-music-bar"></div>
      </div>
      <div id="workoutMusicSettings" class="workout-music-modal-overlay">
        <div class="workout-music-modal"><div id="workoutMusicSettingsContent"></div></div>
      </div>`);
    }
  }

  function coverMarkup(metadata){
    if(metadata.coverUrl){
      return `<img src="${escapeAttr(metadata.coverUrl)}" alt="">`;
    }
    const symbols = {local:'♪',noise:'≈',netease:'网',apple:'A',qq:'Q',xiaoyuzhou:'播'};
    return escapeHtml(symbols[config.platform] || '♪');
  }

  function renderBar(){
    const mount = document.getElementById('workoutMusicBar');
    if(!mount) return;
    const metadata = currentMetadata();
    const nativeApple = isNativeApple();
    const external = (platform().mode === 'embed' || platform().mode === 'embed-link') && !nativeApple;
    const supportsVolume = !external && !nativeApple;
    const status = nativeApple ? `${metadata.artist} · iOS MusicKit` : (external ? `${metadata.artist} · 官方播放器` : metadata.artist);
    mount.innerHTML = `<div class="workout-music-main">
      <button class="workout-music-cover" data-music-action="toggle-drawer" title="展开播放器">${coverMarkup(metadata)}</button>
      <button class="workout-music-copy" data-music-action="toggle-drawer"><div class="workout-music-title">${escapeHtml(metadata.title)}</div><div class="workout-music-artist">${escapeHtml(status)}</div></button>
      <button class="workout-music-settings" data-music-action="open-settings" title="音乐设置">⚙</button>
    </div>
    <div class="workout-music-controls">
      <button class="workout-music-control" data-music-action="previous" title="上一首">|‹</button>
      <button class="workout-music-control primary" data-music-action="play-pause" title="${external ? '打开官方播放器' : (isPlaying ? '暂停' : '播放')}">${external ? '↗' : (isPlaying ? 'Ⅱ' : '▶')}</button>
      <button class="workout-music-control" data-music-action="next" title="下一首">›|</button>
      <label class="workout-music-volume"><span>${config.volume === 0 ? '×' : '♪'}</span><input type="range" min="0" max="100" step="1" value="${Math.round(config.volume * 100)}" data-music-input="volume" ${supportsVolume ? '' : 'disabled'} aria-label="音乐音量" title="${supportsVolume ? '音乐音量' : '请使用系统或官方播放器调节音量'}"></label>
    </div>`;
  }

  function setDrawer(open){
    drawerOpen = Boolean(open);
    const drawer = document.getElementById('workoutMusicDrawer');
    if(!drawer) return;
    if(drawerOpen){
      renderDrawer();
      drawer.classList.add('show');
    }else{
      drawer.classList.remove('show');
    }
  }

  function drawerHeader(label, badge, sourceUrl){
    return `<div class="workout-music-drawer-head"><div class="workout-music-drawer-title">${escapeHtml(label)}</div><span class="workout-music-badge">${escapeHtml(badge)}</span>${sourceUrl ? '<button class="workout-music-drawer-action" data-music-action="open-source">在平台打开</button>' : ''}<button class="workout-music-drawer-action workout-music-drawer-close" data-music-action="close-drawer">×</button></div>`;
  }

  function renderDrawer(){
    const drawer = document.getElementById('workoutMusicDrawer');
    if(!drawer) return;
    const selected = platform();

    if(isNativeApple()){
      const embed = Core.buildEmbed('apple', config.source, config);
      const state = nativeAppleState || {};
      const key = `native-apple:${embed?.src || ''}:${state.title || ''}:${state.playing || false}`;
      if(drawer.dataset.key === key) return;
      drawer.dataset.key = key;
      drawer.innerHTML = `${drawerHeader('Apple Music','iOS MusicKit',embed?.sourceUrl || '')}<div class="workout-music-drawer-empty">${state.title ? `${escapeHtml(state.title)} · ${escapeHtml(state.artist || 'Apple Music')}` : '授权后可播放 Apple Music 单曲；专辑和歌单可使用下方官方播放器'}</div>${embed ? `<div class="workout-music-frame-wrap"><iframe class="workout-music-frame" src="${escapeAttr(embed.src)}" height="220" title="Apple Music 播放器" allow="autoplay; encrypted-media" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"></iframe></div>` : ''}`;
      return;
    }

    if(config.platform === 'local'){
      const list = tracks();
      const key = `local:${list.map(track => track.id).join(',')}:${config.currentTrack}:${isPlaying}`;
      if(drawer.dataset.key === key) return;
      drawer.dataset.key = key;
      drawer.innerHTML = `${drawerHeader('本地音频播放列表','完整控制','')}<div class="workout-music-track-list">${list.length ? list.map((track,index) => `<button class="workout-music-track ${index === config.currentTrack ? 'active' : ''}" data-music-action="select-track" data-index="${index}"><span class="workout-music-track-index">${index + 1}</span><span><div class="workout-music-track-title">${escapeHtml(track.title)}</div><div class="workout-music-track-artist">${escapeHtml(track.artist)}</div></span><span class="workout-music-track-state">${index === config.currentTrack && isPlaying ? 'Ⅱ' : '▶'}</span></button>`).join('') : '<div class="workout-music-drawer-empty">请在音乐设置中添加音频 URL 或选择本机文件</div>'}</div>`;
      return;
    }

    if(config.platform === 'noise'){
      const key = `noise:${config.noiseType}:${isPlaying}`;
      if(drawer.dataset.key === key) return;
      drawer.dataset.key = key;
      const metadata = currentMetadata();
      drawer.innerHTML = `${drawerHeader(metadata.title,'完全离线','')}<div class="workout-music-drawer-empty">${isPlaying ? '正在播放' : '已暂停'} · 音量可在下方独立调节</div>`;
      return;
    }

    const embed = Core.buildEmbed(config.platform, config.source, config);
    const key = embed ? `${config.platform}:${embed.src}` : `${config.platform}:empty`;
    if(drawer.dataset.key === key) return;
    drawer.dataset.key = key;
    const badge = selected.officialEmbed ? '官方嵌入' : '实验嵌入';
    if(!embed){
      drawer.innerHTML = `${drawerHeader(selected.label,badge,'')}<div class="workout-music-drawer-empty">请先配置有效的歌曲、歌单或节目链接</div>`;
      return;
    }
    drawer.innerHTML = `${drawerHeader(selected.label,badge,embed.sourceUrl)}<div class="workout-music-frame-wrap">${navigator.onLine ? `<iframe class="workout-music-frame" src="${escapeAttr(embed.src)}" height="${Number(embed.height)}" title="${escapeAttr(selected.label)} 播放器" loading="eager" allow="autoplay; encrypted-media; clipboard-write" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-top-navigation-by-user-activation" referrerpolicy="strict-origin-when-cross-origin"></iframe>` : '<div class="workout-music-drawer-empty">当前离线，外部播放器不可用</div>'}</div>`;
  }

  function getAudioContext(){
    try{
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if(!AudioContextClass) return null;
      if(!audioContext) audioContext = new AudioContextClass();
      if(audioContext.state === 'suspended'){
        const resumeResult = audioContext.resume();
        if(resumeResult && typeof resumeResult.catch === 'function') resumeResult.catch(() => {});
      }
      return audioContext;
    }catch(error){
      return null;
    }
  }

  function unlock(){
    getAudioContext();
  }

  function stopNoise(){
    if(noiseSource){
      try{ noiseSource.stop(); }catch(error){}
      try{ noiseSource.disconnect(); }catch(error){}
    }
    noiseSource = null;
    noiseGain = null;
  }

  function createNoiseBuffer(context, type){
    const length = context.sampleRate * 3;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const output = buffer.getChannelData(0);
    let brown = 0;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for(let i = 0; i < length; i++){
      const white = Math.random() * 2 - 1;
      if(type === 'brown'){
        brown = (brown + 0.02 * white) / 1.02;
        output[i] = brown * 3.5;
      }else if(type === 'pink'){
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }else{
        output[i] = white * 0.48;
      }
    }
    return buffer;
  }

  function startNoise(){
    const context = getAudioContext();
    if(!context){ showToastMessage('当前浏览器不支持白噪音'); return; }
    stopNoise();
    noiseSource = context.createBufferSource();
    noiseGain = context.createGain();
    noiseSource.buffer = createNoiseBuffer(context, config.noiseType);
    noiseSource.loop = true;
    noiseGain.gain.value = config.volume;
    noiseSource.connect(noiseGain).connect(context.destination);
    noiseSource.start();
    isPlaying = true;
    updateMediaSession();
    renderBar();
    if(drawerOpen) renderDrawer();
  }

  function pauseNoise(){
    stopNoise();
    isPlaying = false;
    updateMediaSession();
    renderBar();
    if(drawerOpen) renderDrawer();
  }

  function loadTrack(index, autoplay){
    const list = tracks();
    if(!list.length){ openSettings(); return; }
    config.currentTrack = (Number(index) + list.length) % list.length;
    const track = list[config.currentTrack];
    persist();
    if(audio.dataset.trackId !== track.id){
      audio.pause();
      audio.src = track.src;
      audio.dataset.trackId = track.id;
      audio.load();
    }
    audio.volume = config.volume;
    updateMediaSession();
    renderBar();
    if(drawerOpen){ document.getElementById('workoutMusicDrawer').dataset.key = ''; renderDrawer(); }
    if(autoplay) audio.play().catch(error => showToastMessage(`无法播放：${error.message}`));
  }

  function playLocal(){
    const track = currentTrack();
    if(!track){ openSettings(); return; }
    if(audio.dataset.trackId !== track.id) loadTrack(config.currentTrack, false);
    audio.volume = config.volume;
    audio.play().catch(error => showToastMessage(`无法播放：${error.message}`));
  }

  function stopAllPlayback(){
    if(isNativeApple()) nativeApplePlugin()?.pause().catch(() => {});
    audio.pause();
    stopNoise();
    isPlaying = false;
    updateMediaSession();
  }

  function playPause(){
    haptic();
    if(isNativeApple()){
      controlNativeApple(isPlaying ? 'pause' : 'play');
      return;
    }
    if(platform().mode === 'embed' || platform().mode === 'embed-link'){
      setDrawer(true);
      showToastMessage('请使用上方官方播放器控制播放');
      return;
    }
    if(config.platform === 'noise'){
      if(isPlaying) pauseNoise(); else startNoise();
      return;
    }
    if(isPlaying) audio.pause(); else playLocal();
  }

  function changeTrack(delta, withHaptic){
    if(withHaptic !== false) haptic();
    if(isNativeApple()){
      controlNativeApple(delta < 0 ? 'previous' : 'next');
      return;
    }
    if(config.platform !== 'local'){
      if(platform().mode === 'embed' || platform().mode === 'embed-link'){
        setDrawer(true);
        showToastMessage('跨域播放器请在官方控件中切换');
      }
      return;
    }
    const list = tracks();
    if(!list.length){ openSettings(); return; }
    loadTrack(config.currentTrack + delta, true);
  }

  function setVolume(value, shouldPersist){
    if(platform().mode === 'embed' || platform().mode === 'embed-link' || isNativeApple()) return;
    config.volume = Core.clamp(Number(value) / 100, 0, 1);
    audio.volume = config.volume;
    if(noiseGain) noiseGain.gain.value = config.volume;
    if(shouldPersist) persist();
    const icon = document.querySelector('.workout-music-volume span');
    if(icon) icon.textContent = config.volume === 0 ? '×' : '♪';
  }

  function clearMediaSession(){
    if(!('mediaSession' in navigator)) return;
    try{
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      ['play','pause','previoustrack','nexttrack','seekbackward','seekforward'].forEach(action => {
        try{ navigator.mediaSession.setActionHandler(action, null); }catch(error){}
      });
    }catch(error){}
  }

  function updateMediaSession(){
    if(!('mediaSession' in navigator)) return;
    if(platform().mode === 'embed' || platform().mode === 'embed-link'){
      clearMediaSession();
      return;
    }
    const metadata = currentMetadata();
    try{
      if('MediaMetadata' in window){
        const options = {title:metadata.title, artist:metadata.artist, album:'训练音乐'};
        if(metadata.coverUrl) options.artwork = [{src:metadata.coverUrl}];
        navigator.mediaSession.metadata = new MediaMetadata(options);
      }
      navigator.mediaSession.setActionHandler('play', () => {
        if(isPlaying) return;
        if(config.platform === 'noise') startNoise(); else playLocal();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if(!isPlaying) return;
        if(config.platform === 'noise') pauseNoise(); else audio.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => changeTrack(-1, false));
      navigator.mediaSession.setActionHandler('nexttrack', () => changeTrack(1, false));
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }catch(error){}
  }

  function updateMediaPosition(){
    if(!('mediaSession' in navigator) || config.platform !== 'local' || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    try{
      navigator.mediaSession.setPositionState({duration:audio.duration, playbackRate:audio.playbackRate || 1, position:Math.min(audio.currentTime, audio.duration)});
    }catch(error){}
  }

  async function controlNativeApple(action){
    const appleMusic = nativeApplePlugin();
    if(!appleMusic) return;
    try{
      const authorization = await appleMusic.requestAuthorization();
      if(!authorization.authorized){
        showToastMessage('请在系统设置中允许 Apple Music 访问');
        return;
      }
      let state;
      if(action === 'play'){
        const songId = Core.extractAppleMusicId(config.source);
        if(songId && nativeAppleLoadedSongId !== songId){
          state = await appleMusic.playSong({songId});
          nativeAppleLoadedSongId = songId;
        }else state = await appleMusic.play();
      }else{
        state = await appleMusic[action]();
      }
      applyNativeAppleState(state);
    }catch(error){
      showToastMessage(`Apple Music 操作失败：${error.message || '请检查订阅和授权'}`);
    }
  }

  function applyNativeAppleState(state){
    if(!state) return;
    const signature = JSON.stringify(state);
    if(signature === nativeAppleStateSignature) return;
    nativeAppleStateSignature = signature;
    nativeAppleState = state;
    isPlaying = Boolean(state.playing);
    renderBar();
    if(drawerOpen){ document.getElementById('workoutMusicDrawer').dataset.key = ''; renderDrawer(); }
  }

  async function syncNativeAppleState(){
    const appleMusic = nativeApplePlugin();
    if(!appleMusic) return;
    try{ applyNativeAppleState(await appleMusic.getState()); }catch(error){}
  }

  function playCountdownCue(second){
    const context = getAudioContext();
    if(!context || second < 1 || second > 3) return;
    try{
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 480 + (3 - second) * 120;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.065, context.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.11);
    }catch(error){}
  }

  function openSettings(){
    renderSettings();
    document.getElementById('workoutMusicSettings').classList.add('show');
  }

  function closeSettings(){
    document.getElementById('workoutMusicSettings').classList.remove('show');
  }

  function platformOptions(){
    return Object.values(Core.PLATFORMS).map(item => `<option value="${item.id}" ${config.platform === item.id ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('');
  }

  function renderSettings(){
    const mount = document.getElementById('workoutMusicSettingsContent');
    mount.innerHTML = `<div class="workout-music-modal-head"><div class="workout-music-modal-title">训练音乐</div><button class="workout-music-modal-close" data-music-action="close-settings">×</button></div>
    <div class="workout-music-field"><label>当前平台</label><select id="musicPlatform" data-music-input="platform">${platformOptions()}</select></div>
    <div id="musicPlatformState" class="workout-music-platform-state"></div>
    <div class="workout-music-group" data-music-group="external">
      <div class="workout-music-field"><label>歌曲、歌单或节目链接 / ID</label><input id="musicSource" type="text" value="${escapeAttr(config.source)}" placeholder="粘贴平台链接或网易云数字 ID"></div>
      <div id="musicNeteaseType" class="workout-music-field"><label>网易云内容类型</label><select id="musicNeteaseTypeSelect"><option value="song" ${config.neteaseType === 'song' ? 'selected' : ''}>单曲</option><option value="playlist" ${config.neteaseType === 'playlist' ? 'selected' : ''}>歌单</option></select></div>
      <div class="workout-music-form-row"><div class="workout-music-field"><label>显示标题</label><input id="musicTitle" value="${escapeAttr(config.title)}" placeholder="正在听什么"></div><div class="workout-music-field"><label>艺术家 / 播客</label><input id="musicArtist" value="${escapeAttr(config.artist)}" placeholder="艺术家或节目名"></div></div>
      <div class="workout-music-field"><label>封面图片 URL</label><input id="musicCover" type="url" value="${escapeAttr(config.coverUrl)}" placeholder="https://..."></div>
    </div>
    <div class="workout-music-group" data-music-group="local">
      <div class="workout-music-field"><label>本地音频播放列表</label><textarea id="musicPlaylist" placeholder="歌名 | 艺术家 | https://example.com/audio.mp3">${escapeHtml(config.playlistText)}</textarea></div>
      <div class="workout-music-field"><label>选择本机音频文件</label><input id="musicFiles" type="file" accept="audio/*" multiple><div id="musicFileStatus" class="workout-music-file-status">${runtimeTracks.length ? `当前会话已加载 ${runtimeTracks.length} 首` : ''}</div></div>
    </div>
    <div class="workout-music-group" data-music-group="noise"><div class="workout-music-field"><label>背景音类型</label><select id="musicNoiseType"><option value="white" ${config.noiseType === 'white' ? 'selected' : ''}>白噪音</option><option value="pink" ${config.noiseType === 'pink' ? 'selected' : ''}>粉红噪音</option><option value="brown" ${config.noiseType === 'brown' ? 'selected' : ''}>棕色噪音</option></select></div></div>
    <div class="workout-music-field"><label>默认音量</label><input id="musicDefaultVolume" type="range" min="0" max="100" value="${Math.round(config.volume * 100)}"></div>
    <button class="workout-music-save" data-music-action="save-settings">保存音乐设置</button>`;
    updateSettingsVisibility();
  }

  function updateSettingsVisibility(){
    const selected = document.getElementById('musicPlatform')?.value || config.platform;
    const item = Core.PLATFORMS[selected];
    document.querySelector('[data-music-group="external"]')?.classList.toggle('hidden', item.mode !== 'embed' && item.mode !== 'embed-link');
    document.querySelector('[data-music-group="local"]')?.classList.toggle('hidden', selected !== 'local');
    document.querySelector('[data-music-group="noise"]')?.classList.toggle('hidden', selected !== 'noise');
    document.getElementById('musicNeteaseType')?.classList.toggle('hidden', selected !== 'netease');
    const state = document.getElementById('musicPlatformState');
    if(state){
      if(selected === 'apple' && window.NativeApp?.isNative() && NativeApp.platform() === 'ios') state.textContent = 'iOS 单曲使用原生 MusicKit；系统音量由用户控制';
      else if(item.fullControl) state.textContent = '统一控制条可完整控制';
      else if(item.officialEmbed) state.textContent = '使用官方嵌入播放器；跨域控制由平台播放器完成';
      else state.textContent = '实验性 Web 嵌入；不可用时在平台打开';
    }
  }

  function loadLocalFiles(fileList){
    runtimeObjectUrls.forEach(url => URL.revokeObjectURL(url));
    runtimeObjectUrls = [];
    runtimeTracks = Array.from(fileList || []).map((file,index) => {
      const src = URL.createObjectURL(file);
      runtimeObjectUrls.push(src);
      return {id:`file_${index}_${file.name}_${file.lastModified}`,title:file.name.replace(/\.[^.]+$/,''),artist:'本机文件',src,coverUrl:'',transient:true};
    });
    config.currentTrack = 0;
    const status = document.getElementById('musicFileStatus');
    if(status) status.textContent = runtimeTracks.length ? `当前会话已加载 ${runtimeTracks.length} 首` : '';
  }

  function saveSettings(){
    const previousPlatform = config.platform;
    const previousSource = config.source;
    const previousNoiseType = config.noiseType;
    const previousPlaylistText = config.playlistText;
    const wasPlaying = isPlaying;
    const next = Core.normalizeConfig({
      ...config,
      platform:document.getElementById('musicPlatform').value,
      source:document.getElementById('musicSource')?.value || '',
      neteaseType:document.getElementById('musicNeteaseTypeSelect')?.value || 'song',
      title:document.getElementById('musicTitle')?.value || '',
      artist:document.getElementById('musicArtist')?.value || '',
      coverUrl:document.getElementById('musicCover')?.value || '',
      playlistText:document.getElementById('musicPlaylist')?.value || '',
      noiseType:document.getElementById('musicNoiseType')?.value || 'white',
      volume:Number(document.getElementById('musicDefaultVolume')?.value || 70) / 100,
    });
    if(previousPlatform !== next.platform || (previousPlatform === 'apple' && previousSource !== next.source)) stopAllPlayback();
    config = next;
    nativeAppleState = null;
    nativeAppleStateSignature = '';
    if(previousPlatform !== next.platform || previousSource !== next.source) nativeAppleLoadedSongId = '';
    if(previousPlatform === 'local' && config.platform === 'local' && previousPlaylistText !== config.playlistText && !runtimeTracks.length){
      audio.pause();
      audio.removeAttribute('src');
      audio.dataset.trackId = '';
      config.currentTrack = 0;
    }
    const list = tracks();
    if(config.currentTrack >= list.length) config.currentTrack = 0;
    audio.volume = config.volume;
    if(noiseGain) noiseGain.gain.value = config.volume;
    persist();
    if(wasPlaying && config.platform === 'noise' && previousNoiseType !== config.noiseType) startNoise();
    document.getElementById('workoutMusicDrawer').dataset.key = '';
    closeSettings();
    renderBar();
    updateMediaSession();
    syncNativeAppleState();
    if(drawerOpen) renderDrawer();
    showToastMessage('音乐设置已保存');
  }

  function openSource(){
    const embed = Core.buildEmbed(config.platform, config.source, config);
    if(embed?.sourceUrl) window.open(embed.sourceUrl, '_blank', 'noopener,noreferrer');
  }

  function getSyncData(){
    return { musicConfig:{...config, currentTrack:0} };
  }

  function mergeSyncData(payload){
    if(!payload || !payload.musicConfig) return;
    stopAllPlayback();
    config = Core.normalizeConfig(payload.musicConfig);
    nativeAppleLoadedSongId = '';
    persist();
    document.getElementById('workoutMusicDrawer').dataset.key = '';
    renderBar();
    updateMediaSession();
    syncNativeAppleState();
    if(drawerOpen) renderDrawer();
  }

  function handleAction(button){
    const action = button.dataset.musicAction;
    if(action === 'toggle-drawer') setDrawer(!drawerOpen);
    if(action === 'close-drawer') setDrawer(false);
    if(action === 'open-settings') openSettings();
    if(action === 'close-settings') closeSettings();
    if(action === 'save-settings') saveSettings();
    if(action === 'play-pause') playPause();
    if(action === 'previous') changeTrack(-1, true);
    if(action === 'next') changeTrack(1, true);
    if(action === 'select-track') loadTrack(Number(button.dataset.index), true);
    if(action === 'open-source') openSource();
  }

  function init(){
    ensureMounts();
    audio.volume = config.volume;
    renderBar();
    updateMediaSession();
    window.setInterval(syncNativeAppleState, 1800);
    syncNativeAppleState();
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-music-action]');
      if(button){ event.preventDefault(); handleAction(button); }
      if(event.target.classList.contains('workout-music-modal-overlay')) closeSettings();
    });
    document.addEventListener('input', event => {
      if(event.target.dataset.musicInput === 'volume') setVolume(event.target.value, false);
    });
    document.addEventListener('change', event => {
      if(event.target.dataset.musicInput === 'volume'){ setVolume(event.target.value, true); haptic(8); }
      if(event.target.dataset.musicInput === 'platform') updateSettingsVisibility();
      if(event.target.id === 'musicFiles') loadLocalFiles(event.target.files);
    });
    window.addEventListener('online', () => { document.getElementById('workoutMusicDrawer').dataset.key = ''; if(drawerOpen) renderDrawer(); });
    window.addEventListener('offline', () => { document.getElementById('workoutMusicDrawer').dataset.key = ''; if(drawerOpen) renderDrawer(); });
    window.addEventListener('pagehide', () => runtimeObjectUrls.forEach(url => URL.revokeObjectURL(url)));
  }

  audio.addEventListener('play', () => { isPlaying = true; updateMediaSession(); renderBar(); if(drawerOpen) renderDrawer(); });
  audio.addEventListener('pause', () => { isPlaying = false; updateMediaSession(); renderBar(); if(drawerOpen) renderDrawer(); });
  audio.addEventListener('ended', () => changeTrack(1, false));
  audio.addEventListener('error', () => { isPlaying = false; renderBar(); showToastMessage('音频加载失败，请检查地址或文件'); });
  audio.addEventListener('timeupdate', updateMediaPosition);

  window.WorkoutMusic = Object.freeze({
    init,
    openSettings,
    unlock,
    playCountdownCue,
    getSyncData,
    mergeSyncData,
    getConfig:() => ({...config}),
  });

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
