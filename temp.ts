const preprocessMessageContent = (content: string) => {
  // content = content.replace(/```(.*?)```/g, "```\n$1\n```");
  const contentArr = content.split("\n").map(v => {
    if (v.startsWith("```") && v.includes(" ")) {
      v = v.replace(/```(.*?)/g, "```\n$1");
    } else if (/[a-zA-Z0-9]/.test(v) && v.endsWith("```")) {
      v = v.replace(/(.*?)```/g, "$1\n```");
    }
    return v;
  });
  return contentArr.join("\n");
};

console.log(/[a-zA-Z0-9]/.test("// ```"));

console.log(
  preprocessMessageContent(
    "```Hello NullGPT, can you help me?\n" + "\n" + '- What is your name, "A" or "C"?\n' + "- Did OpenAI create you?```"
  )
);
