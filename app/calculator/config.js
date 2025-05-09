// Este arquivo serve para configurar a página calculator como dinâmica
// e evitar problemas com renderização estática em hooks client-side

// Configuração para que a rota de API seja usada em vez da página
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0; 