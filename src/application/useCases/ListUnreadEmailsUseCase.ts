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
      console.error('❌ Erro ao listar emails não lidos:', error);
      throw new Error('Falha ao listar emails não lidos');
    }
  }
}