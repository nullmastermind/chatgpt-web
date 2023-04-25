const inputString = 'my improved prompt:\n"Hello World!"\nmy Prompt: "How are you?"\nprompt: "What is your name?"\nRevised prompt: "Nice to meet you!"';

console.log(inputString.replace(/^([a-zA-Z\s]+)prompt:\s*"/im, '"'))