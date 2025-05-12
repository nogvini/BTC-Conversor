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
    }
    // A opção 'serverExternalPackages' não é mais suportada no Next.js 15.2.4
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
  // Resolver o problema com o Supabase durante o build e adicionar polyfills
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Quando estiver no servidor durante o build na Vercel,
      // ignorar o módulo do Supabase se necessário
      if (process.env.VERCEL_ENV) {
        console.log('Configurando build para ambiente Vercel');
      }
    }
    
    // Adicionar fallbacks para módulos de navegador
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        zlib: false,
        crypto: false,
        path: false,
        stream: false,
      };
    }
    
    // Em vez de transpilePackages, vamos adicionar o Recharts à lista de externals
    if (isServer) {
      config.externals = [...(config.externals || []), 'recharts'];
    }

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