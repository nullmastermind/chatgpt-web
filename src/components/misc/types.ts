export enum AttachItemType {
  PrivateDocument = "PRIVATE_DOCUMENT",
  TextData = "TEXT_DATA",
  Excel = "EXCEL",
  Text = "TEXT",
  OCR = "OCR",
  Image = "IMAGE",
  Audio = "AUDIO",
  Website = "WEBSITE",
}

export type AttachItem = {
  id: string;
  type: AttachItemType;
  name: string;
  data: {
    name: string;
    content: string;
    base64Image?: string;
  }[];
  createdAt: number;
};
