import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const categories = [
  {
    name: "Development Environment",
    description:
      "Prepare a reliable Python and VS Code development workstation.",
    items: [
      [
        "VS Code installed and opens successfully",
        "Run `code --version` and confirm the command succeeds.",
      ],
      [
        "Python 3.13.12 installed",
        "Run `python --version`. Expected: Python 3.13.12.",
      ],
      ["pip working", "Run `pip --version`."],
      [
        "Python virtual environment successfully created",
        "Create one with `python -m venv .venv`.",
      ],
      [
        "Virtual environment successfully activated",
        "Confirm your terminal prompt shows the active environment.",
      ],
      [
        "Test package installed inside the virtual environment",
        "Install a small package and verify it is isolated to the environment.",
      ],
      [
        "Pylance extension installed in VS Code",
        "Open Extensions and confirm Pylance is enabled.",
      ],
      [
        "Python interpreter points to the project virtual environment",
        "Use Select Interpreter in VS Code and choose `.venv`.",
      ],
      [
        "GitHub account created and accessible",
        "Sign in to github.com successfully.",
      ],
      [
        "Professional GitHub username selected",
        "Choose a username suitable for a professional portfolio.",
      ],
    ],
  },
  {
    name: "Git & GitHub",
    description: "Build a safe, repeatable source-control workflow.",
    items: [
      ["Git installed", "Run `git --version`."],
      ["Git username configured", "Run `git config --global user.name`."],
      ["Git email configured", "Run `git config --global user.email`."],
      [
        "Default Git branch configured as main",
        "Run `git config --global init.defaultBranch main`.",
      ],
      [
        "Understand working directory, staging area, and repository",
        "Be able to explain how a change moves through these three states.",
      ],
      [
        "Can use core Git commands",
        "Practice git status, add, commit, log, diff, push, pull, branch, switch, merge, stash, and fetch.",
      ],
      [
        "Created a .gitignore",
        "Confirm generated and secret files are excluded.",
      ],
      [".env is excluded from Git", "Run `git check-ignore .env`."],
      [
        "Understand the collaboration workflow",
        "Practice: pull → branch → code → test → add → commit → push → pull request.",
      ],
    ],
  },
  {
    name: "Python Foundations",
    description: "Refresh the Python concepts used throughout the masterclass.",
    items: [
      "Variables and common Python data types",
      "Strings and f-strings",
      "Multiline strings",
      "Lists",
      "Dictionaries",
      "Tuples",
      "Sets",
      "if / elif / else",
      "for loops",
      "while loops",
      "List comprehensions",
      "Functions",
      "Default arguments",
      "*args and **kwargs",
      "Lambda functions",
      "Basic classes and OOP",
      "Constructors using __init__",
      "Inheritance basics",
      "try / except error handling",
      "File I/O",
      "JSON reading and writing",
      "Python modules and imports",
      "pip package management",
      "Environment variables",
      ".env loading using python-dotenv",
      "Basic awareness of async / await",
    ].map((title) => [title, null]),
  },
  {
    name: "Project Structure",
    description:
      "Understand a production-friendly Python agent project layout.",
    items: [
      "Understand the purpose of src/",
      "Understand the purpose of agents/",
      "Understand the purpose of tools/",
      "Understand the purpose of utils/",
      "Understand the purpose of tests/",
      "Understand __init__.py",
      "Understand requirements.txt",
      "Understand .env",
      "Understand .gitignore",
      "Understand README.md",
      "Understand main.py",
    ].map((title) => [
      title,
      "Locate this file or directory in the reference project and explain its responsibility.",
    ]),
  },
  {
    name: "Practice Exercises",
    description: "Prove the foundations through small, focused builds.",
    items: [
      [
        "Setup verification script completed",
        "Create verify_setup.py that prints the Python version/current directory, serializes a dictionary as formatted JSON, writes it, and reads it back.",
      ],
      [
        "Text processing exercise completed",
        "Create `chunk_text(text, chunk_size=100)`.",
      ],
      [
        "SimpleAgent class exercise completed",
        "Implement `__init__`, `chat()`, `get_history()`, and `reset()`.",
      ],
      [
        "Configuration loader exercise completed",
        "Use python-dotenv with APP_NAME, MODEL_NAME, TEMPERATURE, and DEBUG. Ensure `.env` is ignored.",
      ],
    ],
  },
  {
    name: "Final Day-1 Readiness",
    description: "Complete the final technical and session readiness checks.",
    items: [
      ["Python 3.13.12 verified", "Run `python --version`."],
      ["Git verified", "Run `git --version`."],
      ["VS Code verified", "Run `code --version`."],
      ["GitHub account ready", "Sign in and confirm repository access."],
      [
        "Course calendar and session confirmed",
        "Confirm the session time in your calendar.",
      ],
      ["Microphone tested", "Test input quality before the session."],
      ["Camera tested", "Test camera permissions and framing."],
      [
        "State of GPT by Andrej Karpathy watched or skimmed",
        "Capture one insight to discuss.",
      ],
      [
        "Anthropic Building effective agents article skimmed",
        "Capture one insight to discuss.",
      ],
      [
        "OpenAI tokenizer playground explored",
        "Try tokenizing a short system prompt.",
      ],
    ],
  },
] satisfies Array<{
  name: string;
  description: string;
  items: Array<readonly [string, string | null]>;
}>;

const assignments = [
  [
    "Set up your agent workspace",
    "Stand up the project layout, virtual environment, and configuration loader you will use for the rest of the masterclass.",
  ],
  [
    "Call a model directly",
    "Talk to a model from Python without a framework: messages, system prompts, temperature, and token accounting.",
  ],
  [
    "Build a single-tool agent",
    "Give a model one tool, handle the tool-call loop yourself, and return a grounded answer.",
  ],
  [
    "Add memory and conversation state",
    "Keep a conversation across turns, summarise it when it grows, and persist it between runs.",
  ],
  [
    "Design a tool suite",
    "Write three tools with clear schemas and error handling, then let the agent choose between them.",
  ],
  [
    "Retrieval over your own documents",
    "Chunk, embed, and retrieve source material so the agent answers from your data instead of guessing.",
  ],
  [
    "Multi-agent handoffs",
    "Split a task across specialised agents and pass structured work between them.",
  ],
  [
    "Evaluate and guard your agent",
    "Add an evaluation set, measure failures honestly, and put guardrails on the risky paths.",
  ],
  [
    "Ship it behind an API",
    "Wrap the agent in a service with logging, timeouts, retries, and a health check.",
  ],
  [
    "Capstone: an agent that earns its keep",
    "Pick a real workflow, build the agent end to end, and defend the design decisions in your README.",
  ],
] satisfies Array<readonly [string, string]>;

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword)
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD are required to seed safely.",
    );
  if (adminPassword.length < 12)
    throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: Role.ADMIN, isActive: true },
    create: {
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
      profile: { create: { fullName: "AI AMC Administrator" } },
    },
  });

  await prisma.prerequisiteConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, version: 1 },
  });
  for (const [categoryIndex, category] of categories.entries()) {
    const savedCategory = await prisma.prerequisiteCategory.upsert({
      where: { sortOrder: categoryIndex + 1 },
      update: {
        name: category.name,
        description: category.description,
        isActive: true,
      },
      create: {
        name: category.name,
        description: category.description,
        sortOrder: categoryIndex + 1,
      },
    });
    for (const [itemIndex, [title, verification]] of category.items.entries()) {
      await prisma.prerequisite.upsert({
        where: {
          categoryId_sortOrder: {
            categoryId: savedCategory.id,
            sortOrder: itemIndex + 1,
          },
        },
        update: { title, verification, isActive: true },
        create: {
          categoryId: savedCategory.id,
          title,
          verification,
          sortOrder: itemIndex + 1,
        },
      });
    }
  }

  for (const [index, [title, description]] of assignments.entries()) {
    const sortOrder = index + 1;
    const existing = await prisma.assignment.findUnique({
      where: { sortOrder },
    });
    // Only rewrite the placeholder titles from earlier seeds; anything an
    // administrator has renamed is left exactly as they set it.
    const isPlaceholder = existing?.title === `Assignment ${sortOrder}`;
    await prisma.assignment.upsert({
      where: { sortOrder },
      update: isPlaceholder ? { title, description } : {},
      create: { title, description, sortOrder },
    });
  }

  if (process.env.SEED_DEMO_DATA === "true") {
    const studentPassword = process.env.DEFAULT_STUDENT_PASSWORD;
    if (!studentPassword)
      throw new Error("DEFAULT_STUDENT_PASSWORD is required for demo data.");
    const demoHash = await bcrypt.hash(studentPassword, 12);
    await prisma.user.upsert({
      where: { email: "student@aiamc.dev" },
      update: {},
      create: {
        email: "student@aiamc.dev",
        passwordHash: demoHash,
        profile: {
          create: {
            fullName: "Demo Student",
            githubUsername: "octocat",
            currentRole: "AI Engineer",
          },
        },
      },
    });
  }
  console.log(
    `Seed complete: 1 admin, ${categories.length} prerequisite categories, 10 assignments.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
