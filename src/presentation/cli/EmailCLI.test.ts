import { EmailCLI } from './EmailCLI';
import { Email } from '@/domain/interfaces/IEmailProvider';
import { prompt } from 'enquirer';

// Mock enquirer
jest.mock('enquirer', () => ({
  prompt: jest.fn()
}));

describe('EmailCLI', () => {
  let cli: EmailCLI;
  let mockEmails: Email[];
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let mockConsoleClear: jest.SpyInstance;

  beforeEach(() => {
    cli = new EmailCLI();
    mockEmails = [
      {
        id: '1',
        subject: 'Test Subject 1',
        from: 'sender1@example.com',
        date: new Date('2023-01-01T10:00:00Z'),
      },
      {
        id: '2',
        subject: 'Test Subject 2',
        from: 'sender2@example.com',
        date: new Date('2023-01-02T10:00:00Z'),
      }
    ];
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleClear = jest.spyOn(console, 'clear').mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleClear.mockRestore();
    jest.clearAllMocks();
  });

  describe('selectEmail', () => {
    it('should display message when no emails are found', async () => {
      // Act
      const result = await cli.selectEmail([]);

      // Assert
      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Nenhum email não lido encontrado'));
    });

    it('should return selected email', async () => {
      // Setup
      (prompt as jest.Mock).mockResolvedValue({ email: '1' });

      // Act
      const result = await cli.selectEmail(mockEmails);

      // Assert
      expect(prompt).toHaveBeenCalledWith(expect.objectContaining({
        type: 'select',
        name: 'email',
        choices: expect.arrayContaining([
          expect.objectContaining({ name: '1' }),
          expect.objectContaining({ name: '2' })
        ])
      }));
      expect(result).toEqual(mockEmails[0]);
    });
    
    it('should return null if no matching email is found', async () => {
      // Setup
      (prompt as jest.Mock).mockResolvedValue({ email: '3' }); // ID that doesn't exist

      // Act
      const result = await cli.selectEmail(mockEmails);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle errors during prompt', async () => {
      // Setup
      (prompt as jest.Mock).mockRejectedValue(new Error('Prompt error'));

      // Act
      const result = await cli.selectEmail(mockEmails);

      // Assert
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('❌ Erro ao selecionar email:', expect.any(Error));
    });
  });

  describe('selectEmailsToMarkAsRead', () => {
    it('should display message when no emails are found', async () => {
      // Act
      const result = await cli.selectEmailsToMarkAsRead([]);

      // Assert
      expect(result).toEqual([]);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Nenhum email não lido encontrado'));
    });

    it('should return selected email ids', async () => {
      // Setup
      (prompt as jest.Mock).mockResolvedValue({ emails: ['1', '2'] });

      // Act
      const result = await cli.selectEmailsToMarkAsRead(mockEmails);

      // Assert
      expect(prompt).toHaveBeenCalledWith(expect.objectContaining({
        type: 'multiselect',
        name: 'emails',
        message: expect.stringContaining('Selecione emails para marcar como lidos'),
        choices: expect.arrayContaining([
          expect.objectContaining({ name: '1' }),
          expect.objectContaining({ name: '2' })
        ])
      }));
      expect(result).toEqual(['1', '2']);
    });

    it('should handle errors during prompt', async () => {
      // Setup
      (prompt as jest.Mock).mockRejectedValue(new Error('Prompt error'));

      // Act
      const result = await cli.selectEmailsToMarkAsRead(mockEmails);

      // Assert
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('❌ Erro ao selecionar emails:', expect.any(Error));
    });
  });

  describe('displayEmail', () => {
    it('should display email headers and text content', () => {
      // Setup
      const email: Email = {
        id: '1',
        subject: 'Test Subject',
        from: 'sender@example.com',
        date: new Date('2023-01-01T10:00:00Z'),
        body: {
          text: 'This is the text content'
        }
      };

      // Act
      cli.displayEmail(email);

      // Assert
      expect(console.clear).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('De: sender@example.com'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Assunto: Test Subject'));
      expect(console.log).toHaveBeenCalledWith('This is the text content');
    });

    it('should display email headers and convert HTML content', () => {
      // Setup
      const email: Email = {
        id: '1',
        subject: 'Test Subject',
        from: 'sender@example.com',
        date: new Date('2023-01-01T10:00:00Z'),
        body: {
          html: '<p>This is HTML</p><br>With line breaks'
        }
      };

      // Act
      cli.displayEmail(email);

      // Assert
      expect(console.clear).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('De: sender@example.com'));
      // Check if HTML was converted to text
      const calls = mockConsoleLog.mock.calls.flat();
      const textContent = calls.find((call: string) => 
        typeof call === 'string' && call.includes('This is HTML')
      );
      expect(textContent).toBeDefined();
      expect(textContent).toContain('This is HTML');
      expect(textContent).toContain('With line breaks');
    });

    it('should display message when no content is available', () => {
      // Setup
      const email: Email = {
        id: '1',
        subject: 'Test Subject',
        from: 'sender@example.com',
        date: new Date('2023-01-01T10:00:00Z'),
        body: {}
      };

      // Act
      cli.displayEmail(email);

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Nenhum conteúdo disponível'));
    });
    
    it('should handle email with null body', () => {
      // Setup
      const email: Email = {
        id: '1',
        subject: 'Test Subject',
        from: 'sender@example.com',
        date: new Date('2023-01-01T10:00:00Z')
        // No body property
      };

      // Act
      cli.displayEmail(email);

      // Assert
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Nenhum conteúdo disponível'));
    });
    
    it('should handle different types of HTML content', () => {
      // Setup
      const email: Email = {
        id: '1',
        subject: 'Test Subject',
        from: 'sender@example.com',
        date: new Date('2023-01-01T10:00:00Z'),
        body: {
          html: '<div>Complex <strong>HTML</strong></div><br/><p>Multiple paragraphs</p><p>Second paragraph</p>'
        }
      };

      // Act
      cli.displayEmail(email);

      // Assert
      const calls = mockConsoleLog.mock.calls.flat();
      const textContent = calls.find((call: string) => 
        typeof call === 'string' && call.includes('Complex HTML')
      );
      expect(textContent).toBeDefined();
      expect(textContent).toContain('Multiple paragraphs');
      expect(textContent).toContain('Second paragraph');
    });
    
    it('should handle HTML links, entities and special elements', () => {
      // Setup
      const email: Email = {
        id: '1',
        messageId: '<test123@example.com>',
        subject: 'Test with HTML Entities',
        from: 'sender@example.com',
        date: new Date('2023-01-01T10:00:00Z'),
        body: {
          html: '<div><h2>Title</h2><p>This is a <a href="https://example.com">link</a> with &quot;entities&quot; &amp; special chars.</p><ul><li>Item 1</li><li>Item 2</li></ul><table><tr><td>Cell 1</td><td>Cell 2</td></tr></table></div>'
        }
      };

      // Act
      cli.displayEmail(email);

      // Assert
      // Check if Message ID is displayed
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ID: <test123@example.com>'));
      
      // Find the content in the log calls
      const calls = mockConsoleLog.mock.calls.flat();
      const textContentArray = calls.filter((call: string) => 
        typeof call === 'string' && 
        (call.includes('Title') || 
         call.includes('link') ||
         call.includes('Item 1') ||
         call.includes('Cell 1'))
      );
      
      // Expect formatted elements
      expect(textContentArray.some(text => text.includes('Title'))).toBeTruthy();
      expect(textContentArray.some(text => text.includes('link (https://example.com)'))).toBeTruthy();
      expect(textContentArray.some(text => text.includes('"entities" & special chars'))).toBeTruthy();
      expect(textContentArray.some(text => text.includes('• Item 1'))).toBeTruthy();
      expect(textContentArray.some(text => text.includes('• Item 2'))).toBeTruthy();
      expect(textContentArray.some(text => text.includes('Cell 1'))).toBeTruthy();
    });
    
    it('should format plain text correctly', () => {
      // Setup
      const email: Email = {
        id: '1',
        subject: 'Plain text email',
        from: 'sender@example.com',
        date: new Date('2023-01-01T10:00:00Z'),
        body: {
          text: 'Line 1\r\nLine 2\r\n\r\n\r\n\r\nMultiple blank lines above\r\n    Indented line    '
        }
      };

      // Act
      cli.displayEmail(email);

      // Assert
      // Find the content in the log calls
      const calls = mockConsoleLog.mock.calls.flat();
      const textContent = calls.find((call: string) => 
        typeof call === 'string' && call.includes('Line 1')
      );
      
      expect(textContent).toBeDefined();
      expect(textContent).toContain('Line 1');
      expect(textContent).toContain('Line 2');
      expect(textContent).toContain('Multiple blank lines above');
      expect(textContent).toContain('Indented line');
    });
  });
});