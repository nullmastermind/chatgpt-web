import { Language } from "prism-react-renderer";

export type KeyValue = {
  [key: string]: any;
};
export type KeyValues = {
  [key: string]: any[];
};

export const preprocessMessageContent = (content: string) => {
  content = content.replace(/```(.*?)```/g, "```\n$1\n```");
  return content;
};

export const detectProgramLang = (code: string) => {
  const hl: any = (window as any).hljs;
  return hl.highlightAuto(code).language;
};

export const convertToSupportLang = (lang: string): Language => {
  if (["csharp"].includes(lang)) {
    return "cpp";
  }
  if (["rust", "java"].includes(lang)) {
    return "javascript";
  }
  return lang as any;
};
