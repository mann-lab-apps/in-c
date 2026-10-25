import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:'./',plugins:[react()],server:{host:'127.0.0.1',port:8096,strictPort:true,fs:{allow:[fileURLToPath(new URL('../../',import.meta.url))]}},build:{outDir:'../../docs/brand/ddirori-design-system/product-design-r3/preview',emptyOutDir:true,rollupOptions:{input:fileURLToPath(new URL('./catalog/product-r3.html',import.meta.url))}}});
