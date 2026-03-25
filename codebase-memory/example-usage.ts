import { MemoryStore } from './src/store';
import { Controller } from './src/controller';

/**
 * Example: How to use the Codebase Memory System efficiently in your own code
 * 
 * Pre-requisite:
 * 1. You must have indexed your codebase first (the DB must exist)
 * 2. Set your OPENAI_API_KEY in the .env file
 */
async function runExample() {
  // 1. Point to your generated SQLite memory database
  const store = new MemoryStore('./local_memory.sqlite');
  
  // 2. Initialize the Controller (this handles intent routing automatically)
  const controller = new Controller(store);

  // 3. Ask high-level questions without passing raw files!
  // The system will:
  //   a) Parse intent cheaply ("find_dependencies")
  //   b) Query SQLite locally (0 tokens)
  //   c) Pass ONLY the JSON response to the LLM to format
  
  const question = "What functions are called by the login function?";
  console.log(`\nUser: ${question}`);
  
  const answer = await controller.executeQuery(question);
  console.log(`\nSystem:\n${answer}\n`);
}

runExample().catch(console.error);
