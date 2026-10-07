import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' にしておくと GitHub Pages などのサブパスでもそのまま動く
export default defineConfig({
  base: './',
  plugins: [react()],
});
