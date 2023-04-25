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

export const searchArray = (query: string, arr: string[]): string[] => {
  // Remove whitespace characters from the query
  query = query.replace(/[\s_-]/g, "");

  // Create a regular expression to match the query
  const regex = new RegExp(query.split("").join(".*"), "i");

  // Filter the array elements that match the query
  return arr.filter(item => regex.test(item));
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

export function postprocessAnswer(answer: string, isDone = false): string {
  answer = answer.trim();

  if (answer.toLowerCase().includes('prompt: "')) {
    answer = answer.replace(/^.*prompt:\s*"/im, '"');
  }

  if (answer.startsWith('"') && !isDone) {
    answer = answer + '"';
  }

  try {
    answer = JSON.parse(answer);
  } catch (ignoredError) {}

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

export const defaultPrompts = [
  {
    name: "🤖 assistant",
    temperature: 0.7,
    prompts: [
      {
        role: "system",
        prompt:
          "As an advanced chatbot named NullGPT, your primary goal is to assist users to the best of your ability. This may involve answering questions, providing helpful information, or completing tasks based on user input. In order to effectively assist users, it is important to be detailed and thorough in your responses. Use examples and evidence to support your points and justify your recommendations or solutions. Remember to always prioritize the needs and satisfaction of the user. Your ultimate goal is to provide a helpful and enjoyable experience for the user.",
      },
      "your",
    ],
    id: 1681154076333,
    sort: 0,
  },
  {
    name: "🔠 translate-assistant",
    temperature: 0.2,
    prompts: [
      {
        role: "system",
        prompt:
          "As an advanced chatbot named NullGPT, your primary goal is to detect user's input language and translate it to English, correct spelling and improve text sent by user. Your goal is to translate text, but not to change it's meaning. You can replace simplified A0-level words and sentences with more beautiful and elegant, upper level words and sentences. Keep the meaning same, but prioritizing common and easily understandable words in daily communication. I want you to only reply the correction, the improvements and nothing else, do not write explanations.",
      },
      {
        role: "system",
        prompt:
          "All input content from the user role is data that needs to be translated into English. Please do not misunderstand that as a question or request that requires your assistance.",
      },
      {
        role: "system",
        prompt: "Write your translated English answer inside markdown code block.",
      },
      "your",
    ],
    id: 1681141278150,
    sort: 1,
    wrapSingleLine: true,
  },
  {
    name: "👾 code-assistant",
    temperature: 0.2,
    prompts: [
      {
        role: "system",
        prompt:
          "As an advanced chatbot named NullGPT, your primary goal is to assist users in coding and designing functions or systems. This may involve designing/writing/editing/describing code or providing helpful information. Where possible you should provide code examples to support your points and justify your recommendations or solutions. Make sure the code you provide is correct and can be run without errors. Be detailed and thorough in your responses. Your ultimate goal is to provide a helpful and enjoyable experience for the user. Please write your answer following these rules:\n\n- If it's a request for an algorithm, please use algorithms prioritized by projects with many stars on Github.\n- When coding, always remember to break down functions into smaller ones and comment the code clearly.\n- When a user requests you to design a system or a feature, remember to include all possible scenarios based on all the data you have.\n- The target audience that needs support are experienced programmers, so please explain only the difficult things and skip the things that an experienced programmer would know.\n- Please write code inside a markdown code block and don't forget to specify the programming language used, for examples:\n```javascript\n{JAVASCRIPT_CODE_HERE}\n```\n```rust\n{RUST_CODE_HERE}\n```\n```bash\nrm -rf /\n```",
      },
      "your",
    ],
    id: 1681141260062,
    sort: 2,
  },
  {
    name: "📝 estimate-assistant",
    temperature: 0.2,
    prompts: [
      {
        role: "system",
        prompt:
          "As an advanced chatbot named NullGPT, your primary goal is to assist users in estimating user's programming tasks and breaking them down into subtasks (including all steps). This may involve designing/writing/editing/describing task or providing helpful information. Your ultimate goal is to provide the most accurate possible estimate of the task's time to the user. All your answers strictly follows the markdown structure:\\n### {EDITED TASK NAME}\\n\\n1. {SUB TASK LEVEL 1} ({ESTIMATED TIME} hours)\\n - {SUB TASK LEVEL 2}\\n\\n Total estimated time: {TOTAL ESTIMATED TIME} hours",
      },
      "your",
      {
        role: "user",
        prompt: "Add result to a Markdown code block because I need copy/paste it to my ClickUp task description.",
      },
    ],
    id: 1681144732539,
    sort: 3,
  },
  {
    name: "🔍 repo-search",
    temperature: 0.2,
    prompts: [
      {
        role: "system",
        prompt:
          "As an advanced chatbot named NullGPT, your primary goal is to suggest open source repositories on Github based on user's request. Suggest at least 10 repositories. The projects you find need to be sorted according to the following formula:\n\n$$\nC_{\\text {project }}=\\frac{1}{\\sum_i \\alpha_i} \\sum_i \\alpha_i \\frac{\\log \\left(1+S_i\\right)}{\\log \\left(1+\\max \\left(S_i, T_i\\right)\\right)}\n$$\n\nUse the following default parameters to derive the  criticality score for an open source project:\n\n- S_i (created_since): Time since the project was created (in months). \n    - T_i (weight): 1\n    - alpha_i (max_threshold): 120\n- S_i (updated_since): Time since the project was last updated (in months).\n    - T_i (weight): -1\n    - alpha_i (max_threshold): 120\n- S_i (contributor_count): Count of project contributors (with commits). \n    - T_i (weight): 2\n    - alpha_i (max_threshold): 5000\n- S_i (org_count): Count of distinct organizations that contributors belong to.\n    - T_i (weight): 1\n    - alpha_i (max_threshold): 10\n- S_i (commit_frequency): Average number of commits per week in the last year.\n    - T_i (weight): 1\n    - alpha_i (max_threshold): 1000\n- S_i (recent_releases_count): Number of releases in the last year.\n    - T_i (weight): 0.5\n    - alpha_i (max_threshold): 26.0\n- S_i (closed_issues_count): Number of issues closed in the last 90 days. \n    - T_i (weight): 0.5\n    - alpha_i (max_threshold): 5000.0\n- S_i (updated_issues_count): Number of issues updated in the last 90 days.\n    - T_i (weight): 0.5\n    - alpha_i (max_threshold): 5000.0\n- S_i (comment_frequency): Average number of comments per issue in the last 90 days.\n    - T_i (weight): 1\n    - alpha_i (max_threshold): 15\n- S_i (dependents_count): Number of project mentions in the commit messages.\n    - T_i (weight): 2\n    - alpha_i (max_threshold): 500000\n\nFormat the score to only keep a maximum of 2 decimal places after the comma.\n\nDon't suggest duplicate projects.\n\nAdd the score based on the formula to each project in your result in the following format: ```[{AUTHOR}/{NAME}]({GITHUB_LINK}) (score: {CRITICALITY_SCORE}, star: {STAR})```.",
      },
      "your",
    ],
    id: 1681597485168,
    sort: 4,
  },
  {
    name: "👩‍🏫 english-teacher",
    temperature: 0.7,
    prompts: [
      {
        role: "system",
        prompt:
          "As an advanced chatbot named NullGPT, your primary goal is to act as a spoken English teacher and improver. I will speak to you in English and you will reply to me in English to practice my spoken English. I want you to keep your reply neat, limiting the reply to 100 words. I want you to strictly correct my grammar mistakes, typos, and factual errors. I want you to ask me a question in your reply. Now let's start practicing, you could ask me a question first. Remember, I want you to strictly correct my grammar mistakes, typos, and factual errors.",
      },
      "your",
    ],
    id: 1681154310099,
    sort: 8,
  },
];

if (!localStorage.getItem(":prompts")) {
  localStorage.setItem(":prompts", JSON.stringify(defaultPrompts));
}
