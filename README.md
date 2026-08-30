# PDF Toolkit

A 100% in-browser PDF and image toolkit. Merge, split, delete pages, compress images, and convert images to/from PDF — no uploads, no signup, no watermarks. Your files never leave your device.

> **Live:** https://mohsinakh.github.io/pdf-toolkit/
> **Privacy policy:** https://mohsinakh.github.io/pdf-toolkit/privacy.html

## Features

- **Merge PDF** — combine multiple PDFs into one
- **Split PDF** — break a PDF into separate files
- **Delete PDF pages** — remove unwanted pages
- **Compress images** — shrink file sizes before sharing
- **Convert images** — images to and from PDF

Everything runs locally in your browser, so it is fast, private, and free forever.

## Tech stack

- [Vite](https://vitejs.dev/) — build tool
- [pdf-lib](https://github.com/Hopding/pdf-lib) — PDF manipulation
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
