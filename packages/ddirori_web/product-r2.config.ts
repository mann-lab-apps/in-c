import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:'./',plugins:[react()],server:{fs:{allow:[fileURLToPath(new URL('../../',import.meta.url))]}},build:{outDir:'../../docs/brand/ddirori-design-system/product-design-r2/preview',emptyOutDir:true,rollupOptions:{input:fileURLToPath(new URL('./catalog/product-r2.html',import.meta.url))}}});
