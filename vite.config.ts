import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Actions sets this for project pages; localhost remains rooted.
  base: process.env.GITHUB_ACTIONS ? '/The_Seventh_Chime/' : '/',
});
