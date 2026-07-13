const test = require('node:test');
const assert = require('node:assert/strict');
const MusicCore = require('../workout-music-core.js');

test('supported platform registry includes all requested services', () => {
  assert.deepEqual(
    ['apple','netease','qq','xiaoyuzhou'].every(id => Boolean(MusicCore.PLATFORMS[id])),
    true
  );
  assert.equal(MusicCore.PLATFORMS.local.fullControl, true);
  assert.equal(MusicCore.PLATFORMS.noise.offline, true);
});

test('NetEase song and playlist links produce official HTTPS embeds', () => {
  const song = MusicCore.buildEmbed('netease', 'https://music.163.com/#/song?id=347230', { neteaseType:'song' });
  const playlist = MusicCore.buildEmbed('netease', '3778678', { neteaseType:'playlist' });

  assert.match(song.src, /^https:\/\/music\.163\.com\/outchain\/player\?type=2/);
  assert.match(song.src, /id=347230/);
  assert.match(playlist.src, /type=0/);
  assert.match(playlist.sourceUrl, /playlist\?id=3778678/);
  assert.equal(song.stableEmbed, true);
});

test('Apple Music URL is normalized to the official embed host', () => {
  const embed = MusicCore.buildEmbed(
    'apple',
    'https://music.apple.com/cn/album/example/123456789?i=987654321',
    {}
  );

  assert.equal(new URL(embed.src).hostname, 'embed.music.apple.com');
  assert.equal(new URL(embed.src).protocol, 'https:');
  assert.equal(embed.stableEmbed, true);
});

test('QQ Music and Xiaoyuzhou allow only their own HTTPS hosts', () => {
  assert.ok(MusicCore.buildEmbed('qq', 'https://y.qq.com/n/ryqq/player', {}));
  assert.ok(MusicCore.buildEmbed('xiaoyuzhou', 'https://www.xiaoyuzhoufm.com/episode/abc', {}));
  assert.equal(MusicCore.buildEmbed('qq', 'javascript:alert(1)', {}), null);
  assert.equal(MusicCore.buildEmbed('apple', 'https://example.com/album/123', {}), null);
});

test('local playlist parser accepts metadata rows and ignores unsafe sources', () => {
  const tracks = MusicCore.parseLocalPlaylist([
    '热身 | Coach | https://cdn.example.com/warmup.mp3',
    'https://cdn.example.com/focus.ogg',
    '无效 | 测试 | javascript:alert(1)',
  ].join('\n'));

  assert.equal(tracks.length, 2);
  assert.equal(tracks[0].title, '热身');
  assert.equal(tracks[0].artist, 'Coach');
  assert.equal(tracks[1].title, 'focus');
});

test('music configuration clamps volume and validates cover URLs', () => {
  const config = MusicCore.normalizeConfig({
    platform:'local', volume:3, coverUrl:'javascript:alert(1)', noiseType:'invalid', currentTrack:-4,
  });

  assert.equal(config.volume, 1);
  assert.equal(config.coverUrl, '');
  assert.equal(config.noiseType, 'white');
  assert.equal(config.currentTrack, 0);
});

test('manual metadata and generated noise metadata use deterministic fallbacks', () => {
  const external = MusicCore.displayMetadata({platform:'apple', title:'训练歌单', artist:'Apple Music'}, null);
  const noise = MusicCore.displayMetadata({platform:'noise', noiseType:'brown'}, null);

  assert.equal(external.title, '训练歌单');
  assert.equal(noise.title, '棕色噪音');
  assert.equal(noise.artist, '离线背景音');
});
