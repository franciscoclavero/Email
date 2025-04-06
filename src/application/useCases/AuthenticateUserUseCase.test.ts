import 'reflect-metadata';
import { AuthenticateUserUseCase } from './AuthenticateUserUseCase';
import { IEmailProvider } from '@/domain/interfaces/IEmailProvider';

describe('AuthenticateUserUseCase', () => {
  let authenticateUserUseCase: AuthenticateUserUseCase;
  let mockEmailProvider: jest.Mocked<IEmailProvider>;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    // Create mock for the email provider
    mockEmailProvider = {
      configure: jest.fn(),
      connect: jest.fn(),
      listUnreadEmails: jest.fn(),
      getEmailContent: jest.fn(),
      markAsRead: jest.fn(),
      disconnect: jest.fn()
    } as jest.Mocked<IEmailProvider>;

    // Create use case with mock provider
    authenticateUserUseCase = new AuthenticateUserUseCase(mockEmailProvider);

    // Mock console.error to avoid test output clutter
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
    jest.clearAllMocks();
  });

  it('should return true on successful authentication', async () => {
    // Arrange
    const host = 'imap.test.com';
    const port = 993;
    const user = 'test@test.com';
    const password = 'test123';

    mockEmailProvider.configure.mockResolvedValue();
    mockEmailProvider.connect.mockResolvedValue();

    // Act
    const result = await authenticateUserUseCase.execute(host, port, user, password);

    // Assert
    expect(result).toBe(true);
    expect(mockEmailProvider.configure).toHaveBeenCalledWith(host, port, user, password);
    expect(mockEmailProvider.connect).toHaveBeenCalled();
  });

  it('should return false if configuration fails', async () => {
    // Arrange
    const host = 'imap.test.com';
    const port = 993;
    const user = 'test@test.com';
    const password = 'test123';
    const error = new Error('Configuration error');

    mockEmailProvider.configure.mockRejectedValue(error);

    // Act
    const result = await authenticateUserUseCase.execute(host, port, user, password);

    // Assert
    expect(result).toBe(false);
    expect(mockEmailProvider.configure).toHaveBeenCalledWith(host, port, user, password);
    expect(mockEmailProvider.connect).not.toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalledWith('❌ Erro na autenticação:', error);
  });

  it('should return false if connection fails', async () => {
    // Arrange
    const host = 'imap.test.com';
    const port = 993;
    const user = 'test@test.com';
    const password = 'test123';
    const error = new Error('Connection error');

    mockEmailProvider.configure.mockResolvedValue();
    mockEmailProvider.connect.mockRejectedValue(error);

    // Act
    const result = await authenticateUserUseCase.execute(host, port, user, password);

    // Assert
    expect(result).toBe(false);
    expect(mockEmailProvider.configure).toHaveBeenCalledWith(host, port, user, password);
    expect(mockEmailProvider.connect).toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalledWith('❌ Erro na autenticação:', error);
  });
});