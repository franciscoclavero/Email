import { injectable, inject } from 'tsyringe';
import { IEmailProvider } from '@/domain/interfaces/IEmailProvider';
import { emailConfig, validateEmailConfig, saveEmailConfig } from '@/shared/config/emailConfig';

@injectable()
export class AuthenticateUserUseCase {
  constructor(
    @inject('EmailProvider')
    private emailProvider: IEmailProvider
  ) {}

  async executeWithSavedCredentials(): Promise<boolean> {
    try {
      if (!validateEmailConfig()) {
        return false;
      }
      
      // Usa as credenciais do arquivo .env
      await this.emailProvider.configure(
        emailConfig.host,
        emailConfig.port,
        emailConfig.user,
        emailConfig.pass
      );
      
      // Tenta conectar para validar as credenciais
      await this.emailProvider.connect();
      
      return true;
    } catch (error) {
      console.error('❌ Erro na autenticação com credenciais salvas:', error);
      return false;
    }
  }

  async execute(host: string, port: number, user: string, password: string): Promise<boolean> {
    try {
      // Configura o provedor de email com as credenciais fornecidas
      await this.emailProvider.configure(host, port, user, password);
      
      // Tenta conectar para validar as credenciais
      await this.emailProvider.connect();
      
      // Se chegou aqui, a autenticação foi bem-sucedida
      // Salva as credenciais no arquivo .env
      await saveEmailConfig({ host, port, user, pass: password });
      
      return true;
    } catch (error) {
      console.error('❌ Erro na autenticação:', error);
      return false;
    }
  }
}