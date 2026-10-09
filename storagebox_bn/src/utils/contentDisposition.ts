export type Disposition = 'attachment' | 'inline';

/** RFC 6266: `filename` is an ASCII fallback, `filename*` carries the exact UTF-8 name. */
export function contentDisposition(fileName: string, disposition: Disposition = 'attachment'): string {
  const asciiFallback = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_');
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
