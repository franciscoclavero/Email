import { injectable, inject } from 'tsyringe';
import { IEmailProvider } from '@/domain/interfaces/IEmailProvider';

@injectable()
export class MarkEmailAsReadUseCase {
  constructor(
    @inject('EmailProvider')
    private emailProvider: IEmailProvider
  ) {}

  async execute(id: string): Promise<void> {
    try {
      await this.emailProvider.markAsRead(id);
    } catch (error) {
      console.error('❌ Erro ao marcar email como lido:', error);
      throw new Error('Falha ao marcar email como lido');
    }
  }
}