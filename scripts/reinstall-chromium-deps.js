/**
 * Script para reinstalar as dependências do Chromium corretamente
 * 
 * Instruções de uso:
 * 1. Execute: node scripts/reinstall-chromium-deps.js
 * 2. Aguarde a conclusão da execução
 * 3. Reinicie o servidor de desenvolvimento
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}=== Utilitário de Reinstalação do Chromium ===${colors.reset}\n`);

try {
  // Verificar se o package.json existe
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json não encontrado. Execute este script na raiz do projeto.');
  }

  console.log(`${colors.yellow}1. Removendo node_modules/@sparticuz/chromium${colors.reset}`);
  try {
    fs.rmSync(path.join(process.cwd(), 'node_modules/@sparticuz/chromium'), { recursive: true, force: true });
    console.log(`${colors.green}   ✓ Diretório removido com sucesso${colors.reset}`);
  } catch (err) {
    console.log(`${colors.yellow}   ⚠ Diretório não encontrado ou não foi possível remover${colors.reset}`);
  }

  console.log(`${colors.yellow}2. Removendo node_modules/puppeteer*${colors.reset}`);
  try {
    fs.rmSync(path.join(process.cwd(), 'node_modules/puppeteer'), { recursive: true, force: true });
    fs.rmSync(path.join(process.cwd(), 'node_modules/puppeteer-core'), { recursive: true, force: true });
    console.log(`${colors.green}   ✓ Diretórios puppeteer removidos com sucesso${colors.reset}`);
  } catch (err) {
    console.log(`${colors.yellow}   ⚠ Diretórios não encontrados ou não foi possível remover${colors.reset}`);
  }

  console.log(`${colors.yellow}3. Reinstalando dependências${colors.reset}`);
  
  // Detectar o gerenciador de pacotes
  let packageManager = 'npm';
  if (fs.existsSync(path.join(process.cwd(), 'yarn.lock'))) {
    packageManager = 'yarn';
  } else if (fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  }

  // Comandos específicos para cada gerenciador de pacotes
  const installCommands = {
    npm: 'npm install --save puppeteer-core@latest @sparticuz/chromium@latest',
    yarn: 'yarn add puppeteer-core@latest @sparticuz/chromium@latest',
    pnpm: 'pnpm add puppeteer-core@latest @sparticuz/chromium@latest'
  };

  console.log(`${colors.blue}   Usando ${packageManager} como gerenciador de pacotes${colors.reset}`);
  console.log(`${colors.blue}   Executando: ${installCommands[packageManager]}${colors.reset}`);

  execSync(installCommands[packageManager], { stdio: 'inherit' });
  console.log(`${colors.green}   ✓ Reinstalação concluída com sucesso${colors.reset}`);

  console.log(`\n${colors.green}✅ Processo concluído com sucesso!${colors.reset}`);
  console.log(`${colors.cyan}Para testar, acesse: http://localhost:3000/admin/diagnose${colors.reset}`);

} catch (error) {
  console.error(`\n${colors.red}❌ Erro durante a execução:${colors.reset}`);
  console.error(`${colors.red}${error.message}${colors.reset}`);
  process.exit(1);
} 