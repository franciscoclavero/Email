import 'reflect-metadata';
import { ImapEmailProvider } from './ImapEmailProvider';
import { ImapFlow } from 'imapflow';
import { Email } from '@/domain/interfaces/IEmailProvider';

// Mock ImapFlow class
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
      fetchOne: jest.fn().mockImplementation((id, fields) => {
        // Different responses based on id and fields
        if (fields.bodyPart === 'TEXT') {
          return Promise.resolve({
            bodyPart: Buffer.from('Text content')
          });
        } else if (fields.bodyPart === 'HTML') {
          return Promise.resolve({
            bodyPart: Buffer.from('<p>HTML content</p>')
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
    it('should get email content successfully', async () => {
      // Act
      const email = await provider.getEmailContent('1');

      // Assert
      const mockClient = (provider as any).client;
      expect(mockClient.fetchOne).toHaveBeenCalled();
      expect(email.id).toBe('1');
      expect(email.subject).toBe('Test Subject 1');
      expect(email.body?.text).toBe('Text content');
      expect(email.body?.html).toBe('<p>HTML content</p>');
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
    
    it('should handle fetchOne returning null for envelope', async () => {
      // Setup
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        fetchOne: jest.fn().mockResolvedValue({
          uid: '1',
          envelope: null // Null envelope
        })
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();

      // Act
      const email = await provider.getEmailContent('1');

      // Assert
      expect(email.id).toBe('1');
      expect(email.subject).toBe('');
      expect(email.from).toBe('');
      expect(email.body).toBeDefined();
    });
    
    it('should handle missing bodyPart', async () => {
      // Setup - We'll simulate no body parts returned
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        fetchOne: jest.fn().mockImplementation((id, fields) => {
          if (fields.envelope) {
            return Promise.resolve({
              uid: id,
              envelope: {
                messageId: `<msg-${id}@example.com>`,
                subject: `Test Subject ${id}`,
                from: [{ address: 'sender@example.com', name: 'Sender' }],
              },
              internalDate: new Date()
            });
          } else {
            // Return no bodyPart for text/html requests
            return Promise.resolve({ uid: id });
          }
        })
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();

      // Act
      const email = await provider.getEmailContent('1');

      // Assert
      expect(email.body?.text).toBe('');
      expect(email.body?.html).toBe('');
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
});