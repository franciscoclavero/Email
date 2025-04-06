import { injectable, inject } from 'tsyringe';
import { IEmailProvider, Email, EmailFilterOptions } from '@/domain/interfaces/IEmailProvider';

@injectable()
export class ListEmailsUseCase {
  constructor(
    @inject('EmailProvider')
    private emailProvider: IEmailProvider
  ) {}

  async execute(filterOptions?: EmailFilterOptions): Promise<Email[]> {
    try {
      return await this.emailProvider.listEmails(filterOptions);
    } catch (error) {
      console.error('❌ Erro ao listar emails:', error);
      throw new Error('Falha ao listar emails');
    }
  }
}