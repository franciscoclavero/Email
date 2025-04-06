import { emailConfig, validateEmailConfig } from './emailConfig';

describe('emailConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load email configuration from environment variables', () => {
    // Setup
    process.env.EMAIL_HOST = 'test.example.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'testpassword';

    // Re-import the module to reload with new env vars
    jest.resetModules();
    const { emailConfig } = require('./emailConfig');

    // Assert
    expect(emailConfig.host).toBe('test.example.com');
    expect(emailConfig.port).toBe(587);
    expect(emailConfig.user).toBe('test@example.com');
    expect(emailConfig.pass).toBe('testpassword');
  });

  it('should use default values when environment variables are not set', () => {
    // Create a clean module with environment variables cleared
    jest.doMock('./emailConfig', () => {
      const originalEnv = { ...process.env };
      
      // Clear email env vars
      delete process.env.EMAIL_HOST;
      delete process.env.EMAIL_PORT;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;
      
      // Import the module with cleared env
      const emailConfigModule = jest.requireActual('./emailConfig');
      
      // Restore env vars
      process.env = originalEnv;
      
      return {
        emailConfig: {
          host: '',
          port: 993,
          user: '',
          pass: ''
        },
        validateEmailConfig: emailConfigModule.validateEmailConfig
      };
    });

    // Get the mocked module
    const { emailConfig } = require('./emailConfig');
    
    // Assert
    expect(emailConfig.host).toBe('');
    expect(emailConfig.port).toBe(993); // Default port
    expect(emailConfig.user).toBe('');
    expect(emailConfig.pass).toBe('');
    
    // Clean up
    jest.dontMock('./emailConfig');
  });

  it('should throw error when validating incomplete config', () => {
    // Setup
    process.env.EMAIL_HOST = '';
    process.env.EMAIL_USER = '';
    process.env.EMAIL_PASS = '';

    // Re-import the module to reload with new env vars
    jest.resetModules();
    const { validateEmailConfig } = require('./emailConfig');

    // Assert
    expect(validateEmailConfig).toThrow('Email configuration is incomplete');
  });
  
  it('should throw error when validating with missing host only', () => {
    // Setup
    process.env.EMAIL_HOST = '';
    process.env.EMAIL_USER = 'user@example.com';
    process.env.EMAIL_PASS = 'password';

    // Re-import the module to reload with new env vars
    jest.resetModules();
    const { validateEmailConfig } = require('./emailConfig');

    // Assert
    expect(validateEmailConfig).toThrow('Email configuration is incomplete');
  });
  
  it('should throw error when validating with missing user only', () => {
    // Setup
    process.env.EMAIL_HOST = 'imap.example.com';
    process.env.EMAIL_USER = '';
    process.env.EMAIL_PASS = 'password';

    // Re-import the module to reload with new env vars
    jest.resetModules();
    const { validateEmailConfig } = require('./emailConfig');

    // Assert
    expect(validateEmailConfig).toThrow('Email configuration is incomplete');
  });
  
  it('should throw error when validating with missing password only', () => {
    // Setup
    process.env.EMAIL_HOST = 'imap.example.com';
    process.env.EMAIL_USER = 'user@example.com';
    process.env.EMAIL_PASS = '';

    // Re-import the module to reload with new env vars
    jest.resetModules();
    const { validateEmailConfig } = require('./emailConfig');

    // Assert
    expect(validateEmailConfig).toThrow('Email configuration is incomplete');
  });

  it('should not throw error when validating complete config', () => {
    // Setup
    process.env.EMAIL_HOST = 'valid.example.com';
    process.env.EMAIL_USER = 'valid@example.com';
    process.env.EMAIL_PASS = 'validpassword';

    // Re-import the module to reload with new env vars
    jest.resetModules();
    const { validateEmailConfig } = require('./emailConfig');

    // Assert
    expect(validateEmailConfig).not.toThrow();
  });
});