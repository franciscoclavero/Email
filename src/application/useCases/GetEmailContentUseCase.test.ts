import 'reflect-metadata';
import { GetEmailContentUseCase } from './GetEmailContentUseCase';
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
      body: {
        text: 'This is the content of test email 1.'
      }
    },
    {
      id: '2',
      messageId: '<test2@example.com>',
      subject: 'Test Email 2',
      from: 'sender2@example.com',
      date: new Date(),
      body: {
        text: 'This is the content of test email 2.'
      }
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
    return email;
  }
  
  async markAsRead(id: string): Promise<void> {
    const email = this.mockEmails.find(email => email.id === id);
    if (!email) {
      throw new Error('Email not found');
    }
    return Promise.resolve();
  }
}

describe('GetEmailContentUseCase', () => {
  let getEmailContentUseCase: GetEmailContentUseCase;
  let mockEmailProvider: IEmailProvider;

  beforeEach(() => {
    mockEmailProvider = new MockEmailProvider();
    getEmailContentUseCase = new GetEmailContentUseCase(mockEmailProvider);
  });

  it('should return email content for a valid ID', async () => {
    const email = await getEmailContentUseCase.execute('1');
    
    expect(email.id).toBe('1');
    expect(email.subject).toBe('Test Email 1');
    expect(email.body?.text).toBe('This is the content of test email 1.');
  });

  it('should throw an error when email provider fails', async () => {
    jest.spyOn(mockEmailProvider, 'getEmailContent').mockRejectedValue(new Error('Email not found'));
    
    await expect(getEmailContentUseCase.execute('999')).rejects.toThrow('Falha ao obter conteúdo do email');
  });
});