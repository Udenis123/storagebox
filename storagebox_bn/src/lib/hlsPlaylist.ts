/** Append the request query to every URI line so signed private streams keep working. */
export function rewritePlaylistUrls(body: string, query: string): string {
  const suffix = query.replace(/^\?/, '');
  if (!suffix) return body;
  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      if (trimmed.includes('://')) {
        const url = new URL(trimmed);
        for (const part of suffix.split('&')) {
          const [key, value = ''] = part.split('=');
          if (key) url.searchParams.set(key, decodeURIComponent(value));
        }
        return url.toString();
      }
      return trimmed.includes('?') ? `${trimmed}&${suffix}` : `${trimmed}?${suffix}`;
    })
    .join('\n');
}
