## Features

- Prompt template: https://jmp.sh/FXPzg65U
  - Custom system messages.
    - system messages can be used to instruct the model how to behave in a conversation, such as adopting a specific tone or following particular guidelines
    - Other types such as "user" and "assistant" are used for quick training of AI with some chat history
  - Custom Temperature: 
	- Temperature is a parameter that influences the creativity and randomness of the output. It is used when decoding the model's output probability distribution to sample the next token. GPT Temperature parameter ranges from 0 to 1
- Chat history: https://jmp.sh/3y5LYNN2
- Quick message template: https://jmp.sh/mvFixL88
- Custom OpenAI models: https://jmp.sh/KszlsWk3
- Prompt improvement shortcut: https://jmp.sh/sSh2nMCP
- Query private documents:
  - https://jmp.sh/nNkaAVbF
  - https://jmp.sh/YLRpWRXb


## Chat flow

```mermaid
flowchart TD
    A[User inputs text] --> B{Is it a reply?}
    B -- Yes --> C[Add previous message to post body]
    B -- No --> D[Add user text input to post body]
    C --> D
    D --> E{Query private documents enabled?}
    E -- Yes --> F[Send user input to indexer engine]
    E -- No --> G[Add system instructions to post body]
    F --> H[Indexer engine responds with related documents]
    H --> I[Add related private document to post body]
    I --> G
    G --> J[Send post body to OpenAI]
    J --> K[OpenAI responds with an answer]
    K --> L[Render answer]
```

```mermaid
sequenceDiagram
    participant User as User
    participant System as System
    participant Indexer as Indexer Engine
    participant OpenAI as OpenAI

    User->>System: Inputs text
    alt Is it a reply?
        System->>System: Add previous message to post body
    else
        System->>System: Add user text input to post body
    end
    System->>System: Query private documents enabled?
    alt Yes
        System->>Indexer: Send user input
        Indexer->>System: Responds with related documents
        System->>System: Add related private document to post body
    else
        System->>System: Add system instructions to post body
    end
    System->>OpenAI: Send post body
    OpenAI->>System: Responds with an answer
    System->>User: Render answer
```

## Private document index flow

- User config document name, path to document folder, document file extensions
- Indexer read all files with config document extensions in document folder
- Indexer ignore all file in .gitignore
- Indexer's preprocessing file content (analysis, summarization of code, etc.), and then Splitter splits the document into multiple paths depending on the document type (e.g., code uses CodeSplitter, markdown, txt uses TextSplitter).
- The Indexer sends split paths to the embedding system to vectorize text
- Store vectorized text in the Vector database
- Create a Query Engine per document
- When a user queries a private document
  - Query Engine vectorize user input
  - Query Engine find  vectorized user input from vector database
  - Query Engine scoring result
  - Query Engine responds with the best result by score

```mermaid
flowchart TD
    A[User Config Document] -->|Document Name, Path, Extensions| B[Indexer]
    B -->|Read Files| C[Check .gitignore]
    C -->|Ignore Files| D[Preprocess File Content]
    D -->|Split Document| E{Document Type}
    E -->|Code| F[CodeSplitter]
    E -->|Markdown, txt| G[TextSplitter]
    F --> H[Embedding System]
    G --> H[Embedding System]
    H --> I[Vector Database]
    I --> J[Create Query Engine]
    J --> K[User Query]
    K --> L[Vectorize User Input]
    L --> M[Find Vectorized Input in DB]
    M --> N[Score Results]
    N --> O[Respond with Best Result]
```