import 'reflect-metadata';
import { ImapEmailProvider } from './ImapEmailProvider';
import { ImapFlow } from 'imapflow';
import { Email } from '@/domain/interfaces/IEmailProvider';
import { simpleParser } from 'mailparser';

// Mock ImapFlow class and mailparser
jest.mock('imapflow', () => {
  return {
    ImapFlow: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      logout: jest.fn().mockResolvedValue(undefined),
      authenticated: true,
      getMailboxLock: jest.fn().mockImplementation(() => ({
        release: jest.fn()
      })),
      search: jest.fn().mockResolvedValue(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']),
      messageFlagsAdd: jest.fn().mockResolvedValue(true),
      fetchOne: jest.fn().mockImplementation((id, fields) => {
        // Return source for raw email parsing
        if (fields.source) {
          return Promise.resolve({
            source: Buffer.from(`From: "Sender" <sender@example.com>\r\nTo: "Recipient" <recipient@example.com>\r\nSubject: Test Subject ${id}\r\nDate: ${new Date().toUTCString()}\r\nMessage-ID: <msg-${id}@example.com>\r\nContent-Type: multipart/alternative; boundary="boundary"\r\n\r\n--boundary\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nText content\r\n\r\n--boundary\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<p>HTML content</p>\r\n\r\n--boundary--`)
          });
        } else {
          return Promise.resolve({
            uid: id,
            envelope: {
              messageId: `<msg-${id}@example.com>`,
              subject: `Test Subject ${id}`,
              from: [{ address: 'sender@example.com', name: 'Sender' }],
            },
            internalDate: new Date(),
            flags: ['unseen']
          });
        }
      })
    }))
  };
});

// Mock mailparser
jest.mock('mailparser', () => {
  return {
    simpleParser: jest.fn().mockImplementation((source) => {
      // Return parsed email data
      return Promise.resolve({
        messageId: '<msg-1@example.com>',
        subject: 'Test Subject 1',
        from: { text: 'sender@example.com' },
        to: { text: 'recipient@example.com' },
        date: new Date(),
        text: 'Text content',
        html: '<p>HTML content</p>'
      });
    })
  };
});

describe('ImapEmailProvider', () => {
  let provider: ImapEmailProvider;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    provider = new ImapEmailProvider();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to email server successfully', async () => {
      // Act
      await provider.connect();

      // Assert
      expect(ImapFlow).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Conexão com o servidor de email estabelecida com sucesso'));
    });

    it('should handle connection errors', async () => {
      // Setup
      const error = new Error('Connection failed');
      const mockImapFlow = {
        connect: jest.fn().mockRejectedValue(error)
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();

      // Act & Assert
      await expect(provider.connect()).rejects.toThrow('Connection failed');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Falha ao conectar com o servidor de email'));
    });

    it('should provide specific error message for authentication failures', async () => {
      // Setup
      const authError = new Error('Invalid auth credentials');
      const mockImapFlow = {
        connect: jest.fn().mockRejectedValue(authError)
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();

      // Act
      try {
        await provider.connect();
      } catch (error) {
        // We expect it to throw
      }

      // Assert
      expect(console.error).toHaveBeenCalledWith('❌ Falha ao conectar com o servidor de email!');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Isso parece um problema de autenticação'));
    });
    
    it('should handle network connection errors', async () => {
      // Setup
      const networkError = new Error('network error occurred');
      const mockImapFlow = {
        connect: jest.fn().mockRejectedValue(networkError)
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();
      
      // Act
      try {
        await provider.connect();
      } catch (error) {
        // Expected to throw
      }
      
      // Assert
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Isso parece um problema de conexão'));
    });
  });

  describe('disconnect', () => {
    it('should disconnect from email server successfully', async () => {
      // Act
      await provider.disconnect();

      // Assert
      const mockClient = (provider as any).client;
      expect(mockClient.logout).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Desconectado do servidor de email com sucesso'));
    });

    it('should handle disconnect errors', async () => {
      // Setup
      const error = new Error('Logout failed');
      const mockImapFlow = {
        logout: jest.fn().mockRejectedValue(error)
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();

      // Act
      await provider.disconnect(); // Should not throw

      // Assert
      expect(console.error).toHaveBeenCalledWith('⚠️ Erro ao desconectar do servidor de email:', error);
    });
  });

  describe('listUnreadEmails', () => {
    it('should list up to 10 most recent unread emails', async () => {
      // Act
      const emails = await provider.listUnreadEmails();

      // Assert
      const mockClient = (provider as any).client;
      expect(mockClient.search).toHaveBeenCalled();
      expect(mockClient.fetchOne).toHaveBeenCalled();
      expect(emails.length).toBeLessThanOrEqual(10); // Deve retornar no máximo 10 emails
      // Verifica se os emails estão ordenados por data
      if (emails.length > 1) {
        for (let i = 0; i < emails.length - 1; i++) {
          expect(emails[i].date.getTime()).toBeGreaterThanOrEqual(emails[i + 1].date.getTime());
        }
      }
    });
    
    it('should handle fetchOne returning null', async () => {
      // Setup
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        search: jest.fn().mockResolvedValue(['1', '2']),
        fetchOne: jest.fn().mockResolvedValue(null) // Retorna null
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();

      // Act
      const emails = await provider.listUnreadEmails();

      // Assert
      expect(emails).toEqual([]);
    });
    
    it('should handle empty message list', async () => {
      // Setup
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        search: jest.fn().mockResolvedValue([]),
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();
      const logSpy = jest.spyOn(console, 'log');

      // Act
      const emails = await provider.listUnreadEmails();

      // Assert
      expect(emails).toEqual([]);
      expect(logSpy).toHaveBeenCalledWith('📭 Nenhum email não lido encontrado na caixa de entrada.');
    });
    
    it('should inform when showing limited number of emails', async () => {
      // Setup
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        search: jest.fn().mockResolvedValue(Array(20).fill(0).map((_, i) => i + 1)),
        fetchOne: jest.fn().mockImplementation((id) => {
          return Promise.resolve({
            uid: id,
            envelope: {
              messageId: `<msg-${id}@example.com>`,
              subject: `Test Subject ${id}`,
              from: [{ address: 'sender@example.com', name: 'Sender' }],
            },
            internalDate: new Date(),
            flags: ['unseen']
          });
        })
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();
      const logSpy = jest.spyOn(console, 'log');

      // Act
      const emails = await provider.listUnreadEmails();

      // Assert
      expect(emails.length).toBe(10); // Limitado a 10 emails
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Mostrando os 10 mais recentes'));
    });

    it('should connect if not authenticated', async () => {
      // Setup
      (provider as any).client.authenticated = false;
      const connectSpy = jest.spyOn(provider, 'connect').mockResolvedValue();

      // Act
      await provider.listUnreadEmails();

      // Assert
      expect(connectSpy).toHaveBeenCalled();
    });

    it('should handle errors during listing', async () => {
      // Setup
      const error = new Error('Search failed');
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        search: jest.fn().mockRejectedValue(error)
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();

      // Act & Assert
      await expect(provider.listUnreadEmails()).rejects.toThrow('Search failed');
      expect(console.error).toHaveBeenCalledWith('❌ Erro ao listar emails não lidos:', error);
    });

    it('should always release the lock even on error', async () => {
      // Setup
      const error = new Error('Search failed');
      const releaseMock = jest.fn();
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: releaseMock
        })),
        search: jest.fn().mockRejectedValue(error)
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();

      // Act
      try {
        await provider.listUnreadEmails();
      } catch (error) {
        // We expect it to throw
      }

      // Assert
      expect(releaseMock).toHaveBeenCalled();
    });
  });

  describe('getEmailContent', () => {
    it('should get email content successfully using mailparser', async () => {
      // Setup - Mock console.log to prevent debug messages
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Override just for this test
      (simpleParser as jest.Mock).mockResolvedValueOnce({
        messageId: '<msg-1@example.com>',
        subject: 'Test Subject 1',
        from: { text: 'sender@example.com' },
        to: { text: 'recipient@example.com' },
        date: new Date(),
        text: 'Text content',
        html: '<p>HTML content</p>'
      });
      
      // Act
      const email = await provider.getEmailContent('1');

      // Assert
      const mockClient = (provider as any).client;
      expect(mockClient.fetchOne).toHaveBeenCalledWith('1', { source: true }, { uid: true });
      expect(simpleParser).toHaveBeenCalled();
      expect(email.id).toBe('1');
      expect(email.subject).toBe('Test Subject 1');
      expect(email.body?.text).toBe('Text content');
      expect(email.body?.html).toBe('<p>HTML content</p>');
      expect(consoleLogSpy).toHaveBeenCalledWith('📨 Contém texto: Sim');
      expect(consoleLogSpy).toHaveBeenCalledWith('📨 Contém HTML: Sim');
      
      // Cleanup
      consoleLogSpy.mockRestore();
    });
    
    it('should handle email without text or HTML content', async () => {
      // Setup - Mock console.log to prevent debug messages
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Override just for this test
      (simpleParser as jest.Mock).mockResolvedValueOnce({
        messageId: '<msg-1@example.com>',
        subject: 'Empty Email',
        from: { text: 'sender@example.com' },
        to: { text: 'recipient@example.com' },
        date: new Date(),
        // No text or HTML content
      });
      
      // Act
      const email = await provider.getEmailContent('1');

      // Assert
      expect(email.body?.text).toBe('');
      expect(email.body?.html).toBe('');
      expect(consoleLogSpy).toHaveBeenCalledWith('📨 Contém texto: Não');
      expect(consoleLogSpy).toHaveBeenCalledWith('📨 Contém HTML: Não');
      
      // Cleanup
      consoleLogSpy.mockRestore();
    });

    it('should connect if not authenticated', async () => {
      // Setup
      (provider as any).client.authenticated = false;
      const connectSpy = jest.spyOn(provider, 'connect').mockResolvedValue();

      // Act
      await provider.getEmailContent('1');

      // Assert
      expect(connectSpy).toHaveBeenCalled();
    });
    
    it('should handle missing source in fetchOne response', async () => {
      // Setup
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        fetchOne: jest.fn().mockResolvedValue({
          uid: '1',
          // No source property
        })
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Act & Assert
      await expect(provider.getEmailContent('1')).rejects.toThrow('Email source not available');
      expect(consoleLogSpy).toHaveBeenCalledWith('⚠️ Não foi possível obter o email completo.');
      
      // Cleanup
      consoleLogSpy.mockRestore();
    });
    
    it('should handle null response from fetchOne', async () => {
      // Setup
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        fetchOne: jest.fn().mockResolvedValue(null)
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Act & Assert
      await expect(provider.getEmailContent('1')).rejects.toThrow('Email source not available');
      
      // Cleanup
      consoleLogSpy.mockRestore();
    });

    it('should handle errors during fetching content', async () => {
      // Setup
      const error = new Error('Fetch failed');
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        fetchOne: jest.fn().mockRejectedValue(error)
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();

      // Act & Assert
      await expect(provider.getEmailContent('1')).rejects.toThrow('Fetch failed');
      expect(console.error).toHaveBeenCalledWith('❌ Erro ao obter conteúdo do email:', error);
    });

    it('should handle errors in mailparser', async () => {
      // Setup
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        fetchOne: jest.fn().mockResolvedValue({
          source: Buffer.from('Invalid email content')
        })
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      const parserError = new Error('Parsing failed');
      (simpleParser as jest.Mock).mockRejectedValueOnce(parserError);
      
      provider = new ImapEmailProvider();

      // Act & Assert
      await expect(provider.getEmailContent('1')).rejects.toThrow('Parsing failed');
    });

    it('should always release the lock even on error', async () => {
      // Setup
      const error = new Error('Fetch failed');
      const releaseMock = jest.fn();
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: releaseMock
        })),
        fetchOne: jest.fn().mockRejectedValue(error)
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();

      // Act
      try {
        await provider.getEmailContent('1');
      } catch (error) {
        // We expect it to throw
      }

      // Assert
      expect(releaseMock).toHaveBeenCalled();
    });
  });
  
  describe('markAsRead', () => {
    it('should mark an email as read successfully', async () => {
      // Setup
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Act
      await provider.markAsRead('1');

      // Assert
      const mockClient = (provider as any).client;
      expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith('1', ['\\Seen'], { uid: true });
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Email marcado como lido com sucesso.');
      
      // Cleanup
      consoleLogSpy.mockRestore();
    });

    it('should connect if not authenticated', async () => {
      // Setup
      (provider as any).client.authenticated = false;
      const connectSpy = jest.spyOn(provider, 'connect').mockResolvedValue();

      // Act
      await provider.markAsRead('1');

      // Assert
      expect(connectSpy).toHaveBeenCalled();
    });

    it('should handle errors when marking as read', async () => {
      // Setup
      const error = new Error('Failed to mark as read');
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        messageFlagsAdd: jest.fn().mockRejectedValue(error)
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();

      // Act & Assert
      await expect(provider.markAsRead('1')).rejects.toThrow('Failed to mark as read');
      expect(console.error).toHaveBeenCalledWith('❌ Erro ao marcar email como lido:', error);
    });

    it('should always release the lock even on error', async () => {
      // Setup
      const error = new Error('Failed to mark as read');
      const releaseMock = jest.fn();
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: releaseMock
        })),
        messageFlagsAdd: jest.fn().mockRejectedValue(error)
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();

      // Act
      try {
        await provider.markAsRead('1');
      } catch (error) {
        // We expect it to throw
      }

      // Assert
      expect(releaseMock).toHaveBeenCalled();
    });
  });
});