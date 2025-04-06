import { AuthCLI } from './AuthCLI';
import { prompt } from 'enquirer';
import { emailConfig, validateEmailConfig } from '@/shared/config/emailConfig';

// Mock the enquirer library
jest.mock('enquirer', () => {
  return {
    prompt: jest.fn()
  };
});

// Mock do módulo emailConfig
jest.mock('@/shared/config/emailConfig', () => ({
  emailConfig: {
    host: '',
    port: 993,
    user: '',
    pass: ''
  },
  validateEmailConfig: jest.fn().mockReturnValue(false)
}));

describe('AuthCLI', () => {
  let authCLI: AuthCLI;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    authCLI = new AuthCLI();
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    jest.clearAllMocks();
  });

  describe('collectCredentials', () => {
    it('should use saved credentials when available and user confirms', async () => {
      // Arrange - Mock that we have saved credentials
      (validateEmailConfig as jest.Mock).mockReturnValueOnce(true);
      
      // Set mock saved credentials
      Object.assign(emailConfig, {
        host: 'imap.saved.com',
        port: 993,
        user: 'saved@test.com',
        pass: 'savedpass'
      });
      
      // User confirms to use saved credentials
      (prompt as jest.Mock).mockResolvedValueOnce({ useSaved: true });

      // Act
      const result = await authCLI.collectCredentials();

      // Assert
      expect(result).toEqual({
        host: 'imap.saved.com',
        port: 993,
        user: 'saved@test.com',
        password: 'savedpass'
      });
      
      expect(prompt).toHaveBeenCalledTimes(1);
      expect(prompt).toHaveBeenCalledWith(expect.objectContaining({
        type: 'confirm',
        name: 'useSaved',
        message: expect.stringContaining('Encontramos credenciais salvas')
      }));
    });
    
    it('should set saved form values as initial values in prompts', async () => {
      // Arrange - No saved credentials for full authentication flow
      (validateEmailConfig as jest.Mock).mockReturnValueOnce(false);
      
      // Set some values in emailConfig to test initial values
      Object.assign(emailConfig, {
        host: 'imap.example.com', 
        port: 587,
        user: 'user@example.com',
        pass: ''  // Não usamos para senha
      });
      
      // Mock prompt responses for each field
      (prompt as jest.Mock)
        .mockResolvedValueOnce({ host: 'new.example.com' })
        .mockResolvedValueOnce({ port: '465' })
        .mockResolvedValueOnce({ user: 'new@example.com' })
        .mockResolvedValueOnce({ password: 'newpassword' });
      
      // Act
      const result = await authCLI.collectCredentials();
      
      // Assert
      // Verifica se cada prompt foi chamado com o valor inicial correto
      expect(prompt).toHaveBeenNthCalledWith(1, expect.objectContaining({
        type: 'input',
        name: 'host',
        initial: 'imap.example.com'
      }));
      
      expect(prompt).toHaveBeenNthCalledWith(2, expect.objectContaining({
        type: 'input',
        name: 'port',
        initial: '587'
      }));
      
      expect(prompt).toHaveBeenNthCalledWith(3, expect.objectContaining({
        type: 'input',
        name: 'user',
        initial: 'user@example.com'
      }));
      
      // Senha não deve ter valor inicial por segurança
      expect(prompt).toHaveBeenNthCalledWith(4, expect.objectContaining({
        type: 'password',
        name: 'password'
      }));
      
      // Resultado final deve ser os novos valores
      expect(result).toEqual({
        host: 'new.example.com',
        port: 465,
        user: 'new@example.com',
        password: 'newpassword'
      });
    });
    
    it('should prompt for credentials when user declines to use saved credentials', async () => {
      // Arrange - Mock that we have saved credentials
      (validateEmailConfig as jest.Mock).mockReturnValueOnce(true);
      
      // Set mock saved credentials
      Object.assign(emailConfig, {
        host: 'imap.saved.com',
        port: 993,
        user: 'saved@test.com',
        pass: 'savedpass'
      });
      
      // User declines to use saved credentials
      (prompt as jest.Mock).mockResolvedValueOnce({ useSaved: false });
      
      // Mock the prompt responses for new credentials
      const mockCredentials = {
        host: 'imap.test.com',
        port: '993',
        user: 'test@test.com',
        password: 'password123'
      };
      
      (prompt as jest.Mock).mockResolvedValueOnce({ host: mockCredentials.host });
      (prompt as jest.Mock).mockResolvedValueOnce({ port: mockCredentials.port });
      (prompt as jest.Mock).mockResolvedValueOnce({ user: mockCredentials.user });
      (prompt as jest.Mock).mockResolvedValueOnce({ password: mockCredentials.password });

      // Act
      const result = await authCLI.collectCredentials();

      // Assert
      expect(result).toEqual({
        host: mockCredentials.host,
        port: parseInt(mockCredentials.port, 10),
        user: mockCredentials.user,
        password: mockCredentials.password
      });
      
      expect(prompt).toHaveBeenCalledTimes(5); // 1 for confirm + 4 for credentials
    });
    
    it('should return credentials when user provides them', async () => {
      // Arrange - No saved credentials
      (validateEmailConfig as jest.Mock).mockReturnValueOnce(false);
      
      const mockCredentials = {
        host: 'imap.test.com',
        port: '993',
        user: 'test@test.com',
        password: 'password123'
      };

      // Mock the prompt function to return our test values in sequence
      (prompt as jest.Mock).mockResolvedValueOnce({ host: mockCredentials.host });
      (prompt as jest.Mock).mockResolvedValueOnce({ port: mockCredentials.port });
      (prompt as jest.Mock).mockResolvedValueOnce({ user: mockCredentials.user });
      (prompt as jest.Mock).mockResolvedValueOnce({ password: mockCredentials.password });

      // Act
      const result = await authCLI.collectCredentials();

      // Assert
      expect(result).toEqual({
        host: mockCredentials.host,
        port: parseInt(mockCredentials.port, 10),
        user: mockCredentials.user,
        password: mockCredentials.password
      });
      
      expect(prompt).toHaveBeenCalledTimes(4);
      expect(mockConsoleLog).toHaveBeenCalledWith('\n📧 Autenticação de Email IMAP 📧');
    });

    it('should handle errors and return null', async () => {
      // Arrange
      const mockError = new Error('Prompt error');
      (prompt as jest.Mock).mockRejectedValueOnce(mockError);

      // Act
      const result = await authCLI.collectCredentials();

      // Assert
      expect(result).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Erro ao coletar credenciais:', mockError);
    });

    it('should validate port input correctly', async () => {
      // Test the port validation function
      const portPrompt = jest.fn().mockImplementation((prompts) => {
        const portValidation = prompts.validate;
        
        // Invalid ports
        expect(portValidation('')).toBe('Por favor, digite um número de porta válido (1-65535)');
        expect(portValidation('abc')).toBe('Por favor, digite um número de porta válido (1-65535)');
        expect(portValidation('0')).toBe('Por favor, digite um número de porta válido (1-65535)');
        expect(portValidation('65536')).toBe('Por favor, digite um número de porta válido (1-65535)');
        expect(portValidation('-1')).toBe('Por favor, digite um número de porta válido (1-65535)');
        
        // Valid ports
        expect(portValidation('1')).toBe(true);
        expect(portValidation('80')).toBe(true);
        expect(portValidation('993')).toBe(true);
        expect(portValidation('65535')).toBe(true);
        
        return { port: '993' };
      });
      
      // Setup our mocks to test validation
      (prompt as jest.Mock).mockResolvedValueOnce({ host: 'imap.test.com' });
      (prompt as jest.Mock).mockImplementationOnce(portPrompt);
      (prompt as jest.Mock).mockResolvedValueOnce({ user: 'test@test.com' });
      (prompt as jest.Mock).mockResolvedValueOnce({ password: 'password123' });
      
      // Act
      await authCLI.collectCredentials();
      
      // Assert
      expect(portPrompt).toHaveBeenCalled();
    });
    
    it('should handle the case where emailConfig already has values but without saved credentials', async () => {
      // Mock that we don't have valid saved credentials
      (validateEmailConfig as jest.Mock).mockReturnValueOnce(false);
      
      // But we have some partial data in emailConfig
      Object.assign(emailConfig, {
        host: 'imap.previous.com',
        port: 587,
        user: 'previous@test.com',
        pass: '' // Sem senha, então validateEmailConfig retorna false
      });
      
      // Mock the prompt responses
      (prompt as jest.Mock).mockResolvedValueOnce({ host: 'imap.test.com' });
      (prompt as jest.Mock).mockResolvedValueOnce({ port: '993' });
      (prompt as jest.Mock).mockResolvedValueOnce({ user: 'test@test.com' });
      (prompt as jest.Mock).mockResolvedValueOnce({ password: 'password123' });
      
      // Act
      const result = await authCLI.collectCredentials();
      
      // Verify we got the expected result
      expect(result).toEqual({
        host: 'imap.test.com',
        port: 993,
        user: 'test@test.com',
        password: 'password123'
      });
      
      // Verify the prompt was configured with the right initial values
      expect(prompt).toHaveBeenNthCalledWith(1, expect.objectContaining({
        initial: 'imap.previous.com'
      }));
    });
    
    it('should handle empty emailConfig values with proper defaults', async () => {
      // No saved credentials
      (validateEmailConfig as jest.Mock).mockReturnValueOnce(false);
      
      // Empty emailConfig
      Object.assign(emailConfig, {
        host: '',
        port: 0,
        user: '',
        pass: ''
      });
      
      // Mock the prompt responses
      (prompt as jest.Mock).mockResolvedValueOnce({ host: 'imap.test.com' });
      (prompt as jest.Mock).mockResolvedValueOnce({ port: '993' });
      (prompt as jest.Mock).mockResolvedValueOnce({ user: 'test@test.com' });
      (prompt as jest.Mock).mockResolvedValueOnce({ password: 'password123' });
      
      // Act
      await authCLI.collectCredentials();
      
      // Verify Gmail is the default when host is empty
      expect(prompt).toHaveBeenNthCalledWith(1, expect.objectContaining({
        initial: 'imap.gmail.com'
      }));
      
      // Verify 993 is the default port
      expect(prompt).toHaveBeenNthCalledWith(2, expect.objectContaining({
        initial: '993'
      }));
    });

    it('should validate email user input correctly', async () => {
      // Test the email validation function
      const userPrompt = jest.fn().mockImplementation((prompts) => {
        const userValidation = prompts.validate;
        
        // Invalid emails
        expect(userValidation('')).toBe('Por favor, digite um endereço de email válido');
        expect(userValidation('invalid')).toBe('Por favor, digite um endereço de email válido');
        expect(userValidation('invalid.com')).toBe('Por favor, digite um endereço de email válido');
        
        // Valid emails
        expect(userValidation('user@example.com')).toBe(true);
        expect(userValidation('name.surname@domain.co.uk')).toBe(true);
        
        return { user: 'test@example.com' };
      });
      
      // Setup our mocks
      (prompt as jest.Mock).mockResolvedValueOnce({ host: 'imap.test.com' });
      (prompt as jest.Mock).mockResolvedValueOnce({ port: '993' });
      (prompt as jest.Mock).mockImplementationOnce(userPrompt);
      (prompt as jest.Mock).mockResolvedValueOnce({ password: 'password123' });
      
      // Act
      await authCLI.collectCredentials();
      
      // Assert
      expect(userPrompt).toHaveBeenCalled();
    });

    it('should validate password input correctly', async () => {
      // Test the password validation function
      const passwordPrompt = jest.fn().mockImplementation((prompts) => {
        const passwordValidation = prompts.validate;
        
        // Invalid password
        expect(passwordValidation('')).toBe('A senha não pode ser vazia');
        
        // Valid passwords
        expect(passwordValidation('password')).toBe(true);
        expect(passwordValidation('s3cr3t!')).toBe(true);
        
        return { password: 'password123' };
      });
      
      // Setup our mocks
      (prompt as jest.Mock).mockResolvedValueOnce({ host: 'imap.test.com' });
      (prompt as jest.Mock).mockResolvedValueOnce({ port: '993' });
      (prompt as jest.Mock).mockResolvedValueOnce({ user: 'test@example.com' });
      (prompt as jest.Mock).mockImplementationOnce(passwordPrompt);
      
      // Act
      await authCLI.collectCredentials();
      
      // Assert
      expect(passwordPrompt).toHaveBeenCalled();
    });
  });

  describe('showMenu', () => {
    it('should return selected action', async () => {
      // Arrange
      const mockAction = 'emails';
      (prompt as jest.Mock).mockResolvedValueOnce({ action: mockAction });

      // Act
      const result = await authCLI.showMenu();

      // Assert
      expect(result).toBe(mockAction);
      expect(prompt).toHaveBeenCalledWith({
        type: 'select',
        name: 'action',
        message: 'Escolha uma opção:',
        choices: expect.arrayContaining([
          expect.objectContaining({ name: 'emails' }),
          expect.objectContaining({ name: 'mark_read' }),
          expect.objectContaining({ name: 'logout' }),
          expect.objectContaining({ name: 'exit' })
        ])
      });
    });

    it('should handle errors and return "exit"', async () => {
      // Arrange
      const mockError = new Error('Menu error');
      (prompt as jest.Mock).mockRejectedValueOnce(mockError);

      // Act
      const result = await authCLI.showMenu();

      // Assert
      expect(result).toBe('exit');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Erro ao exibir menu:', mockError);
    });
  });

  describe('showLoginError', () => {
    it('should display login error messages', () => {
      // Act
      authCLI.showLoginError();

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith('\n❌ Falha na autenticação!');
      expect(mockConsoleLog).toHaveBeenCalledWith('Verifique se o servidor, email e senha estão corretos.');
      expect(mockConsoleLog).toHaveBeenCalledWith('Se estiver usando Gmail, certifique-se de usar uma senha de aplicativo.');
      expect(mockConsoleLog).toHaveBeenCalledWith('Dica: Gere uma senha de aplicativo em https://myaccount.google.com/apppasswords');
    });
  });

  describe('showLogoutSuccess', () => {
    it('should display logout success message', () => {
      // Act
      authCLI.showLogoutSuccess();

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith('\n👋 Você foi deslogado com sucesso.');
    });
  });
});