import { ImapFlow } from 'imapflow';
import { injectable } from 'tsyringe';
import { Email, IEmailProvider } from '@/domain/interfaces/IEmailProvider';
import { simpleParser } from 'mailparser';

interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

@injectable()
export class ImapEmailProvider implements IEmailProvider {
  private client: any;
  private config: ImapConfig = {
    host: '',
    port: 993,
    user: '',
    password: ''
  };

  constructor() {
    // Construtor vazio, o cliente será inicializado após a configuração
  }

  async configure(host: string, port: number, user: string, password: string): Promise<void> {
    // Atualiza a configuração com os valores fornecidos
    this.config = {
      host,
      port,
      user,
      password
    };

    // Inicializa o cliente IMAP com a nova configuração
    this.client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: true,
      auth: {
        user: this.config.user,
        pass: this.config.password
      },
      logger: false
    });
  }

  async connect(): Promise<void> {
    try {
      // Verifica se o cliente foi configurado
      if (!this.client) {
        throw new Error('O cliente IMAP não foi configurado. Chame configure() primeiro.');
      }

      console.log(`🔄 Conectando ao servidor: ${this.config.host}:${this.config.port} como ${this.config.user}...`);
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