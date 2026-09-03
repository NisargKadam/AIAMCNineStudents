/**
 * The canonical AI AMC curriculum.
 *
 * `prisma/seed.ts` creates it on a fresh database without touching anything an
 * administrator has since edited. `scripts/sync-curriculum.ts` applies it
 * authoritatively when the curriculum itself changes.
 */
export const categories = [
  {
    name: "Workstation",
    description: "A Python setup you can trust before the first session.",
    items: [
      [
        "VS Code installed with the Python and Pylance extensions",
        "Run `code --version`, then confirm both extensions are enabled.",
      ],
      [
        "Python 3.13 installed and on your PATH",
        "Run `python --version`. Expected: Python 3.13.x.",
      ],
      [
        "A project virtual environment created and activated",
        "Run `python -m venv .venv`, activate it, and confirm your prompt changes.",
      ],
      [
        "VS Code interpreter pointed at the project .venv",
        "Use Select Interpreter in VS Code and choose the .venv you created.",
      ],
      [
        "Packages install into the environment, not globally",
        "Install one package, then run `pip list` inside and outside the environment.",
      ],
    ],
  },
  {
    name: "Source control",
    description: "The Git workflow every assignment is submitted through.",
    items: [
      [
        "Git installed and configured with your name and email",
        "Run `git --version`, `git config --global user.name`, and `git config --global user.email`.",
      ],
      [
        "GitHub account ready with a professional username",
        "Sign in to github.com and confirm the username you want on your portfolio.",
      ],
      [
        "A .gitignore in place and .env excluded from commits",
        "Run `git check-ignore .env` and confirm it reports the file.",
      ],
      [
        "Comfortable with the daily loop",
        "Practise pull, branch, edit, commit, push, and open a pull request.",
      ],
    ],
  },
  {
    name: "Python you will use daily",
    description: "The subset of Python the agent work actually leans on.",
    items: [
      [
        "Core data types, f-strings, lists, dictionaries, sets, and tuples",
        "Be able to write and read each without looking them up.",
      ],
      [
        "Control flow, loops, and list comprehensions",
        "Rewrite a simple loop as a comprehension and explain the trade-off.",
      ],
      [
        "Functions, default arguments, *args and **kwargs, and lambdas",
        "Write one function that uses each form.",
      ],
      [
        "Classes, __init__, and inheritance basics",
        "Build a small class with state and one subclass that extends it.",
      ],
      [
        "Error handling, file and JSON I/O, and imports",
        "Read a JSON file, handle a missing-file error, and import from your own module.",
      ],
      [
        "Basic awareness of async and await",
        "Explain when an agent call benefits from running concurrently.",
      ],
    ],
  },
  {
    name: "Configuration and keys",
    description: "Where secrets live, and how the code reaches them.",
    items: [
      [
        "Environment variables loaded with python-dotenv",
        "Load APP_NAME, MODEL_NAME, TEMPERATURE, and DEBUG from a .env file.",
      ],
      [
        "A model API key issued and stored outside source control",
        "Confirm the key works and that the file holding it is git-ignored.",
      ],
    ],
  },
  {
    name: "Ready for day one",
    description: "The last checks before the cohort starts building.",
    items: [
      [
        "verify_setup.py runs end to end",
        "It prints your Python version and working directory, writes formatted JSON, and reads it back.",
      ],
      [
        "Session time confirmed, microphone and camera tested",
        "Check the invite in your calendar and test your audio and video.",
      ],
      [
        "Anthropic's Building effective agents read",
        "Bring one idea from it that you want to try.",
      ],
    ],
  },
] satisfies Array<{
  name: string;
  description: string;
  items: Array<readonly [string, string | null]>;
}>;

export const assignments = [
  [
    "Prompt Skill",
    "Get deliberate about prompting: system messages, structure, few-shot examples, and measuring whether a change actually helped.",
  ],
  [
    "LangChain",
    "Build your first chain: models, prompts, output parsers, and tools wired together into something you can run and debug.",
  ],
  [
    "LangGraph",
    "Model an agent as a graph with explicit state and edges, so its control flow is inspectable instead of implicit.",
  ],
  [
    "RAG",
    "Chunk, embed, retrieve, and ground answers in your own documents rather than the model's recollection.",
  ],
  [
    "Advanced RAG",
    "Push retrieval quality: hybrid search, reranking, query rewriting, and honest evaluation of what each one bought you.",
  ],
  [
    "Guardrails",
    "Constrain what the agent accepts and emits: schema validation, refusals, safety checks, and failure paths that degrade well.",
  ],
  [
    "MCP",
    "Expose and consume tools over the Model Context Protocol so capabilities are portable across clients.",
  ],
  [
    "MultiAgent",
    "Split a task across specialised agents and pass structured work between them without losing the thread.",
  ],
  [
    "Memory Management",
    "Decide what an agent keeps, summarises, and forgets across turns and sessions, and where that state lives.",
  ],
  [
    "Deployment",
    "Ship the agent behind an API with configuration, logging, timeouts, retries, and a health check.",
  ],
] satisfies Array<readonly [string, string]>;
