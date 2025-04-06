import { injectable, inject } from 'tsyringe';
import { IEmailProvider } from '@/domain/interfaces/IEmailProvider';

@injectable()
export class AuthenticateUserUseCase {
  constructor(
    @inject('EmailProvider')
    private emailProvider: IEmailProvider
  ) {}

  async execute(host: string, port: number, user: string, password: string): Promise<boolean> {
    try {
      // Configura o provedor de email com as credenciais fornecidas
      await this.emailProvider.configure(host, port, user, password);
      
      // Tenta conectar para validar as credenciais
      await this.emailProvider.connect();
      
      return true;
    } catch (error) {
      console.error('❌ Erro na autenticação:', error);
      return false;
    }
  }
}