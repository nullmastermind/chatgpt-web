export enum AttachItemType {
  PrivateDocument = "PRIVATE_DOCUMENT",
  TextData = "TEXT_DATA",
  Excel = "EXCEL",
  Text = "TEXT",
  OCR = "OCR",
  Audio = "AUDIO",
  Website = "WEBSITE",
}

export type AttachItem = {
  id: string;
  type: AttachItemType;
  data: {
    name: string;
    content: string;
    base64Image?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
};
