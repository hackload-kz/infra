#!/usr/bin/env node

/**
 * Generate documentation metadata during build
 * Captures Git commit dates for each documentation file
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DOCS_DIR = path.join(process.cwd(), 'public', 'docs');
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'docs-metadata.json');

/**
 * Get Git commit date for a specific file
 */
function getFileCommitDate(filePath) {
  try {
    // Get relative path from project root
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Get last commit date in ISO format
    const command = `git log --format="%ad" --date=iso -1 -- "${relativePath}"`;
    const output = execSync(command, { encoding: 'utf8' }).trim();
    
    if (output) {
      return new Date(output).toISOString();
    }
    return null;
  } catch (error) {
    console.warn(`Warning: Could not get Git commit date for ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Get file modification date
 */
function getFileModificationDate(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.toISOString();
  } catch (error) {
    console.warn(`Warning: Could not get modification date for ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Generate metadata for all documentation files
 */
function generateDocsMetadata() {
  console.log('🔍 Generating documentation metadata...');
  
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Error: Documentation directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }
  
  const metadata = {};
  
  // Get all markdown and JSON files
  const files = fs.readdirSync(DOCS_DIR).filter(file => 
    file.endsWith('.md') || file.endsWith('.json')
  );
  
  console.log(`📁 Processing ${files.length} documentation files...`);
  
  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    const commitDate = getFileCommitDate(filePath);
    const lastModified = getFileModificationDate(filePath);
    
    metadata[file] = {
      commitDate,
      lastModified,
      generatedAt: new Date().toISOString()
    };
    
    console.log(`✅ ${file}: commit=${commitDate ? new Date(commitDate).toISOString().slice(0, 19) : 'none'}, modified=${lastModified ? new Date(lastModified).toISOString().slice(0, 19) : 'none'}`);
  }
  
  // Write metadata to file
  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metadata, null, 2));
    console.log(`✅ Documentation metadata saved to: ${OUTPUT_FILE}`);
    console.log(`📊 Processed ${Object.keys(metadata).length} files`);
  } catch (error) {
    console.error('Error writing metadata file:', error);
    process.exit(1);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('📚 Documentation Metadata Generator');
  console.log('=====================================');
  
  // Check if we're in a Git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch (error) {
    console.error('Error: Not in a Git repository');
    process.exit(1);
  }
  
  generateDocsMetadata();
  console.log('🎉 Done!');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateDocsMetadata };