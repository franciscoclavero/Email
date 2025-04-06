import { injectable, inject } from 'tsyringe';
import { IEmailProvider, Email } from '@/domain/interfaces/IEmailProvider';

@injectable()
export class ListUnreadEmailsUseCase {
  constructor(
    @inject('EmailProvider')
    private emailProvider: IEmailProvider
  ) {}

  async execute(): Promise<Email[]> {
    try {
      return await this.emailProvider.listUnreadEmails();
    } catch (error) {
      console.error('Error listing unread emails:', error);
      throw new Error('Failed to list unread emails');
    }
  }
}