import 'dotenv/config';

export const emailConfig = {
  host: process.env.EMAIL_HOST || '',
  port: Number(process.env.EMAIL_PORT) || 993,
  user: process.env.EMAIL_USER || '',
  pass: process.env.EMAIL_PASS || '',
};

export function validateEmailConfig(): void {
  const { host, port, user, pass } = emailConfig;
  
  if (!host || !user || !pass) {
    throw new Error('Email configuration is incomplete. Please check your .env file.');
  }
}