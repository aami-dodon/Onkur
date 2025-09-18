import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appRouteRewritePlugin = {
  name: 'app-route-rewrite',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const acceptHeader = req.headers.accept || '';
      if (
        req.method === 'GET' &&
        req.url?.startsWith('/app') &&
        acceptHeader.includes('text/html')
      ) {
        req.url = '/';
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), appRouteRewritePlugin],
  server: {
    proxy: {
      '/api': 'http://localhost:5000', // Proxy API requests to backend
    },
    allowedHosts: ['onkur.dodon.in']
  },
});
