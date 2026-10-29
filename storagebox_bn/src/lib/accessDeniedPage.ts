export type AccessDeniedPage = {
  title: string;
  message: string;
  hint?: string;
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

const STYLES = `
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#f1f5f9;color:#0f172a;display:flex;flex-direction:column}
header{display:flex;align-items:center;gap:14px;padding:12px 20px;background:#fff;border-bottom:1px solid #e2e8f0}
.brand{font-weight:800;letter-spacing:-.02em}.brand b{color:#4f46e5}
main{flex:1;display:grid;place-items:center;padding:48px 20px}
.card{width:min(28rem,100%);display:grid;justify-items:center;gap:14px;padding:40px 28px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;text-align:center;box-shadow:0 18px 40px -24px rgb(15 23 42 / .35)}
.icon{width:56px;height:56px;display:grid;place-items:center;border-radius:16px;background:#fff7ed;color:#c2410c}
h1{margin:8px 0 0;font-size:1.35rem;letter-spacing:-.02em}
p{margin:0;color:#64748b;line-height:1.55;font-size:15px}
`;

const LOCK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

/** Friendly page for a browser that opened a private or expired delivery URL. */
export function renderAccessDeniedPage({ title, message, hint }: AccessDeniedPage): { html: string; csp: string } {
  const extra = hint ? `<p>${escapeHtml(hint)}</p>` : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${escapeHtml(title)} · StorageBox</title><style>${STYLES}</style></head>
<body>
<header><span class="brand">Storage<b>Box</b></span></header>
<main>
  <div class="card">
    <span class="icon">${LOCK_ICON}</span>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    ${extra}
  </div>
</main>
</body></html>`;
  const csp = "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'";
  return { html, csp };
}
