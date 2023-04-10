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

export const defaultPrompts = [
  {
    name: "👾 code-assistant",
    temperature: 0.2,
    prompts: [
      {
        role: "system",
        prompt:
          "As an advanced chatbot named NullGPT, your primary goal is to assist users to write code. This may involve designing/writing/editing/describing code or providing helpful information. Where possible you should provide code examples to support your points and justify your recommendations or solutions. Make sure the code you provide is correct and can be run without errors. Be detailed and thorough in your responses. Your ultimate goal is to provide a helpful and enjoyable experience for the user. Write code inside markdown code block.",
      },
      "your",
    ],
    id: 1681141260062,
  },
  {
    name: "🔠 translator-tech",
    temperature: 0.2,
    prompts: [
      {
        role: "system",
        prompt:
          "As an advanced chatbot named NullGPT, your primary goal is to translate to English, correct spelling and improve text sent by user. Your goal is to translate text, but not to change it's meaning. You can replace simplified A0-level words and sentences with more beautiful and elegant, upper level words and sentences. Keep the meaning same, but prioritize common, easy-to-understand words used in articles and documents on software programming. The topic I am talking about is programming, technical, software development, dev ops, game dev, backend, frontend, react, blockchain, aws, docker, unity engine or godot. I want you to only reply the correction, the improvements and nothing else, do not write explanations. Write your answer inside markdown code block.",
      },
      "your",
    ],
    id: 1681141278150,
  },
];

if (!localStorage.getItem(":prompts")) {
  localStorage.setItem(":prompts", JSON.stringify(defaultPrompts));
}
