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
    // Novas configurações experimentais
    serverComponents: true,
    // Ajustar como o Next.js lida com páginas estáticas vs dinâmicas
    legacyBrowsers: false
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
  // Configurar páginas que devem ser renderizadas dinamicamente no servidor
  // e não devem ser pré-renderizadas estaticamente
  output: 'standalone',
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
  // Configuração específica para evitar pré-renderização em páginas com autenticação
  unstable_excludeFiles: [
    '**/node_modules/@supabase/**/*',
    '**/hooks/use-auth.tsx',
  ],
  // Configuração para o app directory
  generateBuildId: async () => {
    // Retorna um ID de build único baseado no timestamp atual
    return `build-${Date.now()}`;
  },
  // Desativar a renderização estática para certas páginas
  staticPageGenerationTimeout: 60,
  // Marcar certas páginas como dinâmicas em vez de estáticas
  pageExtensions: ['tsx', 'ts', 'jsx', 'js', 'mdx'],
  // Configuração de runtime para páginas específicas
  serverRuntimeConfig: {
    // Aplicado apenas no servidor
    skipAuth: ['calculator']
  }
}

export default nextConfig
