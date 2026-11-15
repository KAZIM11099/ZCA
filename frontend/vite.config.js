import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
const securityHeaders = { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' };

export default defineConfig(({ mode }) => {
  const { VITE_API_URL: apiUrl } = loadEnv(mode, process.cwd(), '');
  const apiOrigin = apiUrl ? new URL(apiUrl).origin : '';
  return {
    plugins: [
      react(),
      {
        name: 'api-origin-preconnect',
        transformIndexHtml(html) {
          const preconnect = apiOrigin ? `<link rel="preconnect" href="${apiOrigin}" crossorigin />` : '';
          return html.replace('<!-- API_PRECONNECT -->', preconnect);
        },
      },
    ],
    server: { port: 5173, headers: securityHeaders },
    preview: { headers: securityHeaders },
  };
});
