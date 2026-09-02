#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const srcDir = join(process.cwd(), 'src');
const allowedFile = join(srcDir, 'services', 'openai', 'config.ts');

const violations = [];

function scanDir(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      if (fullPath === allowedFile) continue;
      const content = readFileSync(fullPath, 'utf8');
      if (/from\s+['"]openai['"]/.test(content) || /require\(['"]openai['"]\)/.test(content)) {
        violations.push(`${relative(process.cwd(), fullPath)}: imports the openai package directly`);
      }
      if (/fetch\s*\(\s*['"]https?:\/\/[^'"]*openai\.com/.test(content)) {
        violations.push(`${relative(process.cwd(), fullPath)}: fetch call to an OpenAI hostname`);
      }
      if (/fetch\s*\(\s*['"]https?:\/\/[^'"]*openai\.azure\.com/.test(content)) {
        violations.push(`${relative(process.cwd(), fullPath)}: fetch call to an Azure OpenAI hostname`);
      }
    }
  }
}

scanDir(srcDir);

if (violations.length > 0) {
  console.error('\ncheck-ai-imports: Direct AI imports or fetch calls detected outside config.ts:\n');
  for (const v of violations) {
    console.error(`  ${v}`);
  }
  console.error('\nAll AI calls must route through src/services/openai/config.ts.');
  process.exit(1);
}

console.log('check-ai-imports: OK — no direct openai imports or AI fetch calls outside config.ts.');
