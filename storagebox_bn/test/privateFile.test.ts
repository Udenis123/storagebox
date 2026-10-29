import { ownerMadePrivateCopy, privateAssetKind } from '@/lib/privateFile';

describe('private file copy', () => {
  it('names images, video, audio and other files', () => {
    expect(privateAssetKind('image/jpeg')).toBe('image');
    expect(privateAssetKind('video/mp4')).toBe('video');
    expect(privateAssetKind('audio/mpeg')).toBe('audio');
    expect(privateAssetKind('application/pdf')).toBe('file');
  });

  it('explains that the owner made the asset private', () => {
    expect(ownerMadePrivateCopy('image/png')).toEqual({
      title: 'This image is private',
      message: 'The owner of this image made it private.',
    });
    expect(ownerMadePrivateCopy('application/pdf').message).toBe('The owner of this file made it private.');
  });
});
