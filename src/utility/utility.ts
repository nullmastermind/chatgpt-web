import { Language } from "prism-react-renderer";
import Fuse from "fuse.js";
import IFuseOptions = Fuse.IFuseOptions;
import { findIndex, forEach } from "lodash";
import dayjs from "dayjs";

export type KeyValue = {
  [key: string]: any;
};
export type KeyValues = {
  [key: string]: any[];
};

export type Node = {
  type: string;
  tagName?: string;
  properties: Record<string, unknown>;
  children: Array<Node | string>;
  position: {
    start: {
      line: number;
      column: number;
      offset: number;
    };
    end: {
      line: number;
      column: number;
      offset: number;
    };
  };
};

export type Doc = {
  pageContent: string;
  metadata: {
    source: string;
    hash: string;
    md5: string;
    loc: {
      lines: {
        from: number;
        to: number;
      };
    };
  };
};

export type Docs = {
  data: [Doc, number][];
  tokens: number;
};

export type IndexedDocument = {
  doc_id: string;
  extensions: string[];
  indexAt: string;
  isIndexed: boolean;
};

export function htmlEncode(text: string): string {
  const element = document.createElement("div");
  element.innerText = text;
  return element.innerHTML;
}

export function htmlDecode(encodedText: string): string {
  const parser = new DOMParser();
  const decodedText = parser.parseFromString(encodedText, "text/html").body.textContent;
  return decodedText || "";
}

export function processTaggedMessage(tagName: string, message: string, done: boolean): string {
  message = message.trim();
  const prefix = `<${tagName}>`;
  const suffix = `</${tagName}>`;
  const isTagged = { current: false };

  if (message.length >= prefix.length || done) {
    if (message.startsWith(prefix)) {
      message = message.replace(prefix, "");
      isTagged.current = true;
    }
  } else {
    const prefixChecker = { current: "", parts: prefix.split("") };
    for (let i = 0; i < prefixChecker.parts.length; i++) {
      prefixChecker.current = prefixChecker.parts.join("");

      if (message.startsWith(prefixChecker.current)) {
        message = message.replace(prefixChecker.current, "");
        break;
      }

      prefixChecker.parts.pop();
    }
  }

  if (done) {
    if (message.endsWith(suffix)) {
      const temp = message.split(suffix);
      temp.pop();
      message = temp.join(suffix);
      isTagged.current = true;
    }
  } else {
    const suffixChecker = { current: "", parts: suffix.split("") };
    for (let i = 0; i < suffixChecker.parts.length; i++) {
      suffixChecker.current += suffixChecker.parts[i];
      if (message.endsWith(suffixChecker.current)) {
        const temp = message.split(suffixChecker.current);
        temp.pop();
        message = temp.join(suffixChecker.current);
        break;
      }
    }
  }

  if (isTagged.current) {
    return htmlDecode(message);
  }

  return message;
}

export function filterDocs(docs: [Doc, number][], maxStep = 0.05) {
  let lastScore = -1;
  let alwaysFalse = false;
  const fileHashes = new Set<string>();

  return docs.filter(([doc, score]) => {
    if (alwaysFalse) {
      return fileHashes.has(doc.metadata.md5);
    }

    if (lastScore >= 0) {
      if (score - lastScore > maxStep) {
        alwaysFalse = true;
        return false;
      }
    }

    lastScore = score;
    fileHashes.add(doc.metadata.md5);

    return true;
  });
}

export function doc2ChatContent(doc: Doc, score: number) {
  const startLine = doc.metadata.loc.lines.from;
  const offsetLine = { value: 0 };

  if (doc.pageContent.startsWith("DOCUMENT NAME:")) {
    offsetLine.value = 2;
  }

  const lines = doc.pageContent
    .split("\n")
    .map(v => {
      return v.replace(/```/g, "\\`\\`\\`");
    })
    .map((line, index) => {
      if (index < offsetLine.value) {
        return line;
      }

      return `${startLine + index - offsetLine.value}\t${line}`;
    });
  const source = doc.metadata.source.replace(/\.\.\//g, "").replace(/\.\//g, "");
  const { from, to } = doc.metadata.loc.lines;
  const c = lines.join("\n");

  return `Reference source: ${source}:${from}:${to}\n\n` + "```\n" + c + "\n```";
}

export function importLocalStorageFromFile(cb?: () => any) {
  let inputFile = document.getElementById("import_config_input");

  if (inputFile) {
    inputFile.onchange = (ev: Event) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      const reader = new FileReader();

      reader.onload = function (e: ProgressEvent<FileReader>) {
        const content = e.target?.result as string;
        try {
          const jsonData: Record<string, string> = JSON.parse(content);
          forEach(jsonData, (value, key) => {
            localStorage.setItem(key, value);
          });

          if (cb) cb();
        } catch (error) {
          console.error("Invalid JSON format:", error);
        }
      };

      reader.readAsText(file as any);
    };

    inputFile.click();
  }
}

export function exportLocalStorageToJSON(): void {
  // Retrieve all keys from localStorage
  const keys: string[] = Object.keys(localStorage);

  // Create an object to store the key-value pairs
  const data: { [key: string]: string } = {};

  // Iterate over the keys and retrieve the values
  keys.forEach((key: string) => {
    data[key] = localStorage.getItem(key) || "";
  });

  // Convert the object to a JSON string
  const jsonString: string = JSON.stringify(data, null, 2);

  // Create a Blob object with the JSON string
  const blob: Blob = new Blob([jsonString], { type: "application/json" });

  // Create a download link
  const downloadLink: HTMLAnchorElement = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = `nullgpt-${dayjs().format("YYYY-MM-DD_HH-mm")}.json`;

  // Append the link to the document body and click it programmatically
  document.body.appendChild(downloadLink);
  downloadLink.click();

  // Clean up
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadLink.href);
}

export const wrapRawContent = (content: string) => {
  if (content.startsWith("`") && content.endsWith("`")) {
    return content;
  }

  content = content.replace(/`/g, "\\`");
  return "```" + content + "```";
};

export const unWrapRawContent = (content: string) => {
  if (content.startsWith("```") && content.endsWith("```") && content.includes("\\`")) {
    content = content.substring(3, content.length - 3);
  }
  return content.replace(/\\`/g, "`");
};

export const preprocessMessageContent = (content: string) => {
  content = content.trim();

  const contentArr = content.split("\n");

  if (contentArr[contentArr.length - 1].endsWith("```")) {
    contentArr[contentArr.length - 1] = contentArr[contentArr.length - 1].replace(/(.*?)```/, "$1\n```");
  }

  if (contentArr[0].startsWith("```") && contentArr[0].includes(" ")) {
    contentArr[0] = contentArr[0].replace(/```(.*?)/, "```\n$1");
  }

  content = contentArr.join("\n");

  return content;
};

export const detectProgramLang = (code: string) => {
  const hl: any = (window as any).hljs;
  return hl.highlightAuto(code).language;
};

export const searchArray = (query: string, stringArray: string[]): string[] => {
  if (query.length === 0) return stringArray;

  const options = {
    includeScore: true,
    threshold: 0.2,
    shouldSort: true,
  } as IFuseOptions<any>;

  const fuse = new Fuse(stringArray, options);
  const result = fuse.search(query);

  return result.map(item => item.item);
};

function getAllCombinations(str: string): Set<string> {
  const filteredStr = str;
  const combinations = new Set<string>();

  for (let i = 0; i < filteredStr.length; i++) {
    for (let j = i + 1; j <= filteredStr.length; j++) {
      const combination = filteredStr.slice(i, j);
      combinations.add(combination);
    }
  }

  return combinations;
}

export const findHighlight = (str: string, search: string): string[] => {
  const combinations = getAllCombinations(str);
  const separatorRegex = /[\s_-]/g;
  const highlights = new Map<string, boolean>();
  const searchWithoutSeparators = search.replace(separatorRegex, "");
  let currentWord = "";

  for (const char of searchWithoutSeparators) {
    currentWord += char;

    if (currentWord.length > 0 && !combinations.has(currentWord)) {
      const temp = currentWord.slice(0, -1);
      highlights.set(temp, true);
      currentWord = char;
    }
  }

  if (currentWord.length > 0) {
    highlights.set(currentWord, true);
  }

  return Array.from(highlights.keys());
};

export function validateField(field: string): boolean {
  // Check if the field contains uppercase letters
  if (/[A-Z]/.test(field)) {
    return false;
  }

  // Check if the field contains special characters
  if (/[^a-zA-Z0-9_-]/.test(field)) {
    return false;
  }

  // Check if the field contains spaces
  if (/\s/.test(field)) {
    return false;
  }

  if (field.length === 0) return false;

  // All checks passed, field is valid
  return true;
}

export function formatString(str: string, maxLength: number = 80): string {
  // Replace all occurrences of '\n' with ' '
  str = str.replace(/\n/g, " ");

  // If the string length is greater than 80, cut it and add '...'
  if (str.length > maxLength) {
    str = str.substring(0, maxLength) + "...";
  }

  return str;
}

export function nameWithEmoji(name: string) {
  name = name.trim();
  const emojiRegex = /^\p{Emoji}/u;
  const spaceRegex = /\p{Z}$/u;
  const emojiMatch = name.match(emojiRegex);
  if (!emojiMatch) {
    name = "❔ " + name;
  } else {
    const emojiEndIndex = emojiMatch[0].length;
    if (!spaceRegex.test(name.slice(emojiEndIndex))) {
      name = name.slice(0, emojiEndIndex).trim() + " " + name.slice(emojiEndIndex).trim();
    }
  }
  return name;
}

export function postprocessAnswer(answer: string, isDone = false): string {
  answer = answer.trim();

  if (/.*prompt(\s*)([a-zA-Z]*):.*/i.test(answer)) {
    // const answerArr = answer.split("\n");
    // answerArr[0] = answerArr[0].replace(/.*prompt\s*[a-zA-Z]*:\s*/i, "");
    // if (answerArr[0].trim().length === 0) {
    //   answerArr.shift();
    // }
    // answer = answerArr.join("\n");
  }

  if (answer.startsWith('"') && !isDone) {
    answer = answer + '"';
  }

  if (answer.startsWith("`") && answer.endsWith("`") && !answer.includes("```")) {
    const answerArr = answer.split("");
    answerArr.shift();
    answerArr.pop();
    answer = preprocessMessageContent("```\n" + answerArr.join("") + "\n```");
  }

  try {
    if (isDone && answer.startsWith('"') && answer.endsWith('"')) {
      answer = JSON.parse(answer);
    }
  } catch (ignoredError) {}

  if (isDone && answer.startsWith('"') && answer.endsWith('"')) {
    const answerArr = answer.split("");
    answerArr.shift();
    answerArr.pop();
    answer = answerArr.join("").replace(/\\"/g, '"').replace(/\\n/g, "\n");
  }

  return answer;
}

export const convertToSupportLang = (lang: string): Language => {
  const supportedLanguages = [
    "markup",
    "bash",
    "clike",
    "c",
    "cpp",
    "css",
    "javascript",
    "jsx",
    "coffeescript",
    "actionscript",
    "css-extr",
    "diff",
    "git",
    "go",
    "graphql",
    "handlebars",
    "json",
    "less",
    "makefile",
    "markdown",
    "objectivec",
    "ocaml",
    "python",
    "reason",
    "sass",
    "scss",
    "sql",
    "stylus",
    "tsx",
    "typescript",
    "wasm",
    "yaml",
  ];

  if (["csharp"].includes(lang)) {
    return "cpp";
  }
  if (["rust", "java"].includes(lang)) {
    return "javascript";
  }
  if (!supportedLanguages.includes(lang)) {
    return "javascript";
  }
  return lang as any;
};

export const ignorePromptId = (id: any) => {
  const ignorePromptIds: any[] = JSON.parse(localStorage.getItem(":ignorePromptIds") || "[]");
  if (!ignorePromptIds.includes(id)) {
    ignorePromptIds.push(id);
    localStorage.setItem(":ignorePromptIds", JSON.stringify(ignorePromptIds));
  }
};

export const defaultPrompts = require("./defaultPrompts.json");

const promptVer = "v1";
if (localStorage.getItem(":prompts-ver") !== promptVer) {
  localStorage.setItem(":prompts-ver", promptVer);

  const oldPrompts: any[] = JSON.parse(localStorage.getItem(":prompts") || "[]");
  const ignorePromptIds: any[] = JSON.parse(localStorage.getItem(":ignorePromptIds") || "[]");

  forEach(defaultPrompts, prompt => {
    if (ignorePromptIds.includes(prompt.id)) return;

    const index = findIndex(oldPrompts, (v: any) => v.id === prompt.id);

    if (index === -1) {
      oldPrompts.push(prompt);
    } else {
      oldPrompts[index] = prompt;
    }
  });

  localStorage.setItem(":prompts", JSON.stringify(oldPrompts));
}
