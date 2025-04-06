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
    
    await expect(listUnreadEmailsUseCase.execute()).rejects.toThrow('Failed to list unread emails');
  });
});