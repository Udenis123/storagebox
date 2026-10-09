import {
  extensionForMime,
  extensionOf,
  isAllowedExtension,
  isTransformable,
  kindForExtension,
  mimeForExtension,
} from '@/lib/fileTypes';
import { slugify } from '@/utils/slug';

describe('file type policy', () => {
  it('reads extensions case-insensitively', () => {
    expect(extensionOf('Report.Final.DOCX')).toBe('docx');
    expect(extensionOf('README')).toBe('');
  });

  it('allows documents and images but not executables', () => {
    expect(isAllowedExtension('pdf')).toBe(true);
    expect(isAllowedExtension('docx')).toBe(true);
    expect(isAllowedExtension('png')).toBe(true);
    expect(isAllowedExtension('exe')).toBe(false);
    expect(isAllowedExtension('html')).toBe(false);
  });

  it('maps extensions to mime types and kinds', () => {
    expect(mimeForExtension('pdf')).toBe('application/pdf');
    expect(kindForExtension('docx')).toBe('document');
    expect(kindForExtension('mp4')).toBe('video');
    expect(extensionForMime('image/png; charset=binary')).toBe('png');
  });

  it('only transforms raster images', () => {
    expect(isTransformable('jpg')).toBe(true);
    expect(isTransformable('svg')).toBe(false);
    expect(isTransformable('pdf')).toBe(false);
  });
});

describe('slugify', () => {
  it('produces URL-safe identifiers', () => {
    expect(slugify('Facture Été 2026 (final)')).toBe('facture-ete-2026-final');
    expect(slugify('  ---  ')).toBe('');
  });
});
