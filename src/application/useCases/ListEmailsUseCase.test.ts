import 'reflect-metadata';
import { ListEmailsUseCase } from './ListEmailsUseCase';
import { IEmailProvider, Email, EmailFilterOptions } from '@/domain/interfaces/IEmailProvider';

describe('ListEmailsUseCase', () => {
  let listEmailsUseCase: ListEmailsUseCase;
  let mockEmailProvider: IEmailProvider;
  
  const mockEmails: Email[] = [
    {
      id: '1',
      subject: 'Test Email 1',
      from: 'sender1@example.com',
      date: new Date(),
      seen: false
    },
    {
      id: '2',
      subject: 'Test Email 2',
      from: 'sender2@example.com',
      date: new Date(),
      seen: true
    }
  ];
  
  beforeEach(() => {
    // Create a mock email provider
    mockEmailProvider = {
      configure: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      listUnreadEmails: jest.fn(),
      getEmailContent: jest.fn(),
      markAsRead: jest.fn(),
      listEmails: jest.fn().mockResolvedValue(mockEmails)
    };
    
    // Create the use case with the mock provider
    listEmailsUseCase = new ListEmailsUseCase(mockEmailProvider);
    
    // Mock console.error to prevent output during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('should return emails based on the provided filter options', async () => {
    // Arrange
    const filterOptions: EmailFilterOptions = {
      unreadOnly: true,
      fromAddresses: ['example.com'],
      limit: 5
    };
    
    // Act
    const result = await listEmailsUseCase.execute(filterOptions);
    
    // Assert
    expect(result).toEqual(mockEmails);
    expect(mockEmailProvider.listEmails).toHaveBeenCalledWith(filterOptions);
  });
  
  it('should call listEmails without filter options if none are provided', async () => {
    // Act
    const result = await listEmailsUseCase.execute();
    
    // Assert
    expect(result).toEqual(mockEmails);
    expect(mockEmailProvider.listEmails).toHaveBeenCalledWith(undefined);
  });
  
  it('should throw a specific error if the provider throws an error', async () => {
    // Arrange
    const error = new Error('Provider error');
    (mockEmailProvider.listEmails as jest.Mock).mockRejectedValueOnce(error);
    
    // Act & Assert
    await expect(listEmailsUseCase.execute()).rejects.toThrow('Falha ao listar emails');
    expect(console.error).toHaveBeenCalledWith('❌ Erro ao listar emails:', error);
  });
});