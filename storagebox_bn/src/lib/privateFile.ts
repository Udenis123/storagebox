export type PrivateAssetKind = 'image' | 'video' | 'audio' | 'file';

export const privateAssetKind = (mime: string): PrivateAssetKind => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
};

/** Shown when someone opens the permanent link of a private asset. */
export const ownerMadePrivateCopy = (mime: string): { title: string; message: string } => {
  const kind = privateAssetKind(mime);
  return {
    title: `This ${kind} is private`,
    message: `The owner of this ${kind} made it private.`,
  };
};
