import path from 'path';
import { randomBytes } from 'crypto';

/** How a browser-opened document is shown: rendered in the page, or handed to Office Online. */
export type ViewerKind = 'pdf' | 'docx' | 'pptx' | 'sheet' | 'text' | 'office';

/**
 * Formats shown in the viewer page. Browsers download Office files, and many phones download PDFs,
 * so those render here; images, video, audio, txt and json open natively.
 */
const VIEWER_KINDS: Record<string, ViewerKind> = {
  pdf: 'pdf',
  docx: 'docx',
  pptx: 'pptx',
  xlsx: 'sheet',
  xls: 'sheet',
  csv: 'sheet',
  md: 'text',
  doc: 'office',
  ppt: 'office',
  odt: 'office',
  rtf: 'office',
};

export const viewerKindFor = (ext: string): ViewerKind | undefined => VIEWER_KINDS[ext];

export const VIEWER_ASSET_PREFIX = '_viewer';

const packageFile = (entry: string, file: string): string => path.join(path.dirname(require.resolve(entry)), file);

export const VIEWER_ASSETS: Record<string, string> = {
  'pdf.min.mjs': require.resolve('pdfjs-dist/build/pdf.min.mjs'),
  'pdf.worker.min.mjs': require.resolve('pdfjs-dist/build/pdf.worker.min.mjs'),
  'pptx-preview.umd.js': packageFile('pptx-preview', 'pptx-preview.umd.js'),
  'docx-preview.min.js': packageFile('docx-preview', 'docx-preview.min.js'),
  'jszip.min.js': require.resolve('jszip/dist/jszip.min.js'),
  'xlsx.full.min.js': require.resolve('xlsx/dist/xlsx.full.min.js'),
};

/** PDF.js is an ES module, imported on demand by the page script rather than listed here. */
const SCRIPTS_BY_KIND: Record<ViewerKind, string[]> = {
  pdf: [],
  pptx: ['pptx-preview.umd.js'],
  docx: ['jszip.min.js', 'docx-preview.min.js'],
  sheet: ['xlsx.full.min.js'],
  text: [],
  office: [],
};

const OFFICE_EMBED_URL = 'https://view.officeapps.live.com/op/embed.aspx?src=';

export interface ViewerPage {
  kind: ViewerKind;
  fileName: string;
  sizeLabel: string;
  /** Same-origin URL that returns the raw bytes (keeps any signature). */
  rawPath: string;
  downloadPath: string;
  /** Absolute raw URL when the API is publicly reachable — required by Office Online. */
  publicRawUrl?: string;
  /** Shown inside another app (the dashboard), which already has its own name and download controls. */
  isEmbedded?: boolean;
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

const STYLES = `
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#f1f5f9;color:#0f172a;display:flex;flex-direction:column}
header{display:flex;align-items:center;gap:14px;padding:12px 20px;background:#fff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:2}
.brand{font-weight:800;letter-spacing:-.02em;white-space:nowrap}.brand b{color:#4f46e5}
.meta{min-width:0;flex:1;display:grid}.name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sub{font-size:13px;color:#64748b}
.btn{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 16px;border-radius:999px;background:#4f46e5;color:#fff;font-weight:500;font-size:14px;text-decoration:none;white-space:nowrap}
.btn:hover{background:#4338ca}
main{flex:1;min-height:0;overflow:auto}
.status{display:grid;place-items:center;gap:10px;padding:80px 20px;text-align:center;color:#64748b}
.spinner{width:28px;height:28px;border:3px solid #c7d2fe;border-top-color:#4f46e5;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.docx-wrapper{background:#f1f5f9!important;padding:32px 16px!important}.docx-wrapper>section.docx{box-shadow:0 10px 30px -12px rgba(15,23,42,.25);margin-bottom:24px!important}
.tabs{display:flex;gap:4px;padding:10px 20px 0;background:#fff;border-bottom:1px solid #e2e8f0;overflow-x:auto}
.tab{border:0;background:none;padding:8px 14px;border-radius:8px 8px 0 0;font:inherit;font-size:14px;color:#64748b;cursor:pointer}.tab[aria-selected=true]{background:#eef2ff;color:#3730a3;font-weight:600}
.sheet{padding:20px;overflow:auto}.sheet table{border-collapse:collapse;background:#fff;font-size:14px}
.sheet td{border:1px solid #e2e8f0;padding:7px 12px;white-space:nowrap}.sheet tr:first-child td{background:#f8fafc;font-weight:600;position:sticky;top:0}
.sheet tr:nth-child(even) td{background:#fcfdfe}.sheet tr:hover td{background:#eef2ff}
pre{margin:24px auto;max-width:960px;padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;white-space:pre-wrap;word-break:break-word;font:14px/1.65 "JetBrains Mono",ui-monospace,monospace}
iframe{border:0;width:100%;height:100%;background:#fff}
.pages{display:flex;flex-direction:column;align-items:center;gap:24px;padding:32px 16px}
.page{display:block;max-width:100%;height:auto!important;background:#fff;box-shadow:0 10px 30px -12px rgba(15,23,42,.35)}
.pptx-preview-wrapper{height:auto!important;overflow:visible!important;background:transparent!important;display:flex!important;flex-direction:column;align-items:center;gap:24px;padding:32px 16px}
.pptx-preview-slide-wrapper{margin:0!important;box-shadow:0 10px 30px -12px rgba(15,23,42,.35)}
`;

/** Self-contained page that renders a document the browser would otherwise download. */
export function renderViewerPage(page: ViewerPage): { html: string; csp: string } {
  const nonce = randomBytes(16).toString('base64');
  const config = JSON.stringify({ kind: page.kind, rawPath: page.rawPath, publicRawUrl: page.publicRawUrl ?? null, officeEmbedUrl: OFFICE_EMBED_URL, assetBase: `/f/${VIEWER_ASSET_PREFIX}/` }).replace(
    /</g,
    '\\u003c',
  );
  const scripts = SCRIPTS_BY_KIND[page.kind].map((name) => `<script src="/f/${VIEWER_ASSET_PREFIX}/${name}"></script>`).join('');
  const name = escapeHtml(page.fileName);
  const header = page.isEmbedded
    ? ''
    : `<header><span class="brand">Storage<b>Box</b></span>
<div class="meta"><span class="name">${name}</span><span class="sub">${escapeHtml(page.sizeLabel)}</span></div>
<a class="btn" href="${escapeHtml(page.downloadPath)}">Download</a></header>`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${name} · StorageBox</title><style>${STYLES}</style></head><body>
${header}
<main id="view"><div class="status"><div class="spinner"></div>Opening document…</div></main>
${scripts}<script nonce="${nonce}">
(function(){
var cfg=${config};var view=document.getElementById('view');
function message(text){view.innerHTML='';var box=document.createElement('div');box.className='status';box.textContent=text;view.appendChild(box)}
function fetchRaw(type){return fetch(cfg.rawPath).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r[type]()})}
function fail(){message('This document could not be shown here. Use Download to open it on your device.')}
function pageWidth(){return Math.max(240,Math.min(view.clientWidth-32,960))}
if(cfg.kind==='pdf'){Promise.all([import(cfg.assetBase+'pdf.min.mjs'),fetchRaw('arrayBuffer')]).then(function(r){
  var pdfjs=r[0];pdfjs.GlobalWorkerOptions.workerSrc=cfg.assetBase+'pdf.worker.min.mjs';return pdfjs.getDocument({data:new Uint8Array(r[1])}).promise}).then(function(pdf){
  view.innerHTML='';var list=document.createElement('div');list.className='pages';view.appendChild(list);
  var ratio=Math.min(window.devicePixelRatio||1,2);var width=pageWidth();
  function draw(n){if(n>pdf.numPages)return;return pdf.getPage(n).then(function(page){
    var fit=width/page.getViewport({scale:1}).width;var viewport=page.getViewport({scale:fit*ratio});
    var canvas=document.createElement('canvas');canvas.className='page';canvas.width=Math.floor(viewport.width);canvas.height=Math.floor(viewport.height);
    canvas.style.width=Math.floor(viewport.width/ratio)+'px';list.appendChild(canvas);
    return page.render({canvas:canvas,viewport:viewport}).promise.then(function(){page.cleanup();return draw(n+1)})})}
  return draw(1)}).catch(fail)}
else if(cfg.kind==='pptx'){fetchRaw('arrayBuffer').then(function(buf){view.innerHTML='';var width=pageWidth();
  return pptxPreview.init(view,{width:width,height:Math.round(width*9/16),mode:'list'}).preview(buf)}).catch(fail)}
else if(cfg.kind==='docx'){fetchRaw('blob').then(function(blob){view.innerHTML='';return docx.renderAsync(blob,view,null,{inWrapper:true,ignoreLastRenderedPageBreak:false,experimental:true})}).catch(fail)}
else if(cfg.kind==='sheet'){fetchRaw('arrayBuffer').then(function(buf){
  var book=XLSX.read(new Uint8Array(buf),{type:'array'});view.innerHTML='';
  var tabs=document.createElement('div');tabs.className='tabs';var sheet=document.createElement('div');sheet.className='sheet';
  function show(index){sheet.innerHTML=XLSX.utils.sheet_to_html(book.Sheets[book.SheetNames[index]],{header:'',footer:''});
    Array.prototype.forEach.call(tabs.children,function(t,i){t.setAttribute('aria-selected',String(i===index))})}
  book.SheetNames.forEach(function(n,i){var t=document.createElement('button');t.className='tab';t.textContent=n;t.onclick=function(){show(i)};tabs.appendChild(t)});
  if(book.SheetNames.length>1)view.appendChild(tabs);view.appendChild(sheet);show(0)}).catch(fail)}
else if(cfg.kind==='text'){fetchRaw('text').then(function(text){view.innerHTML='';var pre=document.createElement('pre');pre.textContent=text;view.appendChild(pre)}).catch(fail)}
else if(cfg.publicRawUrl){view.innerHTML='';var frame=document.createElement('iframe');frame.title='Document preview';frame.src=cfg.officeEmbedUrl+encodeURIComponent(cfg.publicRawUrl);view.appendChild(frame)}
else{message('A preview for this file type is available once StorageBox is online. Use Download to open it on your device.')}
})();
</script></body></html>`;

  const csp = [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval'`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data: blob:",
    "connect-src 'self'",
    'frame-src https://view.officeapps.live.com',
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');

  return { html, csp };
}
