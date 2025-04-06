import { ImapFlow } from 'imapflow';
import { injectable } from 'tsyringe';
import { Email, IEmailProvider } from '@/domain/interfaces/IEmailProvider';
import { emailConfig } from '@/shared/config/emailConfig';

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
        console.log(`📬 Encontrados ${messages.length} emails não lidos.`);
        
        if (messages.length > 0) {
          console.log('⏳ Carregando detalhes dos emails...');
        }
        
        // Fetch headers for each message without marking as read
        for (const message of messages) {
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
      let email: Email = {
        id,
        subject: '',
        from: '',
        date: new Date(),
        body: {
          text: '',
          html: ''
        }
      };

      try {
        // Fetch the message by UID without marking as read
        const fetch = await this.client.fetchOne(id, {
          uid: true,
          envelope: true,
          internalDate: true,
          source: true,
          bodyStructure: true
        }, { uid: true });

        if (fetch && fetch.envelope) {
          email = {
            id,
            messageId: fetch.envelope.messageId,
            subject: fetch.envelope.subject || '(Sem assunto)',
            from: fetch.envelope.from?.[0]?.address || '(Remetente desconhecido)',
            date: fetch.internalDate || new Date(),
            body: {
              text: '',
              html: ''
            }
          };

          // Get text and html body parts
          const textPart = await this.client.fetchOne(id, {
            uid: true,
            bodyPart: 'TEXT',
          }, { uid: true });

          const htmlPart = await this.client.fetchOne(id, {
            uid: true,
            bodyPart: 'HTML',
          }, { uid: true });

          if (textPart && textPart.bodyPart) {
            email.body!.text = textPart.bodyPart.toString();
          }

          if (htmlPart && htmlPart.bodyPart) {
            email.body!.html = htmlPart.bodyPart.toString();
          }
        }
      } finally {
        // Always release the lock
        lock.release();
      }

      return email;
    } catch (error) {
      console.error('❌ Erro ao obter conteúdo do email:', error);
      throw error;
    }
  }
}