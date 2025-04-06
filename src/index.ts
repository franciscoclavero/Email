import 'reflect-metadata';
import './shared/container';
import { container } from 'tsyringe';
import { ListUnreadEmailsUseCase } from './application/useCases/ListUnreadEmailsUseCase';
import { GetEmailContentUseCase } from './application/useCases/GetEmailContentUseCase';
import { MarkEmailAsReadUseCase } from './application/useCases/MarkEmailAsReadUseCase';
import { AuthenticateUserUseCase } from './application/useCases/AuthenticateUserUseCase';
import { EmailCLI } from './presentation/cli/EmailCLI';
import { AuthCLI } from './presentation/cli/AuthCLI';
import { IEmailProvider } from './domain/interfaces/IEmailProvider';
import { createInterface } from 'readline';

async function handleEmailList(
  emailCLI: EmailCLI,
  listUnreadEmailsUseCase: ListUnreadEmailsUseCase,
  getEmailContentUseCase: GetEmailContentUseCase,
  markEmailAsReadUseCase: MarkEmailAsReadUseCase
): Promise<void> {
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
        
        // Exibir o conteúdo do email
        emailCLI.displayEmail(fullEmail);
        
        // Criar uma única interface para ambas as perguntas
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        // Perguntar se deseja marcar como lido
        const answerMark = await new Promise<string>((resolve) => {
          rl.question('\n📧 Deseja marcar este email como lido? (S/N): ', (answer) => {
            resolve(answer.trim().toLowerCase());
          });
        });
        
        if (answerMark === 's' || answerMark === 'sim') {
          await markEmailAsReadUseCase.execute(selectedEmail.id);
          console.log('✅ Email marcado como lido com sucesso!');
        } else {
          console.log('ℹ️ Email mantido como não lido.');
        }
        
        // Perguntar se o usuário quer voltar à lista ou sair
        const answer = await new Promise<string>((resolve) => {
          rl.question('\n📋 Pressione ENTER para voltar à lista ou "Q" para sair: ', (answer) => {
            rl.close(); // Fechamos a interface apenas uma vez, após as duas perguntas
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
  } catch (error) {
    console.error('\n❌ Erro ao listar emails');
    
    if (error instanceof Error) {
      console.error(`   Mensagem: ${error.message}`);
    }
  }
}

async function main() {
  try {
    // Get dependencies
    const emailProvider = container.resolve<IEmailProvider>('EmailProvider');
    const authenticateUserUseCase = container.resolve(AuthenticateUserUseCase);
    const listUnreadEmailsUseCase = container.resolve(ListUnreadEmailsUseCase);
    const getEmailContentUseCase = container.resolve(GetEmailContentUseCase);
    const markEmailAsReadUseCase = container.resolve(MarkEmailAsReadUseCase);
    const emailCLI = new EmailCLI();
    const authCLI = new AuthCLI();
    
    let isAuthenticated = false;
    
    console.log('====== Cliente de Email IMAP ======');
    console.log('Versão 1.0.0');
    
    // Loop principal da aplicação
    let running = true;
    
    while (running) {
      // Se não estiver autenticado, mostrar tela de login
      if (!isAuthenticated) {
        const credentials = await authCLI.collectCredentials();
        
        if (!credentials) {
          console.log('Login cancelado. Saindo...');
          running = false;
          continue;
        }
        
        const { host, port, user, password } = credentials;
        
        // Tenta autenticar
        isAuthenticated = await authenticateUserUseCase.execute(host, port, user, password);
        
        if (!isAuthenticated) {
          authCLI.showLoginError();
          
          // Perguntar se quer tentar novamente
          const answer = await new Promise<string>((resolve) => {
            const rl = createInterface({
              input: process.stdin,
              output: process.stdout
            });
            
            rl.question('\nDeseja tentar novamente? (S/N): ', (answer) => {
              rl.close();
              resolve(answer.trim().toLowerCase());
            });
          });
          
          if (answer !== 's' && answer !== 'sim') {
            running = false;
          }
          
          continue;
        }
      }
      
      // Se chegou aqui, está autenticado. Mostrar menu
      const selectedOption = await authCLI.showMenu();
      
      switch (selectedOption) {
        case 'emails':
          await handleEmailList(
            emailCLI,
            listUnreadEmailsUseCase,
            getEmailContentUseCase,
            markEmailAsReadUseCase
          );
          break;
          
        case 'logout':
          // Desconectar
          await emailProvider.disconnect();
          
          // Mostrar mensagem de logout
          authCLI.showLogoutSuccess();
          
          // Resetar autenticação
          isAuthenticated = false;
          break;
          
        case 'exit':
          running = false;
          
          // Desconectar se estiver conectado
          if (isAuthenticated) {
            await emailProvider.disconnect();
          }
          
          console.log('\n👋 Até logo!');
          break;
      }
    }
  } catch (error) {
    console.error('\n❌ Erro na aplicação');
    
    if (error instanceof Error) {
      console.error(`   Mensagem: ${error.message}`);
    }
  }
}

main();