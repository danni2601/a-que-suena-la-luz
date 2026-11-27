import {defineConfig} from 'vite';

export default defineConfig({
  base:'./',
  build:{
    rollupOptions:{
      output:{
        entryFileNames:'atlas.js',
        assetFileNames:asset=>asset.names.some(name=>name.endsWith('.css'))
          ? 'estilos.css'
          : 'assets/[name]-[hash][extname]'
      }
    }
  }
});
