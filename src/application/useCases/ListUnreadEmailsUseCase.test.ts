import 'reflect-metadata';
import { ListUnreadEmailsUseCase } from './ListUnreadEmailsUseCase';
import { IEmailProvider, Email } from '@/domain/interfaces/IEmailProvider';

// Mock implementation of IEmailProvider
class MockEmailProvider implements IEmailProvider {
  private mockEmails: Email[] = [
    {
      id: '1',
      messageId: '<test1@example.com>',
      subject: 'Test Email 1',
      from: 'sender1@example.com',
      date: new Date(),
    },
    {
      id: '2',
      messageId: '<test2@example.com>',
      subject: 'Test Email 2',
      from: 'sender2@example.com',
      date: new Date(),
    }
  ];

  async configure(host: string, port: number, user: string, password: string): Promise<void> {
    // Apenas simula a configuração
    return Promise.resolve();
  }

  async connect(): Promise<void> {
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }

  async listUnreadEmails(): Promise<Email[]> {
    return Promise.resolve(this.mockEmails);
  }

  async getEmailContent(id: string): Promise<Email> {
    const email = this.mockEmails.find(email => email.id === id);
    if (!email) {
      throw new Error('Email not found');
    }
    return {
      ...email,
      body: {
        text: 'This is a test email content.'
      }
    };
  }
  
  async markAsRead(id: string): Promise<void> {
    const email = this.mockEmails.find(email => email.id === id);
    if (!email) {
      throw new Error('Email not found');
    }
    return Promise.resolve();
  }

  async listEmails(filterOptions?: any): Promise<Email[]> {
    let emails = [...this.mockEmails];
    
    // Apply filters if provided
    if (filterOptions) {
      // Filter by unread only
      if (filterOptions.unreadOnly) {
        // Assuming all emails in mockEmails are unread, no filtering needed
      }
      
      // Filter by fromAddresses
      if (filterOptions.fromAddresses && filterOptions.fromAddresses.length > 0) {
        emails = emails.filter(email => 
          filterOptions.fromAddresses.some((addr: string) => 
            email.from.toLowerCase().includes(addr.toLowerCase())
          )
        );
      }
      
      // Apply limit
      if (filterOptions.limit && emails.length > filterOptions.limit) {
        emails = emails.slice(0, filterOptions.limit);
      }
    }
    
    return Promise.resolve(emails);
  }
}

describe('ListUnreadEmailsUseCase', () => {
  let listUnreadEmailsUseCase: ListUnreadEmailsUseCase;
  let mockEmailProvider: IEmailProvider;

  beforeEach(() => {
    mockEmailProvider = new MockEmailProvider();
    listUnreadEmailsUseCase = new ListUnreadEmailsUseCase(mockEmailProvider);
  });

  it('should return a list of unread emails', async () => {
    const emails = await listUnreadEmailsUseCase.execute();
    
    expect(emails).toHaveLength(2);
    expect(emails[0].subject).toBe('Test Email 1');
    expect(emails[1].subject).toBe('Test Email 2');
  });

  it('should throw an error when email provider fails', async () => {
    jest.spyOn(mockEmailProvider, 'listUnreadEmails').mockRejectedValue(new Error('Connection error'));
    
    await expect(listUnreadEmailsUseCase.execute()).rejects.toThrow('Falha ao listar emails não lidos');
  });
});