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
    // Adicionar suporte a middlewares
    instrumentationHook: false,
  },
  // Configuração de segurança para o Supabase Auth Helpers
  serverComponentsExternalPackages: ['@supabase/auth-helpers-nextjs'],
}

export default nextConfig
