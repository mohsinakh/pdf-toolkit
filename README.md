# PDF Toolkit

A 100% in-browser PDF and image toolkit. Merge, split, compress, protect, convert and edit PDFs — all on your device. No uploads, no signup, no watermarks. Your files never leave your browser.

> **Live:** https://mohsinakh.github.io/pdf-toolkit/
> **Privacy policy:** https://mohsinakh.github.io/pdf-toolkit/privacy.html

## Features

### Organize
- **Merge PDF** — combine multiple PDFs into one document
- **Split PDF** — one file per page, or a specific range
- **Reorder PDF** — reverse pages, or move first/last
- **Extract Pages** — pull selected pages into a new PDF
- **Delete Pages** — remove unwanted pages
- **Insert Blank** — insert blank pages after any page
- **Duplicate Pages** — duplicate pages or the whole document

### Edit
- **Rotate PDF** — rotate pages by 90, 180 or 270 degrees
- **Crop PDF** — trim the edges of every page
- **Watermark** — stamp text like DRAFT or CONFIDENTIAL on every page
- **Page Numbers** — print page numbers at the bottom
- **Flip PDF** — mirror pages horizontally or vertically
- **Resize Pages** — change page size, add margins
- **N-up** — print multiple pages per sheet
- **Edit Metadata** — change title, author, subject and keywords

### Optimize
- **Compress PDF** — reduce file size by re-rendering pages at chosen quality
- **Remove Blank** — automatically strip empty pages
- **Grayscale** — make the document black and white
- **Flatten Form** — make fillable forms read-only
- **PDF Info** — page count, file size and document metadata

### Convert
- **PDF to Images** — convert each page to JPG or PNG
- **Images to PDF** — turn JPG/PNG images into a single PDF
- **TXT to PDF** — turn plain text into a PDF
- **Extract Images** — pull all embedded images out of a PDF

### Security
- **Protect PDF** — encrypt with a password and set permissions
- **Unlock PDF** — remove a password (enter it in the tool)

### Image Tools
- **Compress Image** — shrink image file sizes offline
- **Convert Image** — convert between PNG, JPEG and WebP formats

Everything runs locally in your browser, so it is fast, private, and free forever.

## Tech stack

- [Vite](https://vitejs.dev/) — build tool
- [pdf-lib](https://github.com/Hopding/pdf-lib) — PDF manipulation
- [@cantoo/pdf-lib](https://github.com/Cantoo-Inc/pdf-lib) — PDF encryption (protect/unlock)
- [pdf.js](https://mozilla.github.io/pdf.js/) — PDF page rendering (compress, flip, grayscale, resize, PDF-to-images)
- [jszip](https://github.com/Stuk/jszip) — ZIP creation for multi-file downloads
- [browser-image-compression](https://www.npmjs.com/package/browser-image-compression) — image handling
- Pure vanilla JavaScript — no framework

## Getting started

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
```

## Deployment

The app auto-deploys to GitHub Pages via the GitHub Actions workflow in `.github/workflows/deploy.yml` on push to `main`.

## License

Open source and free to use. See the repository for details.
