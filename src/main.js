import './style.css';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import imageCompression from 'browser-image-compression';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { PDFDocument as CantoDoc } from '@cantoo/pdf-lib';

// pdfjs worker (served as a static asset by Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const CATS = {
  organize: 'Organize',
  optimize: 'Optimize',
  convert: 'Convert',
  edit: 'Edit',
  security: 'Security',
  image: 'Images',
};

// Category, icon, title, description, accept, multi, enabled, note
const TOOLS = {
  merge:          { cat: 'organize', icon: '🔀', title: 'Merge PDF',      desc: 'Combine multiple PDFs into one.',             accept: 'application/pdf', multi: true,  enabled: true },
  split:          { cat: 'organize', icon: '✂️', title: 'Split PDF',       desc: 'One page per file, or a page range.',         accept: 'application/pdf', multi: false, enabled: true },
  reorder:        { cat: 'organize', icon: '↕️', title: 'Reorder PDF',     desc: 'Reverse pages or move first/last.',           accept: 'application/pdf', multi: false, enabled: true },
  extract:        { cat: 'organize', icon: '📑', title: 'Extract Pages',   desc: 'Pull selected pages into a new PDF.',         accept: 'application/pdf', multi: false, enabled: true },
  deletePages:    { cat: 'organize', icon: '🗑️', title: 'Delete Pages',    desc: 'Remove unwanted pages.',                      accept: 'application/pdf', multi: false, enabled: true },
  insertBlank:    { cat: 'organize', icon: '➕', title: 'Insert Blank',    desc: 'Add blank pages after a page.',               accept: 'application/pdf', multi: false, enabled: true },
  rotate:         { cat: 'edit',     icon: '🔄', title: 'Rotate PDF',      desc: 'Rotate pages by 90/180/270°.',                accept: 'application/pdf', multi: false, enabled: true },
  crop:           { cat: 'edit',     icon: '🌿', title: 'Crop PDF',        desc: 'Trim margins of every page.',                 accept: 'application/pdf', multi: false, enabled: true },
  watermark:      { cat: 'edit',     icon: '🏷️', title: 'Watermark',       desc: 'Stamp text on every page.',                   accept: 'application/pdf', multi: false, enabled: true },
  pageNumbers:    { cat: 'edit',     icon: '🔢', title: 'Page Numbers',    desc: 'Add page numbers at the bottom.',             accept: 'application/pdf', multi: false, enabled: true },
  duplicate:      { cat: 'edit',     icon: '📄🔁', title: 'Duplicate Pages', desc: 'Duplicate pages or the whole file.',         accept: 'application/pdf', multi: false, enabled: true },
  flip:           { cat: 'edit',     icon: '🪞', title: 'Flip PDF',        desc: 'Mirror pages horizontally or vertically.',    accept: 'application/pdf', multi: false, enabled: true },
  resize:         { cat: 'edit',     icon: '📐', title: 'Resize Pages',    desc: 'Change page size and add margins.',           accept: 'application/pdf', multi: false, enabled: true },
  nup:            { cat: 'edit',     icon: '📇', title: 'N-up',            desc: 'Print multiple pages per sheet.',             accept: 'application/pdf', multi: false, enabled: true },
  metadata:       { cat: 'edit',     icon: '🏷️', title: 'Edit Metadata',   desc: 'Change title, author, subject, keywords.',    accept: 'application/pdf', multi: false, enabled: true },
  removeBlank:    { cat: 'optimize', icon: '🧽', title: 'Remove Blank',    desc: 'Automatically strip empty pages.',            accept: 'application/pdf', multi: false, enabled: true },
  compress:       { cat: 'optimize', icon: '🗜️', title: 'Compress PDF',    desc: 'Reduce file size by re-rendering pages.',      accept: 'application/pdf', multi: false, enabled: true },
  grayscale:      { cat: 'optimize', icon: '⚪', title: 'Grayscale',       desc: 'Make the document black & white.',             accept: 'application/pdf', multi: false, enabled: true },
  flatten:        { cat: 'optimize', icon: '📋', title: 'Flatten Form',    desc: 'Make fillable forms read-only.',               accept: 'application/pdf', multi: false, enabled: true },
  pdfToJpg:       { cat: 'convert',  icon: '🖼️', title: 'PDF to Images',   desc: 'Convert each page to JPG or PNG.',             accept: 'application/pdf', multi: false, enabled: true },
  imagesToPdf:    { cat: 'convert',  icon: '📷', title: 'Images to PDF',   desc: 'Turn JPG/PNG images into a single PDF.',       accept: 'image/*',         multi: true,  enabled: true },
  txtToPdf:       { cat: 'convert',  icon: '📝', title: 'TXT to PDF',      desc: 'Turn plain text into a PDF.',                  accept: 'text/plain,.txt', multi: false, enabled: true },
  extractImages:  { cat: 'convert',  icon: '🖼️', title: 'Extract Images',  desc: 'Pull out all embedded images from a PDF.',     accept: 'application/pdf', multi: false, enabled: true },
  protect:        { cat: 'security', icon: '🔒', title: 'Protect PDF',     desc: 'Encrypt with a password.',                     accept: 'application/pdf', multi: false, enabled: true },
  unlock:         { cat: 'security', icon: '🔓', title: 'Unlock PDF',      desc: 'Remove a password (enter it below).',          accept: 'application/pdf', multi: false, enabled: true },
  compressImage:  { cat: 'image',    icon: '📉', title: 'Compress Image',  desc: 'Shrink image file sizes.',                      accept: 'image/*',         multi: true,  enabled: true },
  convertImage:   { cat: 'image',    icon: '🔄', title: 'Convert Image',   desc: 'Convert between PNG/JPEG/WebP.',               accept: 'image/*',         multi: true,  enabled: true },
  info:           { cat: 'optimize', icon: 'ℹ️', title: 'PDF Info',        desc: 'Page count, size and metadata.',               accept: 'application/pdf', multi: false, enabled: true },
};

const el = (id) => document.getElementById(id);
const hero = el('hero');
const grid = el('grid');
const cats = el('cats');
const search = el('search');
const toolView = el('toolView');
const features = el('features');
const dropzone = el('dropzone');
const fileInput = el('fileInput');
const fileList = el('fileList');
const controls = el('controls');
const result = el('result');
const toolTitle = el('toolTitle');
const toolDesc = el('toolDesc');

let currentTool = null;
let files = [];
let hidingSearch = false;

// ---------- Grid / navigation ----------
function renderCats() {
  cats.innerHTML = `<button class="cat active" data-cat="">All</button>` +
    Object.entries(CATS).map(([k, v]) => `<button class="cat" data-cat="${k}">${v}</button>`).join('');
  cats.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat');
    if (!btn) return;
    cats.querySelectorAll('.cat').forEach((c) => c.classList.toggle('active', c === btn));
    renderGrid(btn.dataset.cat, search.value);
  });
}

function renderGrid(cat = '', query = '') {
  const q = query.trim().toLowerCase();
  grid.innerHTML = '';
  Object.entries(TOOLS).forEach(([key, t]) => {
    if (cat && t.cat !== cat) return;
    if (q && !(`${t.title} ${t.desc}`).toLowerCase().includes(q)) return;
    const card = document.createElement('article');
    card.className = 'tool-card' + (t.enabled ? '' : ' disabled');
    card.innerHTML = `
      <div class="t-icon">${t.icon}</div>
      <div class="t-title">${t.title}</div>
      <div class="t-desc">${t.desc}</div>
      ${t.enabled ? '' : '<span class="soon">Requires a server</span>'}`;
    card.title = t.title;
    card.addEventListener('click', () => t.enabled && openTool(key));
    grid.appendChild(card);
  });
}

function openTool(key) {
  currentTool = key;
  files = [];
  const t = TOOLS[key];
  toolTitle.textContent = t.title;
  toolDesc.textContent = t.desc;
  el('dzIcon').textContent = t.icon;
  el('dzLabel').textContent = t.label || (t.multi ? 'Choose files' : 'Choose a PDF');
  fileInput.accept = t.accept;
  fileInput.multiple = t.multi;
  fileList.innerHTML = '';
  result.innerHTML = '';
  controls.innerHTML = '';
  buildControls(key);
  hero.hidden = true;
  toolView.hidden = false;
  features.hidden = true;
  if (!hidingSearch) { search.value = ''; }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goHome() {
  currentTool = null;
  files = [];
  toolView.hidden = true;
  hero.hidden = false;
  features.hidden = false;
  renderGrid();
}

// ---------- File handling ----------
function addFiles(list) {
  const t = TOOLS[currentTool];
  if (!t.multi) list = list.slice(0, 1);
  list.forEach((f) => {
    if (!t.multi) files = [];
    files.push(f);
  });
  renderFileList();
  result.innerHTML = '';
  if (currentTool === 'metadata' && files.length) prefillMetadata(files[0]);
}

function renderFileList() {
  fileList.innerHTML = files
    .map((f, i) => `
      <div class="file-row">
        <span class="name">${escapeHTML(f.name)}</span>
        <span class="size">${humanSize(f.size)}</span>
        <button class="remove" data-i="${i}">✕</button>
      </div>`)
    .join('');
  fileList.querySelectorAll('.remove').forEach((b) =>
    b.addEventListener('click', () => { files.splice(Number(b.dataset.i), 1); renderFileList(); result.innerHTML = ''; })
  );
  const run = el('runBtn');
  if (run) run.disabled = files.length === 0;
}

function escapeHTML(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------- Build per-tool controls ----------
function buildControls(key) {
  let html = '';
  if (key === 'split') {
    html += optionBlock('split', 'Splitmode', [['all', 'One file per page'], ['range', 'Only a range']], 'all') +
      `<label class="blk-range" style="display:none">From page <input type="number" id="splitFrom" min="1" value="1"/></label>` +
      `<label class="blk-range" style="display:none">To page <input type="number" id="splitTo" min="1" value="1"/></label>`;
  }
  if (key === 'rotate') {
    html += optionBlock('rotate', 'Rotation', [['90', '90° clockwise'], ['180', '180°'], ['270', '270° (90° counter)']], '90') +
      `<label>Pages <small>(blank = all, e.g. 1,3 or 2-5)</small><input type="text" id="pages" placeholder="all"/></label>`;
  }
  if (key === 'reorder') {
    html += optionBlock('reorder', 'Action', [['reverse', 'Reverse all pages'], ['first', 'Move first page to the end'], ['last', 'Move last page to the front']], 'reverse');
  }
  if (key === 'extract') {
    html += `<label>Pages to extract <small>(e.g. 1-3,5,7-9)</small><input type="text" id="pages" placeholder="1-3"/></label>`;
  }
  if (key === 'deletePages') {
    html += `<label>Pages to delete <small>(comma-separated, e.g. 2,5,7)</small><input type="text" id="delPages" placeholder="2,5,7"/></label>`;
  }
  if (key === 'insertBlank') {
    html += `<label>Number of blank pages <input type="number" id="blankCount" min="1" value="1"/></label>` +
      `<label>Insert after page <input type="number" id="blankAfter" min="1" value="1"/></label>`;
  }
  if (key === 'duplicate') {
    html += `<label>Pages to duplicate <small>(blank = all)</small><input type="text" id="pages" placeholder="all"/></label>` +
      `<label>Copies <input type="number" id="copyCount" min="1" value="1"/></label>`;
  }
  if (key === 'crop') {
    html += `<label>Top (pt) <input type="number" id="top" min="0" value="20"/></label>` +
      `<label>Right (pt) <input type="number" id="right" min="0" value="20"/></label>` +
      `<label>Bottom (pt) <input type="number" id="bottom" min="0" value="20"/></label>` +
      `<label>Left (pt) <input type="number" id="left" min="0" value="20"/></label>`;
  }
  if (key === 'watermark') {
    html += `<label>Text <input type="text" id="wmText" value="DRAFT"/></label>` +
      `<label>Opacity <small>(0–1)</small><input type="number" id="wmOpacity" min="0.05" max="1" step="0.05" value="0.3"/></label>` +
      `<label>Size <input type="number" id="wmSize" min="10" max="200" value="60"/></label>`;
  }
  if (key === 'pageNumbers') {
    html += `<label>Start number <input type="number" id="pnStart" min="1" value="1"/></label>` +
      optionBlock('pnPos', 'Position', [['bottom', 'Bottom center'], ['bottom-right', 'Bottom right']], 'bottom');
  }
  if (key === 'flip') {
    html += optionBlock('flip', 'Direction', [['horizontal', 'Horizontal (mirror)'], ['vertical', 'Vertical (upside down)']], 'horizontal');
  }
  if (key === 'resize') {
    html += `<label>Page size ${sizeSel('resizeSize')}</label>` +
      `<label>Margin (pt) <input type="number" id="margin" min="0" value="0"/></label>`;
  }
  if (key === 'nup') {
    html += optionBlock('nup', 'Pages per sheet', [['2', '2 per sheet'], ['4', '4 per sheet'], ['6', '6 per sheet']], '4');
  }
  if (key === 'metadata') {
    html = `<div class="meta-form">
      <label>Title <input type="text" id="metaTitle"/></label>
      <label>Author <input type="text" id="metaAuthor"/></label>
      <label>Subject <input type="text" id="metaSubject"/></label>
      <label>Keywords <input type="text" id="metaKeywords" placeholder="k1, k2"/></label>
    </div>`;
  }
  if (key === 'compress') {
    html += `<label>Quality <input type="number" id="cq" min="0.1" max="1" step="0.05" value="0.6"/></label>` +
      `<label>Max dimension (px) <input type="number" id="cDim" min="200" value="1400"/></label>`;
  }
  if (key === 'grayscale') {
    html += `<label>Method ${optionSel('gs', [['luminance', 'Balanced (photographic)'], ['average', 'Simple average']], 0)}</label>`;
  }
  if (key === 'pdfToJpg') {
    html += optionBlock('fmt', 'Output format', [['image/jpeg', 'JPG'], ['image/png', 'PNG']], 'image/jpeg') +
      `<label>Resolution ${optionSel('pdfRes', [['1.5', 'Standard (~110 DPI)'], ['2.5', 'High (~180 DPI)'], ['4', 'Very high (~290 DPI)']], 0)}</label>` +
      `<label>Pages <small>(blank = all)</small><input type="text" id="pages" placeholder="all"/></label>`;
  }
  if (key === 'txtToPdf') {
    html += optionBlock('txtSize', 'Page size', [['a4', 'A4'], ['letter', 'Letter']], 'a4') +
      `<label>Max width (chars) <input type="number" id="txtW" min="20" max="200" value="100"/></label>`;
  }
  if (key === 'protect') {
    html += `<label>Password <input type="password" id="pw" placeholder="Password"/></label>` +
      `<label>Repeat password <input type="password" id="pw2" placeholder="Repeat password"/></label>` +
      `<div class="checklist">
        <label><input type="checkbox" id="perPrint" checked/> Allow printing</label>
        <label><input type="checkbox" id="perCopy" checked/> Allow copying text</label>
        <label><input type="checkbox" id="perMod" checked/> Allow editing</label>
      </div>`;
  }
  if (key === 'unlock') {
    html += `<label>Password <input type="password" id="pw" placeholder="PDF password (if any)"/></label>`;
  }
  if (key === 'compressImage') {
    html += `<label>Quality <input type="number" id="imgQ" min="0.1" max="1" step="0.05" value="0.7"/></label>` +
      `<label>Max width (px) <input type="number" id="imgW" min="100" value="1920"/></label>`;
  }
  if (key === 'convertImage') {
    html += optionBlock('imgFmt', 'Output format', [['image/png', 'PNG'], ['image/jpeg', 'JPEG'], ['image/webp', 'WebP']], 'image/png');
  }
  html += `<button class="btn" id="runBtn" disabled>Run</button>`;
  controls.innerHTML = html;

  const splitSel = el('split');
  if (splitSel) splitSel.addEventListener('change', () => {
    document.querySelectorAll('.blk-range').forEach((x) => (x.style.display = splitSel.value === 'range' ? 'flex' : 'none'));
  });
  el('runBtn').addEventListener('click', runTool);
}

function optionBlock(id, label, opts, def) {
  return `<label>${label} ${optionSel(id, opts, def)}</label>`;
}
function optionSel(id, opts, defIdx) {
  return `<select id="${id}">${opts.map(([v, l], i) => `<option value="${v}"${i === defIdx ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
}
function sizeSel(id) {
  const sizes = [['A4', 595.28, 841.89], ['Letter', 612, 792], ['A5', 419.53, 595.28], ['A3', 841.89, 1190.55], ['Legal', 612, 1008]];
  return `<select id="${id}">${sizes.map(([n]) => `<option value="${n}">${n}</option>`).join('')}</select>`;
}
function standardWH(name) {
  return { A4: [595.28, 841.89], Letter: [612, 792], A5: [419.53, 595.28], A3: [841.89, 1190.55], Legal: [612, 1008] }[name] || [595.28, 841.89];
}

// ---------- pdfjs rendering helper ----------
async function withPdfjs(bytes, fn, password) {
  const data = new Uint8Array(bytes);
  const task = pdfjsLib.getDocument({ data, password: password || undefined });
  const doc = await task.promise;
  try {
    return await fn(doc);
  } finally {
    await doc.destroy();
  }
}

async function renderPageToBlob(page, scale, format, quality) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, viewport }).promise;
  return await new Promise((res) => canvas.toBlob(res, format, quality));
}

// ---------- Formatting & download helpers ----------
function humanSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}
function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function downloadAll(blobs) {
  if (blobs.length === 0) return;
  if (blobs.length === 1) { triggerDownload(blobs[0].blob, blobs[0].name); return; }
  const zip = new JSZip();
  const folder = zip.folder('output');
  blobs.forEach((b) => folder.file(b.name, b.blob));
  const zBlob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(zBlob, 'pdf-toolkit-output.zip');
}

function parsePageSpec(spec, total) {
  if (!spec || !spec.trim()) return Array.from({ length: total }, (_, i) => i);
  const set = new Set();
  spec.split(',').forEach((part) => {
    part = part.trim();
    if (!part) return;
    const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (m) {
      const a = Number(m[1]), b = m[2] === undefined ? a : Number(m[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= total) set.add(i - 1);
    }
  });
  return [...set].sort((a, b) => a - b);
}
async function clonePagesToNew(source, indices) {
  const out = await PDFDocument.create();
  const pages = await out.copyPages(source, indices);
  pages.forEach((p) => out.addPage(p));
  return out;
}

// ---------- Tool implementations ----------
async function mergePDFs(list) {
  const out = await PDFDocument.create();
  for (const f of list) {
    const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

async function splitPDF(file, mode, from, to) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const base = file.name.replace('.pdf', '');
  if (mode === 'all') {
    const out = [];
    for (let i = 0; i < total; i++) {
      const d = await PDFDocument.create();
      const [p] = await d.copyPages(src, [i]);
      d.addPage(p);
      out.push({ blob: new Blob([await d.save()], { type: 'application/pdf' }), name: `${base}-page-${i + 1}.pdf` });
    }
    return out;
  }
  const fromP = Number(from) || 1, toP = Number(to) || total;
  const idx = [];
  for (let i = fromP; i <= toP; i++) if (i >= 1 && i <= total) idx.push(i - 1);
  const d = await clonePagesToNew(src, idx);
  return [{ blob: new Blob([await d.save()], { type: 'application/pdf' }), name: `${base}-range-${fromP}-${toP}.pdf` }];
}

async function rotatePDF(file, angle, spec) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const idx = parsePageSpec(spec, src.getPageCount());
  if (!idx.length) throw new Error('No valid pages selected.');
  idx.forEach((i) => src.getPage(i).setRotation(degrees(Number(angle) || 90)));
  return src.save();
}

async function reorderPDF(file, action) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  let order = Array.from({ length: total }, (_, i) => i);
  if (action === 'reverse') order.reverse();
  else if (action === 'first') order = order.slice(1).concat(order[0]);
  else if (action === 'last') order = [order[total - 1]].concat(order.slice(0, total - 1));
  const out = await clonePagesToNew(src, order);
  return out.save();
}

async function extractPages(file, spec) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const idx = parsePageSpec(spec, src.getPageCount());
  if (!idx.length) throw new Error('No valid pages to extract.');
  const out = await clonePagesToNew(src, idx);
  return out.save();
}

async function deletePages(file, delStr) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const toDelete = new Set(delStr.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)).map((p) => p - 1).filter((i) => i >= 0 && i < total));
  if (toDelete.size === 0) throw new Error('Enter valid page numbers to delete.');
  const keep = [];
  for (let i = 0; i < total; i++) if (!toDelete.has(i)) keep.push(i);
  const out = await clonePagesToNew(src, keep);
  return out.save();
}

async function insertBlank(file, count, after) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const afterIdx = Math.min(Math.max(Number(after) || 1, 1), total) - 1;
  const n = Math.max(Number(count) || 1, 1);
  for (let i = 0; i < n; i++) src.insertPage(afterIdx + 1 + i, [595.28, 841.89]);
  return src.save();
}

async function duplicatePages(file, spec, copies) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const idx = parsePageSpec(spec, total);
  const n = Math.max(Number(copies) || 1, 1);
  const out = await PDFDocument.create();
  for (let i = 0; i < total; i++) {
    const [pg] = await out.copyPages(src, [i]);
    out.addPage(pg);
    if (idx.includes(i)) for (let c = 0; c < n; c++) { const [d] = await out.copyPages(src, [i]); out.addPage(d); }
  }
  return out.save();
}

async function cropPDF(file, m) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  src.getPages().forEach((page) => {
    const box = page.getMediaBox();
    const l = Math.min(Number(m.left) || 0, box.width / 2 - 1);
    const r = Math.min(Number(m.right) || 0, box.width / 2 - 1);
    const t = Math.min(Number(m.top) || 0, box.height / 2 - 1);
    const b = Math.min(Number(m.bottom) || 0, box.height / 2 - 1);
    page.setCropBox(box.x + l, box.y + b, box.width - l - r, box.height - t - b);
  });
  return src.save();
}

async function watermarkPDF(file, text, opacity, size) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const helv = await src.embedFont(StandardFonts.HelveticaBold);
  src.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const op = Number(opacity) || 0.3, font = Number(size) || 60;
    page.drawText(text, { x: width / 2 - helv.widthOfTextAtSize(text, font) / 2, y: height / 2 - font / 2, size: font, font: helv, color: rgb(0.4, 0.4, 0.4), opacity: op });
  });
  return src.save();
}

async function pageNumbersPDF(file, start, pos) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const helv = await src.embedFont(StandardFonts.Helvetica);
  const pages = src.getPages();
  const num = Number(start) || 1;
  pages.forEach((page, i) => {
    const { width } = page.getSize();
    const t = `${num + i} / ${num + pages.length - 1}`;
    const x = pos === 'bottom-right' ? width - helv.widthOfTextAtSize(t, 10) - 40 : width / 2 - helv.widthOfTextAtSize(t, 10) / 2;
    page.drawText(t, { x, y: 24, size: 10, font: helv, color: rgb(0.4, 0.4, 0.4) });
  });
  return src.save();
}

async function flipPDF(file, dir) {
  return withPdfjs(await file.arrayBuffer(), async (doc) => {
    const out = await PDFDocument.create();
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvas, viewport }).promise;
      const ctx = canvas.getContext('2d');
      if (dir === 'horizontal') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
      }
      ctx.drawImage(canvas, 0, 0);
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      const img = await out.embedJpg(await blob.arrayBuffer());
      const pw = out.addPage([viewport.width / 1.5, viewport.height / 1.5]);
      pw.drawImage(img, { x: 0, y: 0, width: viewport.width / 1.5, height: viewport.height / 1.5 });
    }
    return out.save();
  });
}

async function resizePDF(file, size, margin) {
  const [W, H] = standardWH(size);
  const m = Number(margin) || 0;
  return withPdfjs(await file.arrayBuffer(), async (doc) => {
    const out = await PDFDocument.create();
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const scale = Math.min((W - 2 * m) / vp.width, (H - 2 * m) / vp.height);
      const cw = Math.max(1, Math.round(vp.width * scale * 1.5));
      const ch = Math.max(1, Math.round(vp.height * scale * 1.5));
      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      await page.render({ canvas, viewport: page.getViewport({ scale: 1.5 }) }).promise;
      const outCanvas = document.createElement('canvas');
      outCanvas.width = W; outCanvas.height = H;
      const ctx = outCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(canvas, Math.round(m * 1.5), Math.round(m * 1.5), Math.round((W - 2 * m) * 1.5), Math.round((H - 2 * m) * 1.5));
      const blob = await new Promise((res) => outCanvas.toBlob(res, 'image/jpeg', 0.9));
      const img = await out.embedJpg(await blob.arrayBuffer());
      const pw = out.addPage([W, H]);
      pw.drawImage(img, { x: 0, y: 0, width: W, height: H });
    }
    return out.save();
  });
}

async function nupPDF(file, perSheet) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const cols = perSheet >= 6 ? 3 : 2;
  const rows = Math.ceil(perSheet / cols);
  const out = await PDFDocument.create();
  const W = 595.28, H = 841.89;
  const pad = 10;
  const cellW = (W - pad * (cols + 1)) / cols;
  const cellH = (H - pad * (rows + 1)) / rows;
  for (let s = 0; s < Math.ceil(total / perSheet); s++) {
    const page = out.addPage([W, H]);
    for (let i = 0; i < perSheet; i++) {
      const srcIdx = s * perSheet + i;
      if (srcIdx >= total) break;
      const orig = src.getPage(srcIdx);
      const box = orig.getMediaBox();
      const scale = Math.min(cellW / box.width, cellH / box.height);
      const w = box.width * scale, h = box.height * scale;
      const col = i % cols, row = Math.floor(i / cols);
      const x = pad + col * (cellW + pad) + (cellW - w) / 2;
      const y = H - pad - (row + 1) * (cellH + pad) + (cellH - h) / 2;
      const embedded = await out.embedPage(orig);
      page.drawPage(embedded, { x, y, width: w, height: h });
    }
  }
  return out.save();
}

async function removeBlankPages(file) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const keep = [];
  for (let i = 0; i < total; i++) {
    const contents = src.getPage(i).node.Contents();
    if (!contents) continue;
    let size = 0;
    let entries = typeof contents.asArray === 'function' ? contents.asArray() : [contents];
    for (const e of entries) {
      const stream = src.context.lookup(e);
      if (stream && typeof stream.getContents === 'function') {
        const c = stream.getContents();
        size += (c && c.length) || 0;
      }
    }
    if (size >= 10) keep.push(i);
  }
  if (keep.length === total) throw new Error('No blank pages found.');
  if (keep.length === 0) throw new Error('Document appears to have no content.');
  const out = await clonePagesToNew(src, keep);
  return { data: await out.save(), removed: total - keep.length, remaining: keep.length };
}

async function compressPDF(file, quality, maxDim) {
  return withPdfjs(await file.arrayBuffer(), async (doc) => {
    const out = await PDFDocument.create();
    const scale = Number(maxDim) / 595.28 || 2;
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const blob = await renderPageToBlob(page, scale, 'image/jpeg', Number(quality) || 0.6);
      const img = await out.embedJpg(await blob.arrayBuffer());
      const vp = page.getViewport({ scale: 1 });
      const pw = out.addPage([vp.width, vp.height]);
      pw.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
    }
    return out.save();
  });
}

async function grayscalePDF(file, method) {
  return withPdfjs(await file.arrayBuffer(), async (doc) => {
    const out = await PDFDocument.create();
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvas, viewport }).promise;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let p = 0; p < d.length; p += 4) {
        const v = method === 'average' ? (d[p] + d[p + 1] + d[p + 2]) / 3 : 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
        d[p] = d[p + 1] = d[p + 2] = v;
      }
      ctx.putImageData(imageData, 0, 0);
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      const img = await out.embedJpg(await blob.arrayBuffer());
      const pw = out.addPage([viewport.width / 1.5, viewport.height / 1.5]);
      pw.drawImage(img, { x: 0, y: 0, width: viewport.width / 1.5, height: viewport.height / 1.5 });
    }
    return out.save();
  });
}

async function flattenPDF(file) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  src.getForm().flatten();
  return src.save();
}

async function pdfToImages(file, format, res, spec) {
  return withPdfjs(await file.arrayBuffer(), async (doc) => {
    const base = file.name.replace(/\.pdf$/i, '');
    const scale = Number(res) || 2;
    const idx = parsePageSpec(spec, doc.numPages);
    const blobs = [];
    for (const i of idx) {
      const page = await doc.getPage(i + 1);
      const blob = await renderPageToBlob(page, scale, format, 0.9);
      const ext = format === 'image/png' ? 'png' : 'jpg';
      blobs.push({ blob, name: `${base}-page-${i + 1}.${ext}` });
    }
    return blobs;
  });
}

async function extractImages(file) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const base = file.name.replace(/\.pdf$/i, '');
  const out = [];
  const seen = new Set();
  const promoted = [];
  const pages = src.getPages();
  for (let pi = 0; pi < pages.length; pi++) {
    const res = pages[pi].node.Resources();
    if (!res) continue;
    const xObj = res.get(asName('XObject'));
    if (!xObj) continue;
    const entries = xObj.entries ? xObj.entries() : [];
    for (const [, xRef] of entries) {
      const xo = src.context.lookup(xRef);
      if (!xo || typeof xo.get !== 'function') continue;
      const sub = xo.get(asName('Subtype'));
      if (!sub || sub.toString() !== '/Image') continue;
      const width = (xo.get(asName('Width')) || {}).valueOf() || 0;
      const height = (xo.get(asName('Height')) || {}).valueOf() || 0;
      if (!width || !height) continue;
      const filter = (xo.get(asName('Filter')) || '').toString();
      const bpc = (xo.get(asName('BitsPerComponent')) || {}).valueOf() || 8;
      let csNode = xo.get(asName('ColorSpace'));
      const color = csNode ? csNode.toString() : '/DeviceRGB';
      if (color.startsWith('[')) continue; // ICC-based -> complex, skip
      let data;
      if (typeof xo.getContents === 'function') data = xo.getContents();
      if (!data || !data.length) continue;
      const key = `${pi}-${xo.ref && xo.ref.toString() ? xo.ref.toString() : ''}-${width}x${height}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (filter === '/DCTDecode') {
        out.push({ blob: new Blob([data], { type: 'image/jpeg' }), name: `${base}-image-${out.length + 1}.jpg` });
      } else if (filter === '/JPXDecode') {
        out.push({ blob: new Blob([data], { type: 'image/jpeg2000' }), name: `${base}-image-${out.length + 1}.jp2` });
      } else {
        promoted.push(decodeRaster(data, width, height, bpc, color).then((blob) =>
          out.push({ blob, name: `${base}-image-${out.length + 1}.png` })
        ));
      }
    }
  }
  await Promise.all(promoted);
  if (!out.length) throw new Error('No images found in this PDF.');
  return out;
}

function asName(s) { return { toString: () => s }; }

function decodeRaster(data, width, height, bpc, color) {
  const channels = color === '/DeviceGray' ? 1 : color === '/DeviceCMYK' ? 4 : 3;
  const bits = Number(bpc) || 8;
  const bytesPerPixel = (channels * bits) / 8;
  const rowBytes = Math.ceil((width * channels * bits) / 8);
  const png = document.createElement('canvas');
  png.width = width; png.height = height;
  const ctx = png.getContext('2d');
  const img = ctx.createImageData(width, height);
  const max = (1 << bits) - 1;
  for (let y = 0; y < height; y++) {
    const rowOff = y * rowBytes;
    for (let x = 0; x < width; x++) {
      const pxOff = rowOff + Math.floor((x * channels * bits) / 8);
      const o = (y * width + x) * 4;
      if (channels === 4) {
        const c = data[pxOff], m = data[pxOff + 1], yy = data[pxOff + 2], k = data[pxOff + 3];
        img.data[o] = 255 * (1 - c / max) * (1 - k / max);
        img.data[o + 1] = 255 * (1 - m / max) * (1 - k / max);
        img.data[o + 2] = 255 * (1 - yy / max) * (1 - k / max);
      } else if (channels === 1) {
        const v = Math.round(255 * (data[pxOff] / max));
        img.data[o] = img.data[o + 1] = img.data[o + 2] = v;
      } else {
        img.data[o] = data[pxOff];
        img.data[o + 1] = data[pxOff + 1];
        img.data[o + 2] = data[pxOff + 2];
      }
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return new Promise((res) => png.toBlob((b) => res(new Blob([b], { type: 'image/png' })), 'image/png'));
}

async function embedImageSmart(out, bytes) {
  const b = new Uint8Array(bytes);
  // Detect real format from magic bytes regardless of content-type
  const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const isJpg = b[0] === 0xff && b[1] === 0xd8;
  if (isPng) return out.embedPng(bytes);
  if (isJpg) return out.embedJpg(bytes);
  // unknown -> try jpg then png
  try { return await out.embedJpg(bytes); } catch { return out.embedPng(bytes); }
}

async function imagesToPDF(list) {
  const out = await PDFDocument.create();
  const P = 595.28;
  for (const f of list) {
    const bytes = await f.arrayBuffer();
    const img = await embedImageSmart(out, bytes);
    const scale = Math.min(P / img.width, P / img.height);
    const w = img.width * scale, h = img.height * scale;
    const page = out.addPage([P, P]);
    page.drawImage(img, { x: (P - w) / 2, y: (P - h) / 2, width: w, height: h });
  }
  return out.save();
}

async function txtToPdf(file, sizeKey, maxWidth) {
  const text = await file.text();
  const out = await PDFDocument.create();
  const helv = await out.embedFont(StandardFonts.Courier);
  const width = sizeKey === 'letter' ? 612 : 595.28;
  const height = sizeKey === 'letter' ? 792 : 841.89;
  const charsPerLine = Math.max(Math.floor(width / 12) - 4, 20);
  const lineHeight = 16;
  const linesPerPage = Math.floor((height - 80) / lineHeight);
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let page = out.addPage([width, height]);
  let y = height - 56;
  function draw(l) { page.drawText(l.slice(0, charsPerLine), { x: 48, y, size: 12, font: helv, color: rgb(0.1, 0.1, 0.1) }); y -= lineHeight; }
  for (const line of lines) {
    if (y < 56) { page = out.addPage([width, height]); y = height - 56; }
    draw(line.length ? line : ' ');
  }
  return out.save();
}

async function editMetadata(file, fields) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  if (fields.title) src.setTitle(fields.title);
  if (fields.author) src.setAuthor(fields.author);
  if (fields.subject) src.setSubject(fields.subject);
  if (fields.keywords) src.setKeywords(fields.keywords.split(',').map((s) => s.trim()).filter(Boolean));
  return src.save();
}

async function prefillMetadata(file) {
  try {
    const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const set = (id, v) => { const e = el(id); if (e) e.value = v || ''; };
    set('metaTitle', src.getTitle() || '');
    set('metaAuthor', src.getAuthor() || '');
    set('metaSubject', src.getSubject() || '');
    set('metaKeywords', (src.getKeywords() || []).join(', '));
  } catch (e) {}
}

async function protectPDF(file, password, perms) {
  const bytes = await file.arrayBuffer();
  const src = await CantoDoc.load(bytes, { ignoreEncryption: true });
  src.encrypt({
    userPassword: password,
    ownerPassword: password,
    permissions: {
      printing: perms.print ? 'highResolution' : false,
      copying: perms.copy,
      modifying: perms.mod,
    },
  });
  return src.save();
}

async function unlockPDF(file, password) {
  const bytes = await file.arrayBuffer();
  const src = await CantoDoc.load(bytes, password ? { password } : undefined);
  const saved = await src.save();
  return saved;
}

async function compressImage(file, quality, maxWidth) {
  const out = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: Number(maxWidth) || 1920, useWebWorker: true, initialQuality: Number(quality) || 0.7 });
  return { blob: out, name: file.name.replace(/\.[^.]+$/, '') + '-compressed.' + (out.type.split('/')[1] || 'jpg') };
}

async function convertImage(file, format) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width; canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  const ext = format.split('/')[1];
  const blob = await new Promise((res) => canvas.toBlob(res, format, 0.9));
  return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.' + ext };
}

async function pdfInfo(file) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  return { pages: src.getPageCount(), title: src.getTitle() || '—', author: src.getAuthor() || '—', subject: src.getSubject() || '—', keywords: (src.getKeywords() || []).join(', ') || '—', creator: src.getCreator() || '—', size: file.size };
}

// ---------- Runner ----------
const baseName = (f) => f.name.replace(/\.pdf$/i, '');
async function runTool() {
  const t = TOOLS[currentTool];
  result.innerHTML = '<div class="result-box">Processing… please wait.</div>';
  try {
    let items = [];
    const v = (id) => { const e = el(id); return e ? e.value : ''; };
    const onePDF = files[0];
    if (currentTool === 'merge') {
      const data = await mergePDFs(files);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), 'merged.pdf');
      items = ['Merged ' + files.length + ' PDFs into one document.'];
    } else if (currentTool === 'split') {
      const res = await splitPDF(onePDF, v('split'), v('splitFrom'), v('splitTo'));
      await downloadAll(res);
      items = ['Created ' + res.length + ' file(s).'];
    } else if (currentTool === 'rotate') {
      const data = await rotatePDF(onePDF, v('rotate'), v('pages'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-rotated.pdf');
      items = ['Pages rotated by ' + v('rotate') + '°.'];
    } else if (currentTool === 'reorder') {
      const data = await reorderPDF(onePDF, v('reorder'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-reordered.pdf');
      items = ['Page order updated.'];
    } else if (currentTool === 'extract') {
      const data = await extractPages(onePDF, v('pages'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-extracted.pdf');
      items = ['Selected pages extracted.'];
    } else if (currentTool === 'deletePages') {
      const data = await deletePages(onePDF, v('delPages'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-edited.pdf');
      items = ['Selected pages removed.'];
    } else if (currentTool === 'insertBlank') {
      const data = await insertBlank(onePDF, v('blankCount'), v('blankAfter'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-with-blank-pages.pdf');
      items = ['Blank page(s) inserted after page ' + v('blankAfter') + '.'];
    } else if (currentTool === 'duplicate') {
      const data = await duplicatePages(onePDF, v('pages'), v('copyCount'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-duplicated.pdf');
      items = ['Selected pages duplicated.'];
    } else if (currentTool === 'crop') {
      const data = await cropPDF(onePDF, { top: v('top'), right: v('right'), bottom: v('bottom'), left: v('left') });
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-cropped.pdf');
      items = ['Pages cropped.'];
    } else if (currentTool === 'watermark') {
      const data = await watermarkPDF(onePDF, v('wmText') || 'DRAFT', v('wmOpacity'), v('wmSize'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-watermarked.pdf');
      items = ['Watermark "' + v('wmText') + '" applied.'];
    } else if (currentTool === 'pageNumbers') {
      const data = await pageNumbersPDF(onePDF, v('pnStart'), v('pnPos'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-numbered.pdf');
      items = ['Page numbers added.'];
    } else if (currentTool === 'flip') {
      const data = await flipPDF(onePDF, v('flip'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-flipped.pdf');
      items = ['Pages flipped (' + v('flip') + ').'];
    } else if (currentTool === 'resize') {
      const data = await resizePDF(onePDF, v('resizeSize'), v('margin'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-resized.pdf');
      items = ['Pages resized to ' + v('resizeSize') + '.'];
    } else if (currentTool === 'nup') {
      const data = await nupPDF(onePDF, Number(v('nup')));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-nup.pdf');
      items = ['Pages laid out ' + v('nup') + '-per-sheet.'];
    } else if (currentTool === 'removeBlank') {
      const res = await removeBlankPages(onePDF);
      triggerDownload(new Blob([res.data], { type: 'application/pdf' }), baseName(onePDF) + '-no-blank.pdf');
      items = ['Removed ' + res.removed + ' blank page(s); ' + res.remaining + ' left.'];
    } else if (currentTool === 'compress') {
      const data = await compressPDF(onePDF, v('cq'), v('cDim'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-compressed.pdf');
      items = ['PDF compressed.'];
    } else if (currentTool === 'grayscale') {
      const data = await grayscalePDF(onePDF, v('gs'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-grayscale.pdf');
      items = ['Document converted to grayscale.'];
    } else if (currentTool === 'flatten') {
      const data = await flattenPDF(onePDF);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-flattened.pdf');
      items = ['Form fields flattened.'];
    } else if (currentTool === 'pdfToJpg') {
      const blobs = await pdfToImages(onePDF, v('fmt'), v('pdfRes'), v('pages'));
      await downloadAll(blobs);
      items = ['Converted ' + blobs.length + ' page(s) to images.'];
    } else if (currentTool === 'imagesToPdf') {
      const data = await imagesToPDF(files);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), 'images.pdf');
      items = ['Converted ' + files.length + ' image(s) into a PDF.'];
    } else if (currentTool === 'txtToPdf') {
      const data = await txtToPdf(onePDF, v('txtSize'), v('txtW'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), onePDF.name.replace(/\.[^.]+$/, '') + '.pdf');
      items = ['Converted text to PDF.'];
    } else if (currentTool === 'extractImages') {
      const res = await extractImages(onePDF);
      await downloadAll(res);
      items = ['Extracted ' + res.length + ' image(s).'];
    } else if (currentTool === 'protect') {
      const pw = v('pw'), pw2 = v('pw2');
      if (!pw) throw new Error('Enter a password.');
      if (pw !== pw2) throw new Error('Passwords do not match.');
      const data = await protectPDF(onePDF, pw, { print: el('perPrint').checked, copy: el('perCopy').checked, mod: el('perMod').checked });
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-protected.pdf');
      items = ['PDF protected with a password.'];
    } else if (currentTool === 'unlock') {
      const data = await unlockPDF(onePDF, v('pw'));
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-unlocked.pdf');
      items = ['Password removed. An unrestricted copy was downloaded.'];
    } else if (currentTool === 'compressImage') {
      const rows = [];
      for (const f of files) {
        const r = await compressImage(f, v('imgQ'), v('imgW'));
        triggerDownload(r.blob, r.name);
        rows.push(r);
      }
      items = rows.map((r) => `${humanSize(r.blob.size)} — ${r.name}`);
    } else if (currentTool === 'convertImage') {
      const rows = [];
      for (const f of files) {
        const r = await convertImage(f, v('imgFmt'));
        triggerDownload(r.blob, r.name);
        rows.push(r);
      }
      items = rows.map((r) => `${humanSize(r.blob.size)} — ${r.name}`);
    } else if (currentTool === 'metadata') {
      const data = await editMetadata(onePDF, { title: v('metaTitle'), author: v('metaAuthor'), subject: v('metaSubject'), keywords: v('metaKeywords') });
      triggerDownload(new Blob([data], { type: 'application/pdf' }), baseName(onePDF) + '-meta.pdf');
      items = ['Metadata updated.'];
    } else if (currentTool === 'info') {
      const info = await pdfInfo(onePDF);
      items = [`<table><tr><th>Pages</th><td>${info.pages}</td></tr><tr><th>Size</th><td>${humanSize(info.size)}</td></tr>` +
        `<tr><th>Title</th><td>${escapeHTML(info.title)}</td></tr><tr><th>Author</th><td>${escapeHTML(info.author)}</td></tr>` +
        `<tr><th>Subject</th><td>${escapeHTML(info.subject)}</td></tr><tr><th>Keywords</th><td>${escapeHTML(info.keywords)}</td></tr>` +
        `<tr><th>Creator</th><td>${escapeHTML(info.creator)}</td></tr></table>`];
    }
    result.innerHTML = `<div class="result-box"><span class="msg-ok">✅ Done. Downloads started.</span><br/><small>${items.join('<br/>')}</small></div>`;
  } catch (e) {
    result.innerHTML = `<div class="result-box"><span class="msg-err">Error: ${e.message}</span></div>`;
  }
}

// ---------- Init ----------
function setupDropzone() {
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { if (currentTool) addFiles([...fileInput.files]); fileInput.value = ''; });
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag');
    if (currentTool) addFiles([...e.dataTransfer.files]);
  });
}

search.addEventListener('input', () => {
  const act = cats.querySelector('.cat.active');
  renderGrid(act ? act.dataset.cat : '', search.value);
});
el('homeBtn').addEventListener('click', goHome);
el('backBtn').addEventListener('click', goHome);

renderCats();
renderGrid();
setupDropzone();