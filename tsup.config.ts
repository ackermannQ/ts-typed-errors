import { defineConfig } from 'tsup';
export default defineConfig({
  clean: true,
  treeshake: true,
  minify: true,
  sourcemap: true,
  dts: true,
  format: ['esm', 'cjs']
});
