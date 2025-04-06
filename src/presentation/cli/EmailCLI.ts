import { prompt } from 'enquirer';
import { Email } from '@/domain/interfaces/IEmailProvider';

export class EmailCLI {
  async selectEmail(emails: Email[]): Promise<Email | null> {
    if (emails.length === 0) {
      console.log('📭 Nenhum email não lido encontrado na caixa de entrada.');
      return null;
    }

    const choices = emails.map((email) => ({
      name: email.id,
      message: `📧 ${email.subject.padEnd(40).substring(0, 40)} | De: ${email.from.padEnd(30).substring(0, 30)} | ${email.date.toLocaleDateString()}`,
      value: email.id
    }));

    try {
      console.log('\n🔍 Lista de emails não lidos (mais recentes primeiro):');
      
      const result = await prompt<{ email: string }>({
        type: 'select',
        name: 'email',
        message: 'Selecione um email usando as setas do teclado:',
        choices
      });

      return emails.find(email => email.id === result.email) || null;
    } catch (error) {
      console.error('❌ Erro ao selecionar email:', error);
      return null;
    }
  }

  displayEmail(email: Email): void {
    console.clear();
    
    // Cabeçalho do email
    console.log('\n' + '📧'.padEnd(80, '='));
    console.log(`De: ${email.from}`);
    console.log(`Assunto: ${email.subject}`);
    console.log(`Data: ${email.date.toLocaleString()}`);
    if (email.messageId) {
      console.log(`ID: ${email.messageId}`);
    }
    console.log('='.repeat(80));
    
    // Espaço antes do conteúdo
    console.log('\n');
    
    // Conteúdo do email
    if (email.body?.text) {
      // Quebrar o texto em linhas e adicionar espaço para leitura mais fácil
      const formattedText = email.body.text
        .replace(/\r\n/g, '\n')  // Normalizar quebras de linha
        .replace(/\n{3,}/g, '\n\n')  // Substituir múltiplas linhas em branco por apenas duas
        .split('\n')
        .map(line => line.trim())
        .join('\n');
      
      console.log(formattedText);
    } else if (email.body?.html) {
      // Melhorada a conversão de HTML para texto
      const text = email.body.html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<li>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/td>/gi, '\t')
        .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')  // Substituir múltiplas linhas em branco por apenas duas
        .trim();
      
      console.log(text);
    } else {
      console.log('📄 Nenhum conteúdo disponível para este email.');
    }
    
    // Rodapé
    console.log('\n' + '='.repeat(80));
  }
}