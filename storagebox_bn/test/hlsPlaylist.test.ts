import { rewritePlaylistUrls } from '@/lib/hlsPlaylist';
import { variantsForHeight } from '@/lib/videoHls';

describe('rewritePlaylistUrls', () => {
  it('appends the signed query to relative playlist and segment lines', () => {
    const body = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1200000
0/playlist.m3u8
#EXTINF:4.0,
seg_000.ts
`;
    expect(rewritePlaylistUrls(body, 'expires=1&sig=abc')).toContain('0/playlist.m3u8?expires=1&sig=abc');
    expect(rewritePlaylistUrls(body, 'expires=1&sig=abc')).toContain('seg_000.ts?expires=1&sig=abc');
  });

  it('leaves comments alone', () => {
    expect(rewritePlaylistUrls('#EXTM3U\n', 'expires=1')).toBe('#EXTM3U\n');
  });
});

describe('variantsForHeight', () => {
  it('keeps rungs the source can support', () => {
    expect(variantsForHeight(1080).map((v) => v.name)).toEqual(['480p', '720p', '1080p']);
    expect(variantsForHeight(720).map((v) => v.name)).toEqual(['480p', '720p']);
    expect(variantsForHeight(360).map((v) => v.name)).toEqual(['480p']);
  });
});
