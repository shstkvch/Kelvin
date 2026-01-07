import * as fs from 'fs';
import * as path from 'path';
import { Parser } from '../parser/parser';
import { SemanticAnalyzer } from '../analyzer/semantic-analyzer';

export async function check(filePath: string): Promise<void> {
  const absolutePath = path.resolve(filePath);

  // Check file exists
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  // Read and parse
  console.log(`Checking ${path.basename(filePath)}...`);
  const source = fs.readFileSync(absolutePath, 'utf-8');

  let ast;
  try {
    const parser = new Parser(source);
    ast = parser.parse();
  } catch (err) {
    console.error('');
    console.error('Parse error:', (err as Error).message);
    process.exit(1);
  }

  // Run semantic analysis
  const analyzer = new SemanticAnalyzer();
  const result = analyzer.analyze(ast);

  console.log('');
  console.log(`App: ${ast.name}`);
  console.log('');

  console.log('Entities:');
  for (const entity of ast.entities) {
    const fieldCount = entity.fields.length;
    console.log(`  - ${entity.name} (${fieldCount} fields)`);
  }
  console.log('');

  console.log('Views:');
  for (const view of ast.views) {
    const visibility = view.visibility === 'public' ? 'public' : 'authenticated';
    const blockCount = view.blocks.length;
    console.log(`  - ${view.name} (${visibility}, ${blockCount} blocks)`);
  }
  console.log('');

  // Report warnings
  if (result.warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of result.warnings) {
      console.log(`  [${warning.code}] ${warning.message}`);
    }
    console.log('');
  }

  // Report errors
  if (result.errors.length > 0) {
    console.log('Errors:');
    for (const error of result.errors) {
      console.log(`  [${error.code}] ${error.message}`);
    }
    console.log('');
    console.error(`Found ${result.errors.length} error(s).`);
    process.exit(1);
  }

  console.log('No errors found.');
}
