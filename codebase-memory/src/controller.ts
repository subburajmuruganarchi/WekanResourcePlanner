import { MemoryStore } from './store';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

// The Controller acts as the orchestrator.
// It uses a cheap LLM call simply to map the user's intent to deterministic API calls,
// preventing the LLM from trying to read files natively.

export class Controller {
  private store: MemoryStore;
  private openai: OpenAI;

  constructor(store: MemoryStore) {
    this.store = store;
    this.openai = new OpenAI({ apiKey: process.env.OPENAPI_KEY || 'dummy' });
  }

  // 1. Intercept User Query & Classify Intent
  async executeQuery(userQuery: string): Promise<string> {
    console.log(`\n[Controller] Intercepted Query: "${userQuery}"`);
    
    // We use a deterministic / structured output approach to force the LLM 
    // to pick exactly ONE query type and extract the argument.
    const intentPrompt = `
You are a routing agent for a Codebase Memory System. 
Map the user query to ONE of these deterministic functions:
1. find_function (arg: function_name)
2. trace_call_path (arg: function_name)
3. find_dependencies (arg: target_file_or_class)
4. search_keyword (arg: keyword)
5. impact_analysis (arg: function_name)

Respond ONLY with JSON: {"tool": "function_name", "arg": "argument"}

User Query: ${userQuery}
`;

    let tool = 'search_keyword';
    let arg = userQuery;

    try {
       // Using an LLM to route intent (very fast, cheap tokens)
       // We'd use gpt-3.5-turbo or gemini-flash
       const routingResp = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: intentPrompt }],
          response_format: { type: "json_object" }
       });

       const parsed = JSON.parse(routingResp.choices[0].message.content || '{}');
       tool = parsed.tool || tool;
       arg = parsed.arg || arg;
    } catch (err) {
       console.log("[Controller] Intent routing failed, falling back to keyword search.", err);
    }

    console.log(`[Controller] Intent Decided -> ${tool}("${arg}")`);

    // 2. Automatically call Query Engine BEFORE hitting the main LLM context
    let rawContext: any = [];
    switch (tool) {
      case 'find_function':
        rawContext = await this.store.findFunction(arg);
        break;
      case 'trace_call_path':
        rawContext = await this.store.traceCallPath(arg);
        break;
      case 'find_dependencies':
        rawContext = await this.store.findDependencies(arg);
        break;
      case 'impact_analysis':
        rawContext = await this.store.impactAnalysis(arg);
        break;
      case 'search_keyword':
      default:
        rawContext = await this.store.searchKeyword(arg);
        break;
    }

    // Short-circuit if nothing found
    if (!rawContext || rawContext.length === 0) {
       return `[System] No results found in memory for ${tool}('${arg}').`;
    }

    console.log(`[Controller] Query Engine returned ${rawContext.length} structured results.`);

    // 3. Pass structured context to LLM for final answer formatting
    const finalPrompt = `
Answer the user's query using ONLY the provided specialized memory context. 
Do not assume existence of code outside this context.

User Query: ${userQuery}

Codebase Memory Context (JSON):
${JSON.stringify(rawContext, null, 2)}
`;

    console.log(`[Controller] Generating final response using retrieved memory context...`);
    try {
        const finalResp = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: finalPrompt }]
        });
        return finalResp.choices[0].message.content || 'No response generated.';
    } catch (err: any) {
        return `[System Error] LLM Formatting failed. Raw data: \n${JSON.stringify(rawContext, null, 2)}`;
    }
  }
}
