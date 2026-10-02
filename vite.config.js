import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Match GitHub Pages, which sends `Access-Control-Allow-Origin: *`. A sandboxed
// iframe has an opaque ("null") origin, so the page's own scripts, fonts and
// data are cross-origin requests — without this, local embed testing fails.
const cors = { origin: '*' };

export default defineConfig({
  // Relative base: the build works at https://<user>.github.io/<repo>/ without
  // hardcoding the repo name, and at any other path it's copied to.
  base: './',
  plugins: [react()],
  server: { cors },
  preview: { cors },
});
