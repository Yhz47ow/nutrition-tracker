(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.WorkoutMusicCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  const STORAGE_KEY = 'nutrition_workout_music_v1';
  const PLATFORMS = Object.freeze({
    local: { id:'local', label:'本地音频', mode:'local', fullControl:true, offline:'files' },
    noise: { id:'noise', label:'白噪音', mode:'noise', fullControl:true, offline:true },
    netease: { id:'netease', label:'网易云音乐', mode:'embed', fullControl:false, officialEmbed:true },
    apple: { id:'apple', label:'Apple Music', mode:'embed', fullControl:false, officialEmbed:true },
    qq: { id:'qq', label:'QQ音乐', mode:'embed-link', fullControl:false, officialEmbed:false },
    xiaoyuzhou: { id:'xiaoyuzhou', label:'小宇宙', mode:'embed-link', fullControl:false, officialEmbed:false },
  });

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function isHttpUrl(value){
    try{
      const url = new URL(String(value || '').trim());
      return url.protocol === 'https:' || url.protocol === 'http:';
    }catch(error){
      return false;
    }
  }

  function safeUrl(value, allowedHosts){
    try{
      const url = new URL(String(value || '').trim());
      if(url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      if(Array.isArray(allowedHosts) && !allowedHosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
      url.protocol = 'https:';
      return url;
    }catch(error){
      return null;
    }
  }

  function extractNumericId(value){
    const source = String(value || '').trim();
    if(/^\d+$/.test(source)) return source;
    try{
      const url = new URL(source);
      const queryId = url.searchParams.get('id');
      if(queryId && /^\d+$/.test(queryId)) return queryId;
      const match = `${url.pathname}${url.hash}`.match(/(?:id=|\/)(\d{4,})(?:\D|$)/);
      return match ? match[1] : '';
    }catch(error){
      const match = source.match(/(?:id=|\/)(\d{4,})(?:\D|$)/);
      return match ? match[1] : '';
    }
  }

  function titleFromUrl(value){
    try{
      const url = new URL(value);
      const name = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || url.hostname);
      return name.replace(/\.[a-z0-9]{2,5}$/i, '') || '未命名音频';
    }catch(error){
      return '未命名音频';
    }
  }

  function parseLocalPlaylist(value){
    return String(value || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
      const parts = line.split('|').map(part => part.trim());
      const source = parts.pop() || '';
      if(!isHttpUrl(source)) return null;
      return {
        id: `url_${index}_${source}`,
        title: parts[0] || titleFromUrl(source),
        artist: parts[1] || '本地音频',
        src: source,
        coverUrl: parts[2] && isHttpUrl(parts[2]) ? parts[2] : '',
        transient: false,
      };
    }).filter(Boolean);
  }

  function normalizeConfig(config){
    const source = config && typeof config === 'object' ? config : {};
    const platform = PLATFORMS[source.platform] ? source.platform : 'noise';
    return {
      version: 1,
      platform,
      source: String(source.source || '').trim(),
      neteaseType: source.neteaseType === 'playlist' ? 'playlist' : 'song',
      title: String(source.title || '').trim(),
      artist: String(source.artist || '').trim(),
      coverUrl: isHttpUrl(source.coverUrl) ? String(source.coverUrl).trim() : '',
      playlistText: String(source.playlistText || ''),
      volume: clamp(Number.isFinite(Number(source.volume)) ? Number(source.volume) : 0.7, 0, 1),
      noiseType: ['white','pink','brown'].includes(source.noiseType) ? source.noiseType : 'white',
      currentTrack: Math.max(0, Math.round(Number(source.currentTrack) || 0)),
    };
  }

  function buildEmbed(platform, source, options){
    const selected = PLATFORMS[platform];
    if(!selected || (selected.mode !== 'embed' && selected.mode !== 'embed-link')) return null;
    const settings = options || {};

    if(platform === 'netease'){
      const id = extractNumericId(source);
      if(!id) return null;
      const isPlaylist = settings.neteaseType === 'playlist';
      const type = isPlaylist ? 0 : 2;
      const height = isPlaylist ? 310 : 86;
      return {
        src: `https://music.163.com/outchain/player?type=${type}&id=${encodeURIComponent(id)}&auto=0&height=${isPlaylist ? 290 : 66}`,
        sourceUrl: `https://music.163.com/#/${isPlaylist ? 'playlist' : 'song'}?id=${encodeURIComponent(id)}`,
        height,
        stableEmbed: true,
      };
    }

    if(platform === 'apple'){
      const url = safeUrl(source, ['music.apple.com']);
      if(!url) return null;
      url.hostname = 'embed.music.apple.com';
      return { src:url.href, sourceUrl:String(source).trim(), height:300, stableEmbed:true };
    }

    if(platform === 'qq'){
      const url = safeUrl(source, ['y.qq.com','qqmusic.qq.com']);
      if(!url) return null;
      return { src:url.href, sourceUrl:url.href, height:280, stableEmbed:false };
    }

    if(platform === 'xiaoyuzhou'){
      const url = safeUrl(source, ['xiaoyuzhoufm.com']);
      if(!url) return null;
      return { src:url.href, sourceUrl:url.href, height:280, stableEmbed:false };
    }

    return null;
  }

  function displayMetadata(config, track){
    const normalized = normalizeConfig(config);
    if(track) return { title:track.title || '未命名音频', artist:track.artist || '本地音频', coverUrl:track.coverUrl || '' };
    if(normalized.platform === 'noise'){
      const names = {white:'白噪音',pink:'粉红噪音',brown:'棕色噪音'};
      return { title:names[normalized.noiseType], artist:'离线背景音', coverUrl:'' };
    }
    const platform = PLATFORMS[normalized.platform];
    return {
      title:normalized.title || '等待手动同步',
      artist:normalized.artist || platform.label,
      coverUrl:normalized.coverUrl,
    };
  }

  return Object.freeze({
    STORAGE_KEY,
    PLATFORMS,
    clamp,
    isHttpUrl,
    safeUrl,
    extractNumericId,
    parseLocalPlaylist,
    normalizeConfig,
    buildEmbed,
    displayMetadata,
  });
});
