import { viewerKindFor } from '@/lib/documentViewer';

describe('viewerKindFor', () => {
  it('plays video and audio in the browser instead of downloading them', () => {
    expect(viewerKindFor('mp4')).toBe('video');
    expect(viewerKindFor('mov')).toBe('video');
    expect(viewerKindFor('webm')).toBe('video');
    expect(viewerKindFor('mp3')).toBe('audio');
    expect(viewerKindFor('wav')).toBe('audio');
  });

  it('leaves images to the browser', () => {
    expect(viewerKindFor('jpg')).toBeUndefined();
    expect(viewerKindFor('png')).toBeUndefined();
  });
});
