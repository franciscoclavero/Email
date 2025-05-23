import { injectable, inject } from 'tsyringe';
import { IEmailProvider, Email } from '@/domain/interfaces/IEmailProvider';

@injectable()
export class GetEmailContentUseCase {
  constructor(
    @inject('EmailProvider')
    private emailProvider: IEmailProvider
  ) {}

  async execute(id: string): Promise<Email> {
    try {
      return await this.emailProvider.getEmailContent(id);
    } catch (error) {
      console.error('❌ Erro ao obter conteúdo do email:', error);
      throw new Error('Falha ao obter conteúdo do email');
    }
  }
}