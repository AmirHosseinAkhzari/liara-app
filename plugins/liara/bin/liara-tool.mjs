#!/usr/bin/env node
// Run any plugin tool from the shell, e.g.
//   node bin/liara-tool.mjs scan_project '{"path":"."}'
//   node bin/liara-tool.mjs deploy '{"app":"my-app","planID":"..."}'
import { TOOLS, callTool } from '../lib/tools.mjs';

const [name, json] = process.argv.slice(2);
if (!name || name === '--help' || name === '-h') {
  console.log('Usage: liara-tool <tool> [json-args]\n\nTools:');
  for (const t of TOOLS) console.log(`  ${t.name.padEnd(18)} ${t.description.split('. ')[0]}`);
  process.exit(0);
}
try {
  const result = await callTool(name, json ? JSON.parse(json) : {});
  if (result && typeof result === 'object' && typeof result.summary === 'string') {
    console.log(result.summary);
    console.log('\n--- full report ---');
  }
  console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
