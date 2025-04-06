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
  configure(host: string, port: number, user: string, password: string): Promise<void>;
  connect(): Promise<void>;
  listUnreadEmails(): Promise<Email[]>;
  getEmailContent(id: string): Promise<Email>;
  markAsRead(id: string): Promise<void>;
  disconnect(): Promise<void>;
}