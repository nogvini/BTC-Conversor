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
    // Força o uso do Babel em vez do SWC
    forceSwcTransforms: false,
    // Melhorar a manipulação de erros do not-found
    serverActions: {
      allowedOrigins: ['localhost:3000', 'vercel.app'],
    },
    serverExternalPackages: [
      'recharts',
      '@react-pdf/renderer',
      'zlib',
      'crypto-browserify',
      'path-browserify',
      'stream-browserify',
      'recharts-scale',
      'd3-color',
      'd3-interpolate',
      'd3-shape',
      'd3-path',
      'd3-scale',
      'd3-time',
      'd3-array',
      'd3-format',
      'd3-time-format',
      'resize-observer-polyfill',
      'decimal.js-light',
      'eventemitter3',
      'react-smooth'
    ]
  },
  // Permitir páginas 404 personalizadas
  async redirects() {
    return [];
  },
  async headers() {
    return [
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
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      zlib: require.resolve('browserify-zlib'),
      crypto: require.resolve('crypto-browserify'),
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
    };

    return config;
  },
  transpilePackages: [
    '@react-pdf/renderer',
    'ahooks'
  ],
  env: {
    NEXT_PUBLIC_SWC_MINIFY: 'false',
    DISABLE_SWC: 'true'
  },
}

module.exports = nextConfig 