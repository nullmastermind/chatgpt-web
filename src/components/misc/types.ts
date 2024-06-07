export enum AttachItemType {
  PrivateDocument = 'PRIVATE_DOCUMENT',
  TextData = 'TEXT_DATA',
  Excel = 'EXCEL',
  Text = 'TEXT',
  OCR = 'OCR',
  Image = 'IMAGE',
  Audio = 'AUDIO',
  Website = 'WEBSITE',
}

export type AttachItem = {
  id: string;
  type: AttachItemType;
  name: string;
  isFile?: boolean;
  data: {
    name: string;
    content: string;
    base64Image?: string;
    disabled?: boolean;
    metadata?: Record<string, any>;
    isDocument?: boolean;
  }[];
  createdAt: number;
};

export type TMessageItem = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
  id?: string | number;
};

export type TDocumentItem = {
  doc_id: string;
  extensions: string[];
  indexAt: string;
  isIndexed: boolean;
};

export type TPageContentType = {
  pageContent: string;
  metadata: {
    source: string;
    loc: {
      lines: {
        from: number;
        to: number;
      };
    };
    md5: string; // file (all parts)
    hash: string; // part
    summary: boolean;
  };
};

export type TIndexedDocumentItem = [TPageContentType, number];
