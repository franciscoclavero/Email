import 'reflect-metadata';
import { ImapEmailProvider } from './ImapEmailProvider';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { EmailFilterOptions } from '@/domain/interfaces/IEmailProvider';

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

  // ... Other existing tests ...

  describe('listEmails', () => {
    beforeEach(async () => {
      await provider.configure('imap.test.com', 993, 'test@test.com', 'password');
    });

    it('should list emails with default filter options', async () => {
      // Act
      const emails = await provider.listEmails();

      // Assert
      const mockClient = (provider as any).client;
      expect(mockClient.search).toHaveBeenCalled();
      expect(mockClient.fetchOne).toHaveBeenCalled();
      expect(emails.length).toBeLessThanOrEqual(10); // Default limit
      
      // Verify emails are sorted by date
      if (emails.length > 1) {
        for (let i = 0; i < emails.length - 1; i++) {
          expect(emails[i].date.getTime()).toBeGreaterThanOrEqual(emails[i + 1].date.getTime());
        }
      }
    });

    it('should apply unreadOnly filter correctly', async () => {
      // Setup
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        search: jest.fn().mockResolvedValue(['1', '2']),
        fetchOne: jest.fn().mockImplementation(() => {
          return Promise.resolve({
            envelope: {
              subject: 'Test Subject',
              from: [{ address: 'sender@example.com' }],
            },
            internalDate: new Date(),
            flags: []
          });
        })
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();
      await provider.configure('imap.test.com', 993, 'test@test.com', 'password');

      // Act
      const options: EmailFilterOptions = { unreadOnly: true };
      await provider.listEmails(options);

      // Assert
      expect(mockImapFlow.search).toHaveBeenCalledWith({ seen: false }, expect.anything());
    });

    it('should apply limit filter correctly', async () => {
      // Setup - create 20 emails
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        search: jest.fn().mockResolvedValue(Array(20).fill(0).map((_, i) => (i + 1).toString())),
        fetchOne: jest.fn().mockImplementation((id) => {
          return Promise.resolve({
            uid: id,
            envelope: {
              messageId: `<msg-${id}@example.com>`,
              subject: `Test Subject ${id}`,
              from: [{ address: 'sender@example.com', name: 'Sender' }],
            },
            internalDate: new Date(),
            flags: []
          });
        })
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();
      await provider.configure('imap.test.com', 993, 'test@test.com', 'password');

      // Act
      const options: EmailFilterOptions = { limit: 5 };
      const emails = await provider.listEmails(options);

      // Assert
      expect(emails.length).toBe(5);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Mostrando os 5 mais recentes'));
    });

    it('should filter by fromAddresses correctly', async () => {
      // Setup
      const mockEmails = [
        {
          uid: '1',
          envelope: {
            messageId: 'msg1',
            subject: 'Subject 1',
            from: [{ address: 'sender1@example.com' }]
          },
          internalDate: new Date(),
          flags: []
        },
        {
          uid: '2',
          envelope: {
            messageId: 'msg2',
            subject: 'Subject 2',
            from: [{ address: 'sender2@gmail.com' }]
          },
          internalDate: new Date(),
          flags: []
        }
      ];
      
      const mockImapFlow = {
        authenticated: true,
        getMailboxLock: jest.fn().mockImplementation(() => ({
          release: jest.fn()
        })),
        search: jest.fn().mockResolvedValue(['1', '2']),
        fetchOne: jest.fn().mockImplementation((id) => {
          return Promise.resolve(mockEmails[parseInt(id) - 1]);
        })
      };
      (ImapFlow as jest.Mock).mockImplementationOnce(() => mockImapFlow);
      
      provider = new ImapEmailProvider();
      await provider.configure('imap.test.com', 993, 'test@test.com', 'password');

      // Act - filter for gmail.com addresses only
      const options: EmailFilterOptions = { fromAddresses: ['gmail.com'] };
      const emails = await provider.listEmails(options);

      // Assert - should only include the second email
      expect(emails.length).toBe(1);
      expect(emails[0].from).toContain('gmail.com');
    });

    it('should handle empty search results', async () => {
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
      await provider.configure('imap.test.com', 993, 'test@test.com', 'password');
      
      // Act
      const emails = await provider.listEmails();

      // Assert
      expect(emails).toEqual([]);
      expect(mockConsoleLog).toHaveBeenCalledWith('📭 Nenhum email encontrado com os filtros especificados.');
    });

    it('should connect if not authenticated', async () => {
      // Setup
      (provider as any).client.authenticated = false;
      const connectSpy = jest.spyOn(provider, 'connect').mockResolvedValue();

      // Act
      await provider.listEmails();

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
      await provider.configure('imap.test.com', 993, 'test@test.com', 'password');

      // Act & Assert
      await expect(provider.listEmails()).rejects.toThrow('Search failed');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Erro ao listar emails:', error);
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
      await provider.configure('imap.test.com', 993, 'test@test.com', 'password');

      // Act
      try {
        await provider.listEmails();
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(releaseMock).toHaveBeenCalled();
    });
  });
});