import { prompt } from 'enquirer';
import { Email, EmailFilterOptions } from '@/domain/interfaces/IEmailProvider';

export class EmailCLI {
  async selectEmail(emails: Email[]): Promise<Email | null> {
    if (emails.length === 0) {
      console.log('📭 Nenhum email encontrado na seleção atual.');
      return null;
    }

    const choices = emails.map((email) => ({
      name: email.id,
      message: `${email.seen ? '📧' : '📬'} ${email.subject.padEnd(40).substring(0, 40)} | De: ${email.from.padEnd(30).substring(0, 30)} | ${email.date.toLocaleDateString()}`,
      value: email.id
    }));

    try {
      console.log('\n🔍 Lista de emails (mais recentes primeiro):');
      
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
  
  async selectEmailsToMarkAsRead(emails: Email[]): Promise<string[]> {
    if (emails.length === 0) {
      console.log('📭 Nenhum email encontrado na seleção atual.');
      return [];
    }

    const choices = emails.map((email) => ({
      name: email.id,
      message: `${email.seen ? '📧' : '📬'} ${email.subject.padEnd(40).substring(0, 40)} | De: ${email.from.padEnd(30).substring(0, 30)} | ${email.date.toLocaleDateString()}`,
      value: email.id
    }));

    try {
      console.log('\n🔍 Lista de emails (mais recentes primeiro):');
      
      console.log('💡 Use Espaço para selecionar emails e Enter para confirmar');
      const result = await prompt<{ emails: string[] }>({
        type: 'multiselect',
        name: 'emails',
        message: 'Selecione um ou mais emails:',
        choices
      });

      return result.emails;
    } catch (error) {
      console.error('❌ Erro ao selecionar emails:', error);
      return [];
    }
  }

  async selectEmailListingOption(): Promise<string> {
    try {
      const response = await prompt<{ option: string }>({
        type: 'select',
        name: 'option',
        message: 'Opções de listagem de e-mails:',
        choices: [
          { name: 'all', message: '📨 Retornar todos', value: 'all' },
          { name: 'sender', message: '👤 Filtro de remetente', value: 'sender' },
          { name: 'unread', message: '📬 Filtro de não lidos', value: 'unread' },
          { name: 'limit', message: '🔢 Quantidade', value: 'limit' },
          { name: 'back', message: '⬅️ Voltar', value: 'back' }
        ]
      });

      return response.option;
    } catch (error) {
      console.error('❌ Erro ao exibir opções de listagem:', error);
      return 'back';
    }
  }
  
  async selectFilters(): Promise<EmailFilterOptions> {
    const filterOptions: EmailFilterOptions = {};
    let filtersApplied = false;
    
    while (!filtersApplied) {
      console.log('\n🔍 Filtros selecionados:');
      console.log(`- Apenas não lidos: ${filterOptions.unreadOnly ? '✅ Sim' : '❌ Não'}`);
      console.log(`- Remetente: ${filterOptions.fromAddresses?.length ? '✅ ' + filterOptions.fromAddresses.join(', ') : '❌ Sem filtro'}`);
      console.log(`- Limite: ${filterOptions.limit || '❌ Sem limite'}`);
      
      const option = await this.selectEmailListingOption();
      
      switch (option) {
        case 'all':
          // Sem filtros, mas aplicar um limite padrão
          filterOptions.limit = filterOptions.limit || 50;
          filtersApplied = true;
          break;
          
        case 'sender':
          const senderResponse = await prompt<{ sender: string }>({
            type: 'input',
            name: 'sender',
            message: 'Digite o endereço de email do remetente:',
            validate: (value) => value.trim() ? true : 'Por favor, digite um valor'
          });
          
          filterOptions.fromAddresses = [senderResponse.sender];
          break;
          
        case 'unread':
          filterOptions.unreadOnly = true;
          break;
          
        case 'limit':
          const limitResponse = await prompt<{ limit: string }>({
            type: 'input',
            name: 'limit',
            message: 'Quantidade de emails a mostrar:',
            initial: '50',
            validate: (value) => {
              const num = parseInt(value, 10);
              return (!isNaN(num) && num > 0) ? true : 'Por favor, digite um número válido maior que zero';
            }
          });
          
          filterOptions.limit = parseInt(limitResponse.limit, 10);
          break;
          
        case 'back':
          // Retornar filtros vazios para cancelar a operação
          return {};
      }
      
      if (!filtersApplied) {
        const applyResponse = await prompt<{ apply: boolean }>({
          type: 'confirm',
          name: 'apply',
          message: 'Aplicar filtros e listar emails?',
          initial: false
        });
        
        filtersApplied = applyResponse.apply;
      }
    }
    
    return filterOptions;
  }
  
  async selectEmailAction(email: Email): Promise<string> {
    try {
      const response = await prompt<{ action: string }>({
        type: 'select',
        name: 'action',
        message: 'O que deseja fazer com este email?',
        choices: [
          { name: 'view', message: '👁️ Ver conteúdo', value: 'view' },
          { name: 'mark', message: '✓ Marcar como lido', value: 'mark' },
          { name: 'back', message: '⬅️ Voltar', value: 'back' }
        ]
      });

      return response.action;
    } catch (error) {
      console.error('❌ Erro ao selecionar ação:', error);
      return 'back';
    }
  }

  displayEmail(email: Email): void {
    console.clear();
    
    // Cabeçalho do email - Mais visualmente distinto
    console.log('\n' + '📧 CONTEÚDO DO EMAIL '.padEnd(80, '='));
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