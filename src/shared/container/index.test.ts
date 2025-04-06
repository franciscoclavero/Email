import 'reflect-metadata';
import { container } from 'tsyringe';
import { IEmailProvider } from '@/domain/interfaces/IEmailProvider';

describe('Container', () => {
  beforeEach(() => {
    // Clear container registrations before each test
    container.clearInstances();
    jest.resetModules();
  });

  it('should register EmailProvider correctly', () => {
    // Import the container module to trigger registrations
    const containerModule = require('./index');
    
    // Access the exported container
    const testContainer = containerModule.container || container;
    
    // Verify the EmailProvider is registered
    const provider = testContainer.resolve('EmailProvider');
    
    // Type check after resolution
    const emailProvider = provider as IEmailProvider;
    expect(emailProvider).toBeDefined();
    expect(emailProvider.connect).toBeDefined();
    expect(emailProvider.disconnect).toBeDefined();
    expect(emailProvider.listUnreadEmails).toBeDefined();
    expect(emailProvider.getEmailContent).toBeDefined();
  });
});