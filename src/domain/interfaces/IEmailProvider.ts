export interface Email {
  id: string;
  messageId?: string;
  subject: string;
  from: string;
  date: Date;
  body?: {
    text?: string;
    html?: string;
  };
}

export interface IEmailProvider {
  connect(): Promise<void>;
  listUnreadEmails(): Promise<Email[]>;
  getEmailContent(id: string): Promise<Email>;
  disconnect(): Promise<void>;
}