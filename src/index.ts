import 'reflect-metadata';
import './shared/container';
import { container } from 'tsyringe';
import { validateEmailConfig } from './shared/config/emailConfig';
import { ListUnreadEmailsUseCase } from './application/useCases/ListUnreadEmailsUseCase';
import { GetEmailContentUseCase } from './application/useCases/GetEmailContentUseCase';
import { MarkEmailAsReadUseCase } from './application/useCases/MarkEmailAsReadUseCase';
import { EmailCLI } from './presentation/cli/EmailCLI';
import { IEmailProvider } from './domain/interfaces/IEmailProvider';
import { createInterface } from 'readline';

async function main() {
  try {
    // Validate email configuration
    validateEmailConfig();

    // Get dependencies
    const emailProvider = container.resolve<IEmailProvider>('EmailProvider');
    const listUnreadEmailsUseCase = container.resolve(ListUnreadEmailsUseCase);
    const getEmailContentUseCase = container.resolve(GetEmailContentUseCase);
    const markEmailAsReadUseCase = container.resolve(MarkEmailAsReadUseCase);
    const emailCLI = new EmailCLI();

    // Connect to email server
    await emailProvider.connect();

    try {
      let continueRunning = true;
      
      while (continueRunning) {
        // List unread emails
        const emails = await listUnreadEmailsUseCase.execute();
        
        // Select an email
        const selectedEmail = await emailCLI.selectEmail(emails);
        
        if (selectedEmail) {
          console.log(`\n📧 Carregando conteúdo do email: "${selectedEmail.subject}" de ${selectedEmail.from}`);
          
          // Buscar conteúdo completo do email
          const fullEmail = await getEmailContentUseCase.execute(selectedEmail.id);
          
          // Marcar email como lido
          await markEmailAsReadUseCase.execute(selectedEmail.id);
          console.log('📧 Email marcado como lido');
          
          // Exibir o conteúdo do email
          emailCLI.displayEmail(fullEmail);
          
          // Perguntar se o usuário quer voltar à lista ou sair
          const rl = createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          const answer = await new Promise<string>((resolve) => {
            rl.question('\n📋 Pressione ENTER para voltar à lista ou "Q" para sair: ', (answer) => {
              rl.close();
              resolve(answer.trim().toLowerCase());
            });
          });
          
          if (answer === 'q') {
            continueRunning = false;
          }
        } else {
          // Se não selecionou nenhum email, sair do loop
          continueRunning = false;
        }
      }
    } finally {
      // Disconnect - garantimos que o disconnect sempre é chamado
      console.log('\n🔄 Finalizando conexão...');
      await emailProvider.disconnect();
    }
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