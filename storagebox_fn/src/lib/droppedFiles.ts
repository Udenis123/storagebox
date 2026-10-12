/** A picked or dropped file; `relativePath` (e.g. `Trip/Day 1/a.jpg`) is set when it came from a folder. */
export type PickedFile = { file: File; relativePath?: string };

const readBatch = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> =>
  new Promise((resolve, reject) => reader.readEntries(resolve, reject));

const entryFile = (entry: FileSystemFileEntry): Promise<File> => new Promise((resolve, reject) => entry.file(resolve, reject));

async function collect(entry: FileSystemEntry, into: PickedFile[], limit: number): Promise<void> {
  if (into.length >= limit || entry.name.startsWith(".")) return;
  if (entry.isFile) {
    into.push({ file: await entryFile(entry as FileSystemFileEntry), relativePath: entry.fullPath.replace(/^\//, "") });
    return;
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // readEntries returns at most ~100 entries per call; keep reading until it returns none.
  for (let batch = await readBatch(reader); batch.length > 0 && into.length < limit; batch = await readBatch(reader)) {
    for (const child of batch) await collect(child, into, limit);
  }
}

/** Files from a drop, walking into dropped folders. Stops after `limit` files. */
export async function droppedFiles(dataTransfer: DataTransfer, limit: number): Promise<PickedFile[]> {
  const entries = [...dataTransfer.items].map((item) => item.webkitGetAsEntry()).filter((entry): entry is FileSystemEntry => entry !== null);
  if (!entries.some((entry) => entry.isDirectory)) return [...dataTransfer.files].slice(0, limit).map((file) => ({ file }));
  const picked: PickedFile[] = [];
  for (const entry of entries) await collect(entry, picked, limit);
  return picked;
}

/** Files from an `<input webkitdirectory>`, which exposes the folder path on each file. */
export const pickedFolderFiles = (files: FileList, limit: number): PickedFile[] =>
  [...files]
    .filter((file) => !file.name.startsWith("."))
    .slice(0, limit)
    .map((file) => ({ file, relativePath: file.webkitRelativePath || undefined }));
