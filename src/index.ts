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
import { prompt } from 'enquirer';

async function handleEmailList(
  emailCLI: EmailCLI,
  listEmailsUseCase: ListEmailsUseCase,
  listUnreadEmailsUseCase: ListUnreadEmailsUseCase,
  getEmailContentUseCase: GetEmailContentUseCase,
  markEmailAsReadUseCase: MarkEmailAsReadUseCase
): Promise<void> {
  try {
    // Mostrar opções de listagem de e-mails
    const filterOptions = await emailCLI.selectFilters();

    // Se o usuário selecionou "Voltar", retornar ao menu principal
    if (!filterOptions.limit && !filterOptions.unreadOnly && !filterOptions.fromAddresses) {
      return;
    }

    console.log('\n🔍 Buscando emails com os filtros selecionados...');
    
    // Buscar emails com os filtros escolhidos
    const emails = await listEmailsUseCase.execute(filterOptions);
    
    if (emails.length === 0) {
      console.log('📭 Nenhum email encontrado com os filtros especificados.');
      return;
    }
    
    console.log(`\n📬 Encontrados ${emails.length} emails.`);
    
    // Selecionar emails
    const selectedEmail = await emailCLI.selectEmail(emails);
    
    if (selectedEmail) {
      let continueWithEmail = true;
      
      while (continueWithEmail) {
        // Perguntar o que fazer com o email
        const action = await emailCLI.selectEmailAction(selectedEmail);
        
        switch (action) {
          case 'view':
            console.log(`\n📧 Carregando conteúdo do email: "${selectedEmail.subject}" de ${selectedEmail.from}`);
            
            // Buscar conteúdo completo do email
            const fullEmail = await getEmailContentUseCase.execute(selectedEmail.id);
            
            // Exibir o conteúdo do email
            emailCLI.displayEmail(fullEmail);
            
            // Aguardar um Enter para continuar
            await new Promise<void>((resolve) => {
              const rl = createInterface({
                input: process.stdin,
                output: process.stdout
              });
              
              rl.question('\n📋 Pressione ENTER para retornar: ', () => {
                rl.close();
                resolve();
              });
            });
            break;
            
          case 'mark':
            // Marcar como lido
            console.log(`\n📧 Marcando email como lido: "${selectedEmail.subject}"`);
            await markEmailAsReadUseCase.execute(selectedEmail.id);
            console.log('✅ Email marcado como lido com sucesso!');
            continueWithEmail = false;
            break;
            
          case 'back':
            continueWithEmail = false;
            break;
        }
      }
    }
  } catch (error) {
    console.error('\n❌ Erro ao listar emails');
    
    if (error instanceof Error) {
      console.error(`   Mensagem: ${error.message}`);
    }
  }
}

async function handleEmailsWithMultiSelection(
  emailCLI: EmailCLI,
  listEmailsUseCase: ListEmailsUseCase,
  getEmailContentUseCase: GetEmailContentUseCase,
  markEmailAsReadUseCase: MarkEmailAsReadUseCase
): Promise<void> {
  try {
    // Mostrar opções de listagem de e-mails
    const filterOptions = await emailCLI.selectFilters();

    // Se o usuário selecionou "Voltar", retornar ao menu principal
    if (!filterOptions.limit && !filterOptions.unreadOnly && !filterOptions.fromAddresses) {
      return;
    }

    console.log('\n🔍 Buscando emails com os filtros selecionados...');
    
    // Buscar emails com os filtros escolhidos
    const emails = await listEmailsUseCase.execute(filterOptions);
    
    if (emails.length === 0) {
      console.log('📭 Nenhum email encontrado com os filtros especificados.');
      return;
    }
    
    console.log(`\n📬 Encontrados ${emails.length} emails.`);
    
    // Selecionar múltiplos emails
    const selectedEmailIds = await emailCLI.selectEmailsToMarkAsRead(emails);
    
    if (selectedEmailIds.length > 0) {
      // Perguntar o que fazer com os emails selecionados
      const response = await prompt<{ action: string }>({
        type: 'select',
        name: 'action',
        message: `O que deseja fazer com os ${selectedEmailIds.length} emails selecionados?`,
        choices: [
          { name: 'mark', message: '✓ Marcar como lidos', value: 'mark' },
          { name: 'view', message: '👁️ Ver conteúdo do primeiro email', value: 'view' },
          { name: 'cancel', message: '❌ Cancelar', value: 'cancel' }
        ]
      });
      
      switch (response.action) {
        case 'mark':
          console.log(`\n📧 Marcando ${selectedEmailIds.length} email(s) como lido(s)...`);
          
          // Mark each selected email as read
          for (const emailId of selectedEmailIds) {
            await markEmailAsReadUseCase.execute(emailId);
          }
          
          console.log(`✅ ${selectedEmailIds.length} email(s) marcado(s) como lido(s) com sucesso!`);
          break;
          
        case 'view':
          if (selectedEmailIds.length > 0) {
            const firstEmailId = selectedEmailIds[0];
            const selectedEmail = emails.find(email => email.id === firstEmailId);
            
            if (selectedEmail) {
              console.log(`\n📧 Carregando conteúdo do email: "${selectedEmail.subject}" de ${selectedEmail.from}`);
              
              // Buscar conteúdo completo do email
              const fullEmail = await getEmailContentUseCase.execute(selectedEmail.id);
              
              // Exibir o conteúdo do email
              emailCLI.displayEmail(fullEmail);
              
              // Aguardar confirmação
              await new Promise<void>((resolve) => {
                const rl = createInterface({
                  input: process.stdin,
                  output: process.stdout
                });
                
                rl.question('\n📋 Pressione ENTER para continuar: ', () => {
                  rl.close();
                  resolve();
                });
              });
            }
          }
          break;
          
        case 'cancel':
          console.log('ℹ️ Operação cancelada.');
          break;
      }
    } else {
      console.log('ℹ️ Nenhum email selecionado.');
    }
  } catch (error) {
    console.error('\n❌ Erro ao processar emails selecionados');
    
    if (error instanceof Error) {
      console.error(`   Mensagem: ${error.message}`);
    }
  }
}

// Esta função não é mais usada, pois foi substituída pelas novas funções de filtro

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
          // Mostrar opções de como listar os emails
          const listingResponse = await prompt<{ option: string }>({
            type: 'select',
            name: 'option',
            message: 'Como deseja visualizar os emails?',
            choices: [
              { name: 'individual', message: '👤 Seleção individual', value: 'individual' },
              { name: 'multiple', message: '👥 Seleção múltipla', value: 'multiple' },
              { name: 'back', message: '⬅️ Voltar', value: 'back' }
            ]
          });
          
          if (listingResponse.option === 'individual') {
            await handleEmailList(
              emailCLI,
              listEmailsUseCase,
              listUnreadEmailsUseCase,
              getEmailContentUseCase,
              markEmailAsReadUseCase
            );
          } else if (listingResponse.option === 'multiple') {
            await handleEmailsWithMultiSelection(
              emailCLI,
              listEmailsUseCase,
              getEmailContentUseCase,
              markEmailAsReadUseCase
            );
          }
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