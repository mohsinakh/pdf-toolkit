import './style.css';
import { PDFDocument } from 'pdf-lib';
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
  deletePages: {
    title: 'Delete PDF Pages',
    desc: 'Remove one or more pages from a PDF.',
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
      <div class="controls" data-controls="${key}"></div>
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
  if (key === 'deletePages') {
    html += `
      <label>Pages to delete (comma-separated, e.g. 2,5,7)
        <input type="text" id="delete-pages-${key}" placeholder="2,5,7" style="background:var(--card2);border:1px solid var(--border);color:var(--ink);padding:8px 10px;border-radius:8px;min-width:180px" />
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
  const fromP = (Number(from) || 1);
  const toP = (Number(to) || Math.min(fromP, total));
  const pages = [];
  for (let i = fromP; i <= toP; i++) pages.push(i - 1);
  const d = await PDFDocument.create();
  const cp = await d.copyPages(src, pages);
  cp.forEach((p) => d.addPage(p));
  return [{ blob: new Blob([await d.save()], { type: 'application/pdf' }), name: `${file.name.replace('.pdf', '')}-range-${fromP}-${toP}.pdf` }];
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

async function deletePDFPages(file, pagesToDelete) {
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const toDelete = new Set(pagesToDelete.map((p) => p - 1).filter((i) => i >= 0 && i < total));
  const keepIndices = [];
  for (let i = 0; i < total; i++) {
    if (!toDelete.has(i)) keepIndices.push(i);
  }
  if (keepIndices.length === total) throw new Error('No valid pages to delete.');
  const d = await PDFDocument.create();
  const cp = await d.copyPages(src, keepIndices);
  cp.forEach((p) => d.addPage(p));
  return { blob: new Blob([await d.save()], { type: 'application/pdf' }), name: file.name.replace('.pdf', '') + '-edited.pdf' };
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
    } else if (key === 'deletePages') {
      const input = document.getElementById(`delete-pages-${key}`).value;
      const pagesToDelete = input.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      if (pagesToDelete.length === 0) throw new Error('Enter page numbers to delete, e.g. 2,5,7');
      const out = await deletePDFPages(list[0], pagesToDelete);
      triggerDownload(out.blob, out.name);
      outItems = ['PDF updated without the selected page(s).'];
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
