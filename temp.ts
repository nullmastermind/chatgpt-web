const inputString = 'my improved prompt: "Hello World!"\nmy Prompt: "How are you?"\nprompt: "What is your name?"\nRevised prompt: "Nice to meet you!"';

const outputString = inputString.replace(/^.*prompt:\s*"/im, '"');

console.log(outputString);