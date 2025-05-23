# Favicon Setup Instructions

Este diretório contém os favicons do Raid Bitcoin Toolkit.

## Arquivos Implementados

- `favicon.svg` - Ícone SVG vetorial com animação (✅ Implementado)
- `site.webmanifest` - Manifest PWA (✅ Implementado)
- `favicon.ico` - Ícone ICO tradicional (❌ Precisa ser gerado)
- `favicon-192.png` - PNG 192x192 (❌ Precisa ser gerado)
- `favicon-512.png` - PNG 512x512 (❌ Precisa ser gerado)

## Como Gerar os Arquivos PNG e ICO

### Opção 1: Usando ImageMagick (Recomendado)
```bash
# Instalar ImageMagick primeiro
# Windows: choco install imagemagick
# macOS: brew install imagemagick
# Ubuntu: sudo apt install imagemagick

# Gerar ICO
convert -background transparent favicon.svg -resize 32x32 favicon.ico

# Gerar PNGs
convert -background transparent favicon.svg -resize 192x192 favicon-192.png
convert -background transparent favicon.svg -resize 512x512 favicon-512.png
```

### Opção 2: Ferramenta Online
1. Acesse https://realfavicongenerator.net/
2. Upload do arquivo `favicon.svg`
3. Configure as opções
4. Baixe e substitua os arquivos

### Opção 3: VS Code Extension
1. Instale a extensão "Favicon Generator"
2. Clique direito no `favicon.svg`
3. Selecione "Generate Favicons"

## Características do Ícone

- **Design**: Ícone Bitcoin do Lucide React
- **Cor**: Roxo (#a855f7) - cor primária do app
- **Animação**: Pulse (piscar) de 2 segundos
- **Formato**: SVG vetorial com fallbacks PNG/ICO
- **Compatibilidade**: Todos os navegadores modernos + PWA

## Verificação

Após gerar os arquivos, verifique:
1. Favicon aparece na aba do navegador
2. Ícone de favoritos funciona
3. PWA instável funciona corretamente
4. Animação de piscar está ativa 