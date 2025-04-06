import 'dotenv/config';
import { writeFile } from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';

export const emailConfig = {
  host: process.env.EMAIL_HOST || '',
  port: Number(process.env.EMAIL_PORT) || 993,
  user: process.env.EMAIL_USER || '',
  pass: process.env.EMAIL_PASS || '',
};

export function validateEmailConfig(): boolean {
  const { host, user, pass } = emailConfig;
  return !!(host && user && pass);
}

export async function saveEmailConfig(config: { host: string, port: number, user: string, pass: string }): Promise<boolean> {
  try {
    // Atualiza os valores no objeto emailConfig
    emailConfig.host = config.host;
    emailConfig.port = config.port;
    emailConfig.user = config.user;
    emailConfig.pass = config.pass;
    
    // Atualiza as variáveis de ambiente
    process.env.EMAIL_HOST = config.host;
    process.env.EMAIL_PORT = String(config.port);
    process.env.EMAIL_USER = config.user;
    process.env.EMAIL_PASS = config.pass;
    
    // Constrói o conteúdo do arquivo .env
    const envContent = 
`EMAIL_HOST=${config.host}
EMAIL_PORT=${config.port}
EMAIL_USER=${config.user}
EMAIL_PASS=${config.pass}`;
    
    // Encontra a raiz do projeto
    const rootDir = findProjectRoot();
    const envPath = path.join(rootDir, '.env');
    
    // Escreve no arquivo .env
    await writeFile(envPath, envContent);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar configurações de email:', error);
    return false;
  }
}

export async function clearEmailConfig(): Promise<boolean> {
  try {
    // Limpa os valores no objeto emailConfig
    emailConfig.host = '';
    emailConfig.port = 993;
    emailConfig.user = '';
    emailConfig.pass = '';
    
    // Limpa as variáveis de ambiente
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    process.env.EMAIL_PORT = '993';
    
    // Encontra a raiz do projeto
    const rootDir = findProjectRoot();
    const envPath = path.join(rootDir, '.env');
    
    // Escreve no arquivo .env com valores vazios
    const envContent = 
`EMAIL_HOST=
EMAIL_PORT=993
EMAIL_USER=
EMAIL_PASS=`;
    
    // Escreve no arquivo .env
    await writeFile(envPath, envContent);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar configurações de email:', error);
    return false;
  }
}

// Função auxiliar para encontrar a raiz do projeto (onde fica o .env)
export function findProjectRoot(): string {
  let currentDir = process.cwd();
  
  while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
    const parentDir = path.resolve(currentDir, '..');
    if (parentDir === currentDir) {
      // Chegamos à raiz do sistema de arquivos sem encontrar package.json
      return process.cwd(); // Retorna o diretório atual como fallback
    }
    currentDir = parentDir;
  }
  
  return currentDir;
}