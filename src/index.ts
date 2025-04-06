import 'reflect-metadata';
import './shared/container';
import { container } from 'tsyringe';
import { ListUnreadEmailsUseCase } from './application/useCases/ListUnreadEmailsUseCase';
import { GetEmailContentUseCase } from './application/useCases/GetEmailContentUseCase';
import { MarkEmailAsReadUseCase } from './application/useCases/MarkEmailAsReadUseCase';
import { AuthenticateUserUseCase } from './application/useCases/AuthenticateUserUseCase';
import { ListEmailsUseCase } from './application/useCases/ListEmailsUseCase';
import { EmailCLI } from './presentation/cli/EmailCLI';
import { AuthCLI } from './presentation/cli/AuthCLI';
import { IEmailProvider, EmailFilterOptions } from './domain/interfaces/IEmailProvider';
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
        
        // Perguntar se o usuário quer voltar à lista ou sair (sem perguntar sobre marcar como lido)
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
  } catch (error) {
    console.error('\n❌ Erro ao listar emails');
    
    if (error instanceof Error) {
      console.error(`   Mensagem: ${error.message}`);
    }
  }
}

async function handleMarkEmailsAsRead(
  emailCLI: EmailCLI,
  listUnreadEmailsUseCase: ListUnreadEmailsUseCase,
  markEmailAsReadUseCase: MarkEmailAsReadUseCase
): Promise<void> {
  try {
    // List unread emails
    const emails = await listUnreadEmailsUseCase.execute();
    
    // Select emails to mark as read
    const selectedEmailIds = await emailCLI.selectEmailsToMarkAsRead(emails);
    
    if (selectedEmailIds.length > 0) {
      console.log(`\n📧 Marcando ${selectedEmailIds.length} email(s) como lido(s)...`);
      
      // Mark each selected email as read
      for (const emailId of selectedEmailIds) {
        await markEmailAsReadUseCase.execute(emailId);
      }
      
      console.log(`✅ ${selectedEmailIds.length} email(s) marcado(s) como lido(s) com sucesso!`);
    } else {
      console.log('ℹ️ Nenhum email selecionado para marcar como lido.');
    }
  } catch (error) {
    console.error('\n❌ Erro ao marcar emails como lidos');
    
    if (error instanceof Error) {
      console.error(`   Mensagem: ${error.message}`);
    }
  }
}

async function handleFilteredEmails(
  emailCLI: EmailCLI,
  listEmailsUseCase: ListEmailsUseCase,
  getEmailContentUseCase: GetEmailContentUseCase
): Promise<void> {
  try {
    console.log('\n📋 Filtrar emails por critérios');
    console.log('='.repeat(50));
    
    // Perguntar se quer filtrar por emails não lidos
    const rlUnread = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const unreadOnly = await new Promise<boolean>((resolve) => {
      rlUnread.question('Mostrar apenas emails não lidos? (S/N): ', (answer) => {
        rlUnread.close();
        resolve(answer.trim().toLowerCase() === 's' || answer.trim().toLowerCase() === 'sim');
      });
    });
    
    // Perguntar se quer filtrar por remetente
    const rlSender = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const senderFilter = await new Promise<string>((resolve) => {
      rlSender.question('Filtrar por remetente (deixe em branco para não filtrar): ', (answer) => {
        rlSender.close();
        resolve(answer.trim());
      });
    });
    
    // Perguntar quantos emails quer ver
    const rlLimit = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const limitStr = await new Promise<string>((resolve) => {
      rlLimit.question('Quantidade de emails a mostrar (padrão: 10): ', (answer) => {
        rlLimit.close();
        resolve(answer.trim());
      });
    });
    
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    
    // Preparar filtro
    const filterOptions: EmailFilterOptions = {
      unreadOnly: unreadOnly,
      limit: limit > 0 ? limit : 10
    };
    
    // Adicionar filtro de remetente se for fornecido
    if (senderFilter) {
      filterOptions.fromAddresses = [senderFilter];
    }
    
    console.log('\n🔍 Buscando emails com os filtros especificados...');
    
    // Buscar emails com os filtros
    const emails = await listEmailsUseCase.execute(filterOptions);
    
    if (emails.length === 0) {
      console.log('📭 Nenhum email encontrado com os filtros especificados.');
      return;
    }
    
    // Mostrar os emails
    console.log(`📬 Encontrados ${emails.length} emails.`);
    
    // Select an email
    const selectedEmail = await emailCLI.selectEmail(emails);
    
    if (selectedEmail) {
      console.log(`\n📧 Carregando conteúdo do email: "${selectedEmail.subject}" de ${selectedEmail.from}`);
      
      // Buscar conteúdo completo do email
      const fullEmail = await getEmailContentUseCase.execute(selectedEmail.id);
      
      // Exibir o conteúdo do email
      emailCLI.displayEmail(fullEmail);
    }
  } catch (error) {
    console.error('\n❌ Erro ao filtrar emails');
    
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
    const listEmailsUseCase = container.resolve(ListEmailsUseCase);
    const emailCLI = new EmailCLI();
    const authCLI = new AuthCLI();
    
    let isAuthenticated = false;
    
    console.log('====== Cliente de Email IMAP ======');
    console.log('Versão 1.0.0');
    
    // Loop principal da aplicação
    let running = true;
    
    while (running) {
      // Se não estiver autenticado, tentar login automático ou mostrar tela de login
      if (!isAuthenticated) {
        // Primeiro, tentar login automático com credenciais salvas
        console.log('🔄 Verificando credenciais salvas...');
        isAuthenticated = await authenticateUserUseCase.executeWithSavedCredentials();
        
        // Se login automático falhar, pedir credenciais
        if (!isAuthenticated) {
          console.log('🔑 Login manual necessário.');
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
          } else {
            console.log('✅ Login realizado com sucesso. Credenciais salvas para uso futuro.');
          }
        } else {
          console.log('✅ Login automático realizado com sucesso!');
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
        
        case 'filter_emails':
          await handleFilteredEmails(
            emailCLI,
            listEmailsUseCase,
            getEmailContentUseCase
          );
          break;
          
        case 'mark_read':
          await handleMarkEmailsAsRead(
            emailCLI,
            listUnreadEmailsUseCase,
            markEmailAsReadUseCase
          );
          break;
          
        case 'logout':
          // Desconectar
          await emailProvider.disconnect();
          
          // Limpar credenciais do .env
          const { clearEmailConfig } = await import('./shared/config/emailConfig');
          const cleared = await clearEmailConfig();
          if (cleared) {
            console.log('🔒 Credenciais removidas do arquivo .env');
          }
          
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