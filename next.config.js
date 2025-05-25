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
  experimental: {
    // Melhorar a manipulação de erros do not-found
    serverActions: {
      allowedOrigins: ['localhost:3000', 'vercel.app'],
    }
  },
  // Permitir páginas 404 personalizadas
  async redirects() {
    return [];
  },
  async headers() {
    return [
      {
        source: '/site.webmanifest',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
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
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
  // Resolver o problema com o Supabase durante o build
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Quando estiver no servidor durante o build na Vercel,
      // ignorar o módulo do Supabase se necessário
      if (process.env.VERCEL_ENV) {
        console.log('Configurando build para ambiente Vercel');
      }
    }
    
    // Adicionar fallbacks básicos para módulos de navegador
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
  transpilePackages: [
    '@react-pdf/renderer',
    'ahooks'
  ],
}

module.exports = nextConfig 