import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// App pessoal mobile-first. host:true expõe na rede local para testar no celular.
// PORT (quando definida pelo ambiente, ex.: preview) tem prioridade sobre a 5173.
// DEPLOY_BASE é definida pelo workflow do GitHub Pages (/le-repertoire/);
// local continua servindo na raiz.
export default defineConfig({
  base: process.env.DEPLOY_BASE ?? '/',
  plugins: [react()],
  server: { host: true, port: Number(process.env.PORT) || 5173 },
});
