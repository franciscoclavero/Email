import { prompt } from 'enquirer';
import { emailConfig, validateEmailConfig } from '@/shared/config/emailConfig';

export class AuthCLI {
  async collectCredentials(): Promise<{ host: string; port: number; user: string; password: string } | null> {
    try {
      console.log('\n📧 Autenticação de Email IMAP 📧');
      console.log('='.repeat(50));

      // Verificar se já tem credenciais salvas
      if (validateEmailConfig()) {
        // Perguntar se quer usar as credenciais salvas
        const savedCredentialsResponse = await prompt<{ useSaved: boolean }>({
          type: 'confirm',
          name: 'useSaved',
          message: `Encontramos credenciais salvas para ${emailConfig.user}. Deseja usá-las?`,
          initial: true
        });

        if (savedCredentialsResponse.useSaved) {
          return {
            host: emailConfig.host,
            port: emailConfig.port,
            user: emailConfig.user,
            password: emailConfig.pass
          };
        }
      }
      
      // Obter o servidor IMAP
      const hostResponse = await prompt<{ host: string }>({
        type: 'input',
        name: 'host',
        message: 'Servidor IMAP (ex: imap.gmail.com):',
        initial: emailConfig.host || 'imap.gmail.com'
      });

      // Obter a porta
      const portResponse = await prompt<{ port: string }>({
        type: 'input',
        name: 'port',
        message: 'Porta (ex: 993):',
        initial: emailConfig.port ? String(emailConfig.port) : '993',
        validate: (value) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num <= 0 || num > 65535) {
            return 'Por favor, digite um número de porta válido (1-65535)';
          }
          return true;
        }
      });

      // Obter o usuário
      const userResponse = await prompt<{ user: string }>({
        type: 'input',
        name: 'user',
        message: 'Email:',
        initial: emailConfig.user || '',
        validate: (value) => {
          if (!value.includes('@')) {
            return 'Por favor, digite um endereço de email válido';
          }
          return true;
        }
      });

      // Obter a senha
      const passwordResponse = await prompt<{ password: string }>({
        type: 'password',
        name: 'password',
        message: 'Senha (para Gmail, use uma senha de aplicativo):',
        validate: (value) => {
          if (!value) {
            return 'A senha não pode ser vazia';
          }
          return true;
        }
      });

      return {
        host: hostResponse.host,
        port: parseInt(portResponse.port, 10),
        user: userResponse.user,
        password: passwordResponse.password
      };
    } catch (error) {
      console.error('❌ Erro ao coletar credenciais:', error);
      return null;
    }
  }

  async showMenu(): Promise<string> {
    try {
      const response = await prompt<{ action: string }>({
        type: 'select',
        name: 'action',
        message: 'Escolha uma opção:',
        choices: [
          { name: 'emails', message: '📨 Lista de E-mails', value: 'emails' },
          { name: 'logout', message: '🚪 Logout', value: 'logout' },
          { name: 'exit', message: '❌ Fechar', value: 'exit' }
        ]
      });

      return response.action;
    } catch (error) {
      console.error('❌ Erro ao exibir menu:', error);
      return 'exit';
    }
  }

  showLoginError(): void {
    console.log('\n❌ Falha na autenticação!');
    console.log('Verifique se o servidor, email e senha estão corretos.');
    console.log('Se estiver usando Gmail, certifique-se de usar uma senha de aplicativo.');
    console.log('Dica: Gere uma senha de aplicativo em https://myaccount.google.com/apppasswords');
  }

  showLogoutSuccess(): void {
    console.log('\n👋 Você foi deslogado com sucesso.');
  }
}