import 'reflect-metadata';
import './shared/container';
import { container } from 'tsyringe';
import { validateEmailConfig } from './shared/config/emailConfig';
import { ListUnreadEmailsUseCase } from './application/useCases/ListUnreadEmailsUseCase';
import { GetEmailContentUseCase } from './application/useCases/GetEmailContentUseCase';
import { EmailCLI } from './presentation/cli/EmailCLI';
import { IEmailProvider } from './domain/interfaces/IEmailProvider';

async function main() {
  try {
    // Validate email configuration
    validateEmailConfig();

    // Get dependencies
    const emailProvider = container.resolve<IEmailProvider>('EmailProvider');
    const listUnreadEmailsUseCase = container.resolve(ListUnreadEmailsUseCase);
    const getEmailContentUseCase = container.resolve(GetEmailContentUseCase);
    const emailCLI = new EmailCLI();

    // Connect to email server
    await emailProvider.connect();

    // List unread emails
    const emails = await listUnreadEmailsUseCase.execute();

    // Select an email
    const selectedEmail = await emailCLI.selectEmail(emails);
    
    if (selectedEmail) {
      // Get full email content
      const fullEmail = await getEmailContentUseCase.execute(selectedEmail.id);
      
      // Display the email
      emailCLI.displayEmail(fullEmail);
    }

    // Disconnect
    console.log('\n🔄 Finalizando conexão...');
    await emailProvider.disconnect();
  } catch (error) {
    console.error('\n❌ Erro na aplicação');
    
    if (error instanceof Error) {
      console.error(`   Mensagem: ${error.message}`);
    }
    
    console.log('\n💡 Dica: Verifique se suas credenciais de email estão corretas no arquivo .env');
    console.log('   Para Gmail, use uma senha de aplicativo gerada em https://myaccount.google.com/apppasswords');
  }
}

main();