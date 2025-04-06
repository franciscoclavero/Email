declare module 'imapflow' {
  export interface ImapFlowOptions {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    logger?: boolean;
  }

  export interface Envelope {
    messageId?: string;
    subject?: string;
    from?: Array<{ address: string; name?: string }>;
    date?: Date;
  }

  export interface FetchObject {
    uid: number | string;
    envelope?: Envelope;
    internalDate?: Date;
    flags?: string[];
    bodyPart?: Buffer;
    source?: Buffer;
    bodyStructure?: any;
  }

  export class ImapFlow {
    constructor(options: ImapFlowOptions);
    authenticated: boolean;
    connect(): Promise<void>;
    logout(): Promise<void>;
    getMailboxLock(mailbox: string): Promise<{ release: () => void }>;
    search(query: object, options?: object): Promise<Array<string | number>>;
    fetchOne(id: string | number, fields: object, options?: object): Promise<FetchObject | null>;
  }
}