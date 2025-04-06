import 'reflect-metadata';
import { container } from 'tsyringe';
import { IEmailProvider } from '@/domain/interfaces/IEmailProvider';
import { ImapEmailProvider } from '@/infrastructure/imap/ImapEmailProvider';

// Registra o provedor de email IMAP
container.registerSingleton<IEmailProvider>(
  'EmailProvider',
  ImapEmailProvider
);

// Exporta o container para poder ser acessado em outros módulos
export { container };