import { ImapFlow } from 'imapflow';
import { injectable } from 'tsyringe';
import { Email, IEmailProvider } from '@/domain/interfaces/IEmailProvider';
import { emailConfig } from '@/shared/config/emailConfig';
import { simpleParser } from 'mailparser';

@injectable()
export class ImapEmailProvider implements IEmailProvider {
  private client: any;

  constructor() {
    this.client = new ImapFlow({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: true,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
      },
      logger: false
    });
  }

  async connect(): Promise<void> {
    try {
      console.log(`🔄 Conectando ao servidor: ${emailConfig.host}:${emailConfig.port} como ${emailConfig.user}...`);
      await this.client.connect();
      console.log('✅ Conexão com o servidor de email estabelecida com sucesso!');
    } catch (error) {
      console.error('❌ Falha ao conectar com o servidor de email!');
      
      if (error instanceof Error) {
        console.error(`   Erro: ${error.message}`);
        
        // Diagnóstico específico para erros comuns
        if (error.message.includes('auth')) {
          console.error('   🔑 Isso parece um problema de autenticação. Verifique se seu usuário e senha estão corretos.');
          console.error('   📝 Para Gmail, você precisa usar uma senha de aplicativo, não sua senha normal.');
        } else if (error.message.includes('connect') || error.message.includes('network')) {
          console.error('   🌐 Isso parece um problema de conexão. Verifique sua internet e se o servidor está correto.');
        }
      }
      
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.logout();
      console.log('👋 Desconectado do servidor de email com sucesso.');
    } catch (error) {
      console.error('⚠️ Erro ao desconectar do servidor de email:', error);
      // Não vamos relançar este erro, pois já estamos finalizando
    }
  }

  async listUnreadEmails(): Promise<Email[]> {
    const emails: Email[] = [];
    const MAX_EMAILS = 10; // Número máximo de emails a serem buscados

    try {
      // Make sure we're connected
      if (!this.client.authenticated) {
        await this.connect();
      }

      console.log('🔍 Buscando emails não lidos na caixa de entrada...');
      
      // Select the inbox without marking messages as seen
      const lock = await this.client.getMailboxLock('INBOX');
      
      try {
        // Search for unseen messages
        const messages = await this.client.search({ seen: false }, { uid: true });
        
        if (messages.length === 0) {
          console.log('📭 Nenhum email não lido encontrado na caixa de entrada.');
        } else {
          const totalMessages = messages.length;
          const messagesToProcess = messages.slice(-MAX_EMAILS); // Pega os 10 mais recentes (últimos UIDs)
          
          if (totalMessages > MAX_EMAILS) {
            console.log(`📬 Encontrados ${totalMessages} emails não lidos. Mostrando os ${MAX_EMAILS} mais recentes.`);
          } else {
            console.log(`📬 Encontrados ${totalMessages} emails não lidos.`);
          }
          
          console.log('⏳ Carregando detalhes dos emails...');
        
          // Fetch headers for each message without marking as read
          for (const message of messagesToProcess) {
            const messageId = message.toString();
            const fetch = await this.client.fetchOne(messageId, {
              uid: true,
              envelope: true,
              internalDate: true,
              flags: true,
            }, { uid: true });

            if (fetch && fetch.envelope) {
              emails.push({
                id: messageId,
                messageId: fetch.envelope.messageId,
                subject: fetch.envelope.subject || '(Sem assunto)',
                from: fetch.envelope.from?.[0]?.address || '(Remetente desconhecido)',
                date: fetch.internalDate || new Date(),
              });
            }
          }
          
          // Ordena por data, do mais recente para o mais antigo
          emails.sort((a, b) => b.date.getTime() - a.date.getTime());
        }
      } finally {
        // Always release the lock
        lock.release();
      }
    } catch (error) {
      console.error('❌ Erro ao listar emails não lidos:', error);
      throw error;
    }

    return emails;
  }

  async getEmailContent(id: string): Promise<Email> {
    try {
      // Make sure we're connected
      if (!this.client.authenticated) {
        await this.connect();
      }

      console.log('📨 Carregando conteúdo do email...');
      
      const lock = await this.client.getMailboxLock('INBOX');
      
      try {
        // Fetch the message by UID with source flag to get the raw email
        console.log('📨 Buscando email completo com source...');
        const message = await this.client.fetchOne(id, { source: true }, { uid: true });
        
        if (!message?.source) {
          console.log('⚠️ Não foi possível obter o email completo.');
          throw new Error('Email source not available');
        }
        
        console.log('📨 Analisando conteúdo do email com mailparser...');
        // Parse the email using mailparser
        const parsed = await simpleParser(message.source);
        
        // Create email object from parsed content
        const email: Email = {
          id,
          messageId: parsed.messageId || undefined,
          subject: parsed.subject || '(Sem assunto)',
          from: parsed.from?.text || '(Remetente desconhecido)',
          date: parsed.date || new Date(),
          body: {
            text: parsed.text || '',
            html: parsed.html || ''
          }
        };
        
        // Log para debug
        console.log(`📨 Email carregado: ${email.subject}`);
        console.log(`📨 Contém texto: ${parsed.text ? 'Sim' : 'Não'}`);
        console.log(`📨 Contém HTML: ${parsed.html ? 'Sim' : 'Não'}`);
        
        return email;
        
      } finally {
        // Always release the lock
        lock.release();
      }
    } catch (error) {
      console.error('❌ Erro ao obter conteúdo do email:', error);
      throw error;
    }
  }
  
  async markAsRead(id: string): Promise<void> {
    try {
      // Make sure we're connected
      if (!this.client.authenticated) {
        await this.connect();
      }

      console.log(`🔖 Marcando email ${id} como lido...`);
      
      const lock = await this.client.getMailboxLock('INBOX');
      
      try {
        // Add the \Seen flag to mark as read
        await this.client.messageFlagsAdd(id, ['\\Seen'], { uid: true });
        console.log('✅ Email marcado como lido com sucesso.');
      } finally {
        // Always release the lock
        lock.release();
      }
    } catch (error) {
      console.error('❌ Erro ao marcar email como lido:', error);
      throw error;
    }
  }
}