import './style.css';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import imageCompression from 'browser-image-compression';

// ---------- Tool definitions ----------
const TOOLS = {
  merge: {
    title: 'Merge PDFs',
    desc: 'Combine multiple PDF files into one document.',
    multi: true,
    accept: 'application/pdf',
    label: 'Choose PDF files',
  },
  split: {
    title: 'Split PDF',
    desc: 'Split a PDF into separate single-page files, or extract a page range.',
    multi: false,
    accept: 'application/pdf',
    label: 'Choose a PDF',
  },
  rotate: {
    title: 'Rotate PDF',
    desc: 'Rotate all pages (or only some) by 90, 180 or 270 degrees.',
    multi: false,
    accept: 'application/pdf',
    label: 'Choose a PDF',
  },
  reorder: {
    title: 'Reorder PDF',
    desc: 'Reverse the page order, or move the first/last page to the other end.',
    multi: false,
    accept: 'application/pdf',
    label: 'Choose a PDF',
  },
  extract: {
    title: 'Extract Pages',
    desc: 'Extract one or more pages into a brand-new PDF, e.g. 1-3,5,7-9.',
    multi: false,
    accept: 'application/pdf',
    label: 'Choose a PDF',
  },
  deletePages: {
    title: 'Delete Pages',
    desc: 'Remove one or more pages from a PDF.',
    multi: false,
    accept: 'application/pdf',
    label: 'Choose a PDF',
  },
  addBlank: {
    title: 'Add Blank Pages',
    desc: 'Insert one or more blank pages into your PDF.',
    multi: false,
    accept: 'application/pdf',
    label: 'Choose a PDF',
  },
  duplicate: {
    title: 'Duplicate Pages',
    desc: 'Duplicate selected pages or the whole document.',
    multi: false,
    accept: 'application/pdf',
    label: 'Choose a PDF',
  },
  removeBlank: {
    title: 'Remove Blank Pages',
    desc: 'Automatically detect and remove empty pages.',
    multi: false,
    accept: 'application/pdf',
    label: 'Choose a PDF',
  },
  txtToPdf: {
    title: 'TXT to PDF',
    desc: 'Turn a plain text file into a clean PDF document.',
    multi: false,
    accept: 'text/plain,.txt',
    label: 'Choose a TXT file',
  },
  metadata: {
    title: 'Edit Metadata',
    desc: 'View and change the title, author, subject and keywords of a PDF.',
    multi: false,
    accept: 'application/pdf',
    label: 'Choose a PDF',
  },
  crop: {
    title: 'Crop PDF',
    desc: 'Trim the edges of every page (useful for removing white margins).',
    multi: false,
    accept: 'application/pdf',
    label: 'Choose a PDF',
  },
  watermark: {
    title: 'Add Watermark',
    desc: 'Stamp text like DRAFT or CONFIDENTIAL across every page.',
    multi: false,
    accept: 'application/pdf',
    label: 'Choose a PDF',
  },
  pageNumbers: {
    title: 'Add Page Numbers',
    desc: 'Print a page number at the bottom of every page.',
    multi: false,
    accept: 'application/pdf',
    label: 'Choose a PDF',
  },
  imagesToPdf: {
    title: 'Images to PDF',
    desc: 'Turn your JPG/PNG images into a single PDF document.',
    multi: true,
    accept: 'image/*',
    label: 'Choose images',
  },
  compress: {
    title: 'Compress Image',
    desc: 'Reduce image file size while keeping good quality. Fully offline.',
    multi: true,
    accept: 'image/*',
    label: 'Choose images',
  },
  convert: {
    title: 'Convert Image Format',
    desc: 'Convert images between PNG, JPEG and WebP formats.',
    multi: true,
    accept: 'image/*',
    label: 'Choose images',
  },
  info: {
    title: 'PDF Info',
    desc: 'See page count, file size and document metadata without installing anything.',
    multi: false,
    accept: 'application/pdf',
    label: 'Choose a PDF',
  },
};

let currentTool = 'merge';
const files = {};

const panelsEl = document.getElementById('panels');
const resultEl = document.getElementById('result');
const tabsEl = document.getElementById('tabs');

function buildPanels() {
  panelsEl.innerHTML = '';
  Object.keys(TOOLS).forEach((key) => {
    const t = TOOLS[key];
    const panel = document.createElement('div');
    panel.className = `panel${key === currentTool ? ' active' : ''}`;
    panel.id = `panel-${key}`;
    panel.innerHTML = `
      <h2>${t.title}</h2>
      <p class="desc">${t.desc}</p>
      <div class="dropzone" data-tool="${key}">
        <p>📁 <strong>${t.label}</strong></p>
        <p style="font-size:13px;margin-top:6px">or drag &amp; drop ${t.multi ? 'files' : 'a file'} here</p>
        <input type="file" ${t.multi ? 'multiple' : ''} accept="${t.accept}" />
      </div>
      <div class="file-list" id="list-${key}"></div>
      <div class="controls" id="controls-${key}"></div>
    `;
    panelsEl.appendChild(panel);
  });
}

function buildControls(key) {
  const c = document.getElementById(`controls-${key}`);
  const t = TOOLS[key];
  let html = '';
  if (key === 'split') {
    html += `
      <label>Split mode
        <select id="split-mode-${key}">
          <option value="all">One file per page</option>
          <option value="range">Only a page range</option>
        </select>
      </label>
      <label class="range-only" style="display:none">From page
        <input type="number" id="split-from-${key}" min="1" value="1" />
      </label>
      <label class="range-only" style="display:none">To page
        <input type="number" id="split-to-${key}" min="1" value="1" />
      </label>`;
  }
  if (key === 'rotate') {
    html += `
      <label>Rotation
        <select id="rotate-angle-${key}">
          <option value="90">90° clockwise</option>
          <option value="180">180°</option>
          <option value="270">270° clockwise (90° counter)</option>
        </select>
      </label>
      <label>Pages <small>(blank = all, e.g. 1,3 or 2-5)</small>
        <input type="text" id="rotate-pages-${key}" placeholder="all" style="background:var(--card2);border:1px solid var(--border);color:var(--ink);padding:8px 10px;border-radius:8px;min-width:160px" />
      </label>`;
  }
  if (key === 'reorder') {
    html += `
      <label>Action
        <select id="reorder-action-${key}">
          <option value="reverse">Reverse all pages</option>
          <option value="first">Move first page to the end</option>
          <option value="last">Move last page to the front</option>
        </select>
      </label>`;
  }
  if (key === 'extract') {
    html += `
      <label>Pages to extract <small>(e.g. 1-3,5,7-9)</small>
        <input type="text" id="extract-pages-${key}" placeholder="1-3" style="background:var(--card2);border:1px solid var(--border);color:var(--ink);padding:8px 10px;border-radius:8px;min-width:160px" />
      </label>`;
  }
  if (key === 'deletePages') {
    html += `
      <label>Pages to delete <small>(comma-separated, e.g. 2,5,7)</small>
        <input type="text" id="delete-pages-${key}" placeholder="2,5,7" style="background:var(--card2);border:1px solid var(--border);color:var(--ink);padding:8px 10px;border-radius:8px;min-width:180px" />
      </label>`;
  }
  if (key === 'addBlank') {
    html += `
      <label>Number of pages
        <input type="number" id="addblank-count-${key}" min="1" value="1" />
      </label>
      <label>Insert after page
        <input type="number" id="addblank-after-${key}" min="1" value="1" />
      </label>`;
  }
  if (key === 'duplicate') {
    html += `
      <label>Pages to duplicate <small>(blank = all, e.g. 2,3 or 1-4)</small>
        <input type="text" id="duplicate-pages-${key}" placeholder="all" style="background:var(--card2);border:1px solid var(--border);color:var(--ink);padding:8px 10px;border-radius:8px;min-width:160px" />
      </label>
      <label>Copies
        <input type="number" id="duplicate-copies-${key}" min="1" value="1" />
      </label>`;
  }
  if (key === 'crop') {
    html += `
      <label>Remove top (pt)
        <input type="number" id="crop-top-${key}" min="0" max="500" value="20" />
      </label>
      <label>Right (pt)
        <input type="number" id="crop-right-${key}" min="0" max="500" value="20" />
      </label>
      <label>Bottom (pt)
        <input type="number" id="crop-bottom-${key}" min="0" max="500" value="20" />
      </label>
      <label>Left (pt)
        <input type="number" id="crop-left-${key}" min="0" max="500" value="20" />
      </label>`;
  }
  if (key === 'txtToPdf') {
    html += `
      <label>Page size
        <select id="txttopdf-size-${key}">
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
        </select>
      </label>
      <label>Max width (chars)
        <input type="number" id="txttopdf-width-${key}" min="20" max="200" value="100" />
      </label>`;
  }
  if (key === 'metadata') {
    html += `
      <div class="meta-form">
        <label>Title <input type="text" id="metadata-title-${key}" placeholder="Document title" style="background:var(--card2);border:1px solid var(--border);color:var(--ink);padding:8px 10px;border-radius:8px;min-width:220px" /></label>
        <label>Author <input type="text" id="metadata-author-${key}" placeholder="Author" style="background:var(--card2);border:1px solid var(--border);color:var(--ink);padding:8px 10px;border-radius:8px;min-width:220px" /></label>
        <label>Subject <input type="text" id="metadata-subject-${key}" placeholder="Subject" style="background:var(--card2);border:1px solid var(--border);color:var(--ink);padding:8px 10px;border-radius:8px;min-width:220px" /></label>
        <label>Keywords <input type="text" id="metadata-keywords-${key}" placeholder="keyword1, keyword2" style="background:var(--card2);border:1px solid var(--border);color:var(--ink);padding:8px 10px;border-radius:8px;min-width:220px" /></label>
      </div>`;
  }
  if (key === 'watermark') {
    html += `
      <label>Text
        <input type="text" id="watermark-text-${key}" value="DRAFT" style="background:var(--card2);border:1px solid var(--border);color:var(--ink);padding:8px 10px;border-radius:8px;min-width:140px" />
      </label>
      <label>Opacity <small>(0–1)</small>
        <input type="number" id="watermark-opacity-${key}" min="0.05" max="1" step="0.05" value="0.3" />
      </label>
      <label>Size
        <input type="number" id="watermark-size-${key}" min="10" max="200" value="60" />
      </label>`;
  }
  if (key === 'pageNumbers') {
    html += `
      <label>Start from
        <input type="number" id="pagenum-start-${key}" min="1" value="1" />
      </label>
      <label>Position
        <select id="pagenum-pos-${key}">
          <option value="bottom">Bottom center</option>
          <option value="bottom-right">Bottom right</option>
        </select>
      </label>`;
  }
  if (key === 'compress') {
    html += `
      <label>Quality
        <input type="number" id="compress-quality-${key}" min="0.1" max="1" step="0.05" value="0.7" />
      </label>
      <label>Max width (px)
        <input type="number" id="compress-width-${key}" min="100" value="1920" />
      </label>`;
  }
  if (key === 'convert') {
    html += `
      <label>Output format
        <select id="convert-format-${key}">
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/webp">WebP</option>
        </select>
      </label>`;
  }
  html += `<button class="btn" id="run-${key}" disabled>Run</button>`;
  c.innerHTML = html;

  const modeSel = document.getElementById(`split-mode-${key}`);
  if (modeSel) {
    modeSel.addEventListener('change', () => {
      document.querySelectorAll(`#panel-${key} .range-only`).forEach((el) => {
        el.style.display = modeSel.value === 'range' ? 'flex' : 'none';
      });
    });
  }
  document.getElementById(`run-${key}`).addEventListener('click', () => runTool(key));
}

function renderList(key) {
  const list = document.getElementById(`list-${key}`);
  const runBtn = document.getElementById(`run-${key}`);
  const arr = files[key] || [];
  list.innerHTML = arr
    .map(
      (f, i) => `
      <div class="file-row">
        <span class="name">${f.name}</span>
        <span class="size">${(f.size / 1024 / 1024).toFixed(2)} MB</span>
        <button class="remove" data-key="${key}" data-i="${i}">✕</button>
      </div>`
    )
    .join('');
  runBtn.disabled = arr.length === 0;
  list.querySelectorAll('.remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      files[key].splice(Number(btn.dataset.i), 1);
      renderList(key);
    });
  });
}

function setupDropzones() {
  document.querySelectorAll('.dropzone').forEach((drop) => {
    const key = drop.dataset.tool;
    const input = drop.querySelector('input[type=file]');
    drop.addEventListener('click', () => input.click());
    input.addEventListener('change', () => addFiles(key, [...input.files]));
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('drag');
      addFiles(key, [...e.dataTransfer.files]);
    });
  });
}

function addFiles(key, list) {
  const t = TOOLS[key];
  if (!t.multi && list.length > 1) list = [list[0]];
  files[key] = [...(files[key] || [])];
  list.forEach((f) => {
    if (!t.multi) files[key] = [];
    files[key].push(f);
  });
  renderList(key);
  resultEl.innerHTML = '';
  if (key === 'metadata' && files[key].length) prefillMetadata(key, files[key][0]);
}

async function prefillMetadata(key, file) {
  try {
    const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set(`metadata-title-${key}`, src.getTitle() || '');
    set(`metadata-author-${key}`, src.getAuthor() || '');
    set(`metadata-subject-${key}`, src.getSubject() || '');
    set(`metadata-keywords-${key}`, src.getKeywords() || '');
  } catch (e) { /* ignore */ }
}

// ---------- Formatting helpers ----------
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
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return url;
}

// Parse a page spec like "1-3,5,7-9" into 0-based unique sorted indices.
// A blank spec returns all indices.
function parsePageSpec(spec, total) {
  if (!spec || !spec.trim()) return Array.from({ length: total }, (_, i) => i);
  const set = new Set();
  spec.split(',').forEach((part) => {
    part = part.trim();
    if (!part) return;
    const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (m) {
      const a = Number(m[1]);
      const b = m[2] === undefined ? a : Number(m[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
        if (i >= 1 && i <= total) set.add(i - 1);
      }
    }
  });
  return [...set].sort((x, y) => x - y);
}

function clonePagesToNew(source, indices) {
  return PDFDocument.create().then((out) =>
    out.copyPages(source, indices).then((pages) => {
      pages.forEach((p) => out.addPage(p));
      return out;
    })
  );
}

// ---------- Core tool logic ----------
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
  if (mode === 'all') {
    const blobs = [];
    for (let i = 0; i < total; i++) {
      const d = await PDFDocument.create();
      const [p] = await d.copyPages(src, [i]);
      d.addPage(p);
      blobs.push({ blob: new Blob([await d.save()], { type: 'application/pdf' }), name: `${file.name.replace('.pdf', '')}-page-${i + 1}.pdf` });
    }
    return blobs;
  }
  const fromP = Number(from) || 1;
  const toP = Number(to) || total;
  const pages = [];
  for (let i = fromP; i <= toP; i++) pages.push(i - 1);
  const d = await PDFDocument.create();
  const cp = await d.copyPages(src, pages.filter((i) => i >= 0 && i < total));
  cp.forEach((p) => d.addPage(p));
  return [{ blob: new Blob([await d.save()], { type: 'application/pdf' }), name: `${file.name.replace('.pdf', '')}-range-${fromP}-${toP}.pdf` }];
}

async function rotatePDF(file, angle, spec) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const indices = parsePageSpec(spec, total);
  if (indices.length === 0) throw new Error('No valid pages selected.');
  indices.forEach((i) => src.getPage(i).setRotation(degrees(Number(angle) || 90)));
  return src.save();
}

async function reorderPDF(file, action) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  let order = Array.from({ length: total }, (_, i) => i);
  if (action === 'reverse') order.reverse();
  else if (action === 'first') order = order.slice(1).concat(order[0]);
  else if (action === 'last') order = [order[total - 1]].concat(order.slice(0, total - 1));
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, order);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

async function extractPDFPages(file, spec) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const indices = parsePageSpec(spec, src.getPageCount());
  if (indices.length === 0) throw new Error('No valid pages to extract.');
  const out = await clonePagesToNew(src, indices);
  return out.save();
}

async function deletePDFPages(file, pagesToDelete) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const toDelete = new Set(pagesToDelete.map((p) => p - 1).filter((i) => i >= 0 && i < total));
  const keepIndices = [];
  for (let i = 0; i < total; i++) {
    if (!toDelete.has(i)) keepIndices.push(i);
  }
  if (keepIndices.length === total) throw new Error('No valid pages to delete.');
  const out = await clonePagesToNew(src, keepIndices);
  return out.save();
}

async function watermarkPDF(file, text, opacity, size) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const helv = await src.embedFont(StandardFonts.HelveticaBold);
  src.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const op = Number(opacity) || 0.3;
    const font = Number(size) || 60;
    page.drawText(text, {
      x: width / 2 - helv.widthOfTextAtSize(text, font) / 2,
      y: height / 2 - font / 2,
      size: font,
      font: helv,
      color: rgb(0.55, 0.55, 0.55),
      opacity: op,
    });
  });
  return src.save();
}

async function addPageNumbers(file, start, pos) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const helv = await src.embedFont(StandardFonts.Helvetica);
  const pages = src.getPages();
  const startNum = Number(start) || 1;
  pages.forEach((page, i) => {
    const { width, height } = page.getSize();
    const num = startNum + i;
    const text = `${num} / ${startNum + pages.length - 1}`;
    const size = 10;
    const x = pos === 'bottom-right' ? width - helv.widthOfTextAtSize(text, size) - 40 : width / 2 - helv.widthOfTextAtSize(text, size) / 2;
    page.drawText(text, {
      x,
      y: 24,
      size,
      font: helv,
      color: rgb(0.4, 0.4, 0.4),
    });
  });
  return src.save();
}

async function imagesToPDF(list) {
  const out = await PDFDocument.create();
  const pageSize = 595.28;
  for (const f of list) {
    const bytes = await f.arrayBuffer();
    let img;
    if (f.type === 'image/png') img = await out.embedPng(bytes);
    else img = await out.embedJpg(bytes);
    const scale = Math.min(pageSize / img.width, pageSize / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const page = out.addPage([pageSize, pageSize]);
    page.drawImage(img, {
      x: (pageSize - w) / 2,
      y: (pageSize - h) / 2,
      width: w,
      height: h,
    });
  }
  return out.save();
}

async function compressImage(file, quality, maxWidth) {
  const out = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: Number(maxWidth) || 1920, useWebWorker: true, initialQuality: Number(quality) || 0.7 });
  return { blob: out, name: file.name.replace(/\.[^.]+$/, '') + '-compressed.' + (out.type.split('/')[1] || 'jpg') };
}

async function convertImage(file, format) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  const ext = format.split('/')[1];
  const blob = await new Promise((res) => canvas.toBlob(res, format, 0.9));
  return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.' + ext };
}

async function pdfInfo(file) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  return {
    pages: src.getPageCount(),
    title: src.getTitle() || '—',
    author: src.getAuthor() || '—',
    subject: src.getSubject() || '—',
    keywords: src.getKeywords() || '—',
    creator: src.getCreator() || '—',
    size: file.size,
  };
}

async function addBlankPages(file, count, after) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const afterIdx = Math.min(Math.max(Number(after) || 1, 1), total) - 1;
  const n = Math.max(Number(count) || 1, 1);
  for (let i = 0; i < n; i++) {
    src.insertPage(afterIdx + 1 + i, [595.28, 841.89]);
  }
  return src.save();
}

async function duplicatePagesT(file, spec, copies) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const indices = parsePageSpec(spec, total);
  if (indices.length === 0) throw new Error('No valid pages to duplicate.');
  const n = Math.max(Number(copies) || 1, 1);
  const out = await PDFDocument.create();
  for (let i = 0; i < total; i++) {
    const [page] = await out.copyPages(src, [i]);
    out.addPage(page);
    if (indices.includes(i)) {
      for (let c = 0; c < n; c++) {
        const [dup] = await out.copyPages(src, [i]);
        out.addPage(dup);
      }
    }
  }
  return out.save();
}

// A page is considered blank if it has no meaningful content streams.
async function removeBlankPages(file) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const keep = [];
  for (let i = 0; i < total; i++) {
    const contents = src.getPage(i).node.Contents();
    if (!contents) continue; // no content -> blank page, skip
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
  function drawLine(l) { page.drawText(l.slice(0, charsPerLine), { x: 48, y, size: 12, font: helv, color: rgb(0.1, 0.1, 0.1) }); y -= lineHeight; }
  for (let li = 0; li < lines.length; li++) {
    if (y < 56) { page = out.addPage([width, height]); y = height - 56; }
    drawLine(lines[li].length ? lines[li] : ' ');
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

// ---------- Runner ----------
async function runTool(key) {
  const list = files[key] || [];
  resultEl.innerHTML = '<p>Processing…</p>';
  try {
    let outItems = [];
    if (key === 'merge') {
      if (list.length < 2) throw new Error('Add at least 2 PDFs to merge.');
      const data = await mergePDFs(list);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), 'merged.pdf');
      outItems = ['Merged ' + list.length + ' PDFs into one document.'];
    } else if (key === 'split') {
      const mode = document.getElementById(`split-mode-${key}`).value;
      const from = document.getElementById(`split-from-${key}`).value;
      const to = document.getElementById(`split-to-${key}`).value;
      const results = await splitPDF(list[0], mode, from, to);
      results.forEach((r) => triggerDownload(r.blob, r.name));
      outItems = ['Created ' + results.length + ' file(s).'];
    } else if (key === 'rotate') {
      const angle = document.getElementById(`rotate-angle-${key}`).value;
      const spec = document.getElementById(`rotate-pages-${key}`).value;
      const data = await rotatePDF(list[0], angle, spec);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), list[0].name.replace('.pdf', '') + '-rotated.pdf');
      outItems = ['Pages rotated by ' + angle + '°.'];
    } else if (key === 'reorder') {
      const action = document.getElementById(`reorder-action-${key}`).value;
      const data = await reorderPDF(list[0], action);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), list[0].name.replace('.pdf', '') + '-reordered.pdf');
      outItems = ['Page order updated.'];
    } else if (key === 'extract') {
      const spec = document.getElementById(`extract-pages-${key}`).value;
      const data = await extractPDFPages(list[0], spec);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), list[0].name.replace('.pdf', '') + '-extracted.pdf');
      outItems = ['Extracted selected pages into a new PDF.'];
    } else if (key === 'deletePages') {
      const input = document.getElementById(`delete-pages-${key}`).value;
      const pagesToDelete = input.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      if (pagesToDelete.length === 0) throw new Error('Enter page numbers to delete, e.g. 2,5,7');
      const out = await deletePDFPages(list[0], pagesToDelete);
      triggerDownload(new Blob([out], { type: 'application/pdf' }), list[0].name.replace('.pdf', '') + '-edited.pdf');
      outItems = ['PDF updated without the selected page(s).'];
    } else if (key === 'addBlank') {
      const count = document.getElementById(`addblank-count-${key}`).value;
      const after = document.getElementById(`addblank-after-${key}`).value;
      const data = await addBlankPages(list[0], count, after);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), list[0].name.replace('.pdf', '') + '-with-blank-pages.pdf');
      outItems = ['Added blank page(s) after page ' + after + '.'];
    } else if (key === 'duplicate') {
      const spec = document.getElementById(`duplicate-pages-${key}`).value;
      const copies = document.getElementById(`duplicate-copies-${key}`).value;
      const data = await duplicatePagesT(list[0], spec, copies);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), list[0].name.replace('.pdf', '') + '-duplicated.pdf');
      outItems = ['Duplicated selected page(s).'];
    } else if (key === 'removeBlank') {
      const res = await removeBlankPages(list[0]);
      triggerDownload(new Blob([res.data], { type: 'application/pdf' }), list[0].name.replace('.pdf', '') + '-no-blank.pdf');
      outItems = ['Removed ' + res.removed + ' blank page(s); ' + res.remaining + ' left.'];
    } else if (key === 'txtToPdf') {
      const sizeKey = document.getElementById(`txttopdf-size-${key}`).value;
      const width = document.getElementById(`txttopdf-width-${key}`).value;
      const data = await txtToPdf(list[0], sizeKey, width);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), list[0].name.replace(/\.[^.]+$/, '') + '.pdf');
      outItems = ['Converted text to a PDF.'];
    } else if (key === 'metadata') {
      const fields = {
        title: document.getElementById(`metadata-title-${key}`).value,
        author: document.getElementById(`metadata-author-${key}`).value,
        subject: document.getElementById(`metadata-subject-${key}`).value,
        keywords: document.getElementById(`metadata-keywords-${key}`).value,
      };
      const data = await editMetadata(list[0], fields);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), list[0].name.replace('.pdf', '') + '-meta.pdf');
      outItems = ['Metadata updated.'];
    } else if (key === 'crop') {
      const m = {
        top: document.getElementById(`crop-top-${key}`).value,
        right: document.getElementById(`crop-right-${key}`).value,
        bottom: document.getElementById(`crop-bottom-${key}`).value,
        left: document.getElementById(`crop-left-${key}`).value,
      };
      const data = await cropPDF(list[0], m);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), list[0].name.replace('.pdf', '') + '-cropped.pdf');
      outItems = ['Pages cropped.'];
    } else if (key === 'watermark') {
      const text = document.getElementById(`watermark-text-${key}`).value || 'DRAFT';
      const opacity = document.getElementById(`watermark-opacity-${key}`).value;
      const size = document.getElementById(`watermark-size-${key}`).value;
      const data = await watermarkPDF(list[0], text, opacity, size);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), list[0].name.replace('.pdf', '') + '-watermarked.pdf');
      outItems = ['Watermark "' + text + '" applied to every page.'];
    } else if (key === 'pageNumbers') {
      const start = document.getElementById(`pagenum-start-${key}`).value;
      const pos = document.getElementById(`pagenum-pos-${key}`).value;
      const data = await addPageNumbers(list[0], start, pos);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), list[0].name.replace('.pdf', '') + '-numbered.pdf');
      outItems = ['Page numbers added.'];
    } else if (key === 'imagesToPdf') {
      const data = await imagesToPDF(list);
      triggerDownload(new Blob([data], { type: 'application/pdf' }), 'images.pdf');
      outItems = ['Converted ' + list.length + ' image(s) into a PDF.'];
    } else if (key === 'compress') {
      const quality = document.getElementById(`compress-quality-${key}`).value;
      const width = document.getElementById(`compress-width-${key}`).value;
      const rows = [];
      for (const f of list) {
        const out = await compressImage(f, quality, width);
        triggerDownload(out.blob, out.name);
        rows.push(out);
      }
      outItems = rows.map((r) => `${humanSize(r.blob.size)} — ${r.name}`);
    } else if (key === 'convert') {
      const fmt = document.getElementById(`convert-format-${key}`).value;
      const rows = [];
      for (const f of list) {
        const out = await convertImage(f, fmt);
        triggerDownload(out.blob, out.name);
        rows.push(out);
      }
      outItems = rows.map((r) => `${humanSize(r.blob.size)} — ${r.name}`);
    } else if (key === 'info') {
      const info = await pdfInfo(list[0]);
      outItems = [
        `<b>Pages:</b> ${info.pages}`,
        `<b>Size:</b> ${humanSize(info.size)}`,
        `<b>Title:</b> ${info.title}`,
        `<b>Author:</b> ${info.author}`,
        `<b>Subject:</b> ${info.subject}`,
        `<b>Keywords:</b> ${info.keywords}`,
        `<b>Creator:</b> ${info.creator}`,
      ];
    }
    resultEl.innerHTML =
      '<div class="result-box"><span class="msg-ok">✅ Done. Downloads started.</span><br/><small>' +
      outItems.join('<br/>') +
      '</small></div>';
  } catch (e) {
    resultEl.innerHTML = `<div class="result-box"><span class="msg-err">Error: ${e.message}</span></div>`;
  }
}

// ---------- Init ----------
buildPanels();
Object.keys(TOOLS).forEach(buildControls);
setupDropzones();

tabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  currentTool = btn.dataset.tool;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === btn));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${currentTool}`));
  resultEl.innerHTML = '';
});
