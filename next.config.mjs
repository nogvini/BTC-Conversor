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
    
    return config;
  },
}

export default nextConfig
