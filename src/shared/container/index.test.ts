import 'reflect-metadata';
import { container } from 'tsyringe';
import { IEmailProvider } from '@/domain/interfaces/IEmailProvider';

describe('Container', () => {
  beforeEach(() => {
    // Clear container registrations before each test
    container.clearInstances();
  });

  it('should register EmailProvider', () => {
    // Import the container module to trigger registrations
    require('./index');

    // Verify the EmailProvider is registered
    expect(() => container.resolve<IEmailProvider>('EmailProvider')).not.toThrow();
  });
});