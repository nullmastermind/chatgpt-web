function fixCodeBlockError(markdown: string): string {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = markdown.match(codeBlockRegex);

  if (codeBlocks) {
    for (const codeBlock of codeBlocks) {
      if (!/\n$/.test(codeBlock)) {
        const fixedCodeBlock = codeBlock + "\n";
        markdown = markdown.replace(codeBlock, fixedCodeBlock);
      }
    }
  }

  return markdown;
}

console.log(
  fixCodeBlockError(
    "```Hello NullGPT, can you help me?\n" + "\n" + '- What is your name, "A" or "C"?\n' + "- Did OpenAI create you?```"
  )
);
