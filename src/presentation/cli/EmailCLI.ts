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
      message: `${email.date.toLocaleDateString()} - ${email.from}: ${email.subject}`,
      value: email.id
    }));

    try {
      const result = await prompt<{ email: string }>({
        type: 'select',
        name: 'email',
        message: 'Selecione um email para visualizar:',
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
    console.log('='.repeat(80));
    console.log(`De: ${email.from}`);
    console.log(`Assunto: ${email.subject}`);
    console.log(`Data: ${email.date.toLocaleString()}`);
    console.log('='.repeat(80));
    console.log('\n');
    
    if (email.body?.text) {
      console.log(email.body.text);
    } else if (email.body?.html) {
      // Very simple HTML to text conversion
      const text = email.body.html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]*>/g, '');
      
      console.log(text);
    } else {
      console.log('📄 Nenhum conteúdo disponível para este email.');
    }
  }
}