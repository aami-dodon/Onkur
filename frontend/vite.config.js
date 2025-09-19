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

const ensureCrossoriginPlugin = {
  name: 'ensure-crossorigin-attributes',
  transformIndexHtml: {
    enforce: 'post',
    transform(html) {
      const escapeForRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const addCrossoriginBefore = (tag, attribute) => {
        if (/\bcrossorigin\b/.test(tag)) {
          return tag;
        }

        const attributeIndex = tag.indexOf(attribute);
        if (attributeIndex === -1) {
          return tag.replace(/>$/, ' crossorigin="anonymous">');
        }

        return (
          tag.slice(0, attributeIndex) + 'crossorigin="anonymous" ' + tag.slice(attributeIndex)
        );
      };

      const addCrossoriginToScript = (source, scriptSrc) => {
        const pattern = new RegExp(
          `<script\\s+type="module"[^>]*src="${escapeForRegex(scriptSrc)}"[^>]*>\\s*</script>`,
          'g'
        );

        return source.replace(pattern, (tag) => addCrossoriginBefore(tag, 'src='));
      };

      const addCrossoriginToLink = (source, linkHref) => {
        const pattern = new RegExp(
          `<link\\s+rel="modulepreload"[^>]*href="${escapeForRegex(linkHref)}"[^>]*>`,
          'g'
        );

        return source.replace(pattern, (tag) => addCrossoriginBefore(tag, 'href='));
      };

      let transformed = html;
      transformed = addCrossoriginToScript(transformed, '/@vite/client');
      transformed = addCrossoriginToScript(transformed, '/src/main.js');
      transformed = addCrossoriginToLink(transformed, '/@vite/client');

      return transformed;
    },
  },
};

export default defineConfig({
  plugins: [react(), appRouteRewritePlugin, ensureCrossoriginPlugin],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
    proxy: {
      '/api': 'http://localhost:5000', // Proxy API requests to backend
    },
    allowedHosts: ['onkur.dodon.in'],
  },
  build: {
    target: 'es2018',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom')) {
              return 'react-router';
            }
            if (id.includes('react')) {
              return 'react-vendor';
            }
            return 'vendor';
          }

          if (id.includes('src/features/dashboard')) {
            return 'dashboard';
          }

          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.js',
    mockReset: true,
  },
});
