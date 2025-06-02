/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Permitir páginas 404 personalizadas
  async redirects() {
    return [];
  },
  async headers() {
    return [
      // Configurações para manifest e ícones
      {
        source: '/site.webmanifest',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          }
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          }
        ],
      },
      {
        source: '/favicon-192.png',
        headers: [
          {
            key: 'Content-Type',
            value: 'image/png',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          },
        ],
      },
      {
        source: '/favicon-512.png',
        headers: [
          {
            key: 'Content-Type',
            value: 'image/png',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          },
        ],
      },
      {
        source: '/browserconfig.xml',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/xml',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          },
        ],
      },
      // Configurações específicas para APIs
      {
        source: '/api/export/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      // Cabeçalhos padrão para outras rotas
      {
        source: '/((?!_next|api|favicon|site.webmanifest|browserconfig.xml|favicon-\\d+\\.png).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
  // Configuração para puppeteer/chromium
  webpack: (config, { isServer, dev }) => {
    // Adicionar configurações específicas para o Chromium
    if (isServer) {
      config.externals = [...config.externals, 'puppeteer-core'];
    }
    
    return config;
  },
  transpilePackages: [
    '@react-pdf/renderer',
    'ahooks'
  ],
}

module.exports = nextConfig 