#!/usr/bin/env node
/**
 * Test script to manually collect logs from the specific K6 test run
 */

const { getK6TestRunLogs } = require('./src/lib/k6');

async function testLogCollection() {
  console.log('🧪 Testing K6 Log Collection');
  console.log('=============================');
  
  const testRunName = 'drim-dev-nginx-nginx-1';
  
  console.log(`Testing log collection for: ${testRunName}`);
  console.log('Expected pod name: drim-dev-nginx-nginx-1-1-f22nm');
  console.log('');
  
  try {
    console.log('⏳ Collecting logs...');
    const logs = await getK6TestRunLogs(testRunName, 1000);
    
    if (logs) {
      console.log('✅ Successfully collected logs!');
      console.log(`📊 Total log size: ${logs.length} characters`);
      console.log('');
      console.log('='.repeat(60));
      console.log('COLLECTED LOGS:');
      console.log('='.repeat(60));
      console.log(logs);
      console.log('='.repeat(60));
      console.log('');
      
      // Count container headers
      const containerHeaders = logs.match(/=== Container: .+ ===/g);
      const containerCount = containerHeaders ? containerHeaders.length : 0;
      console.log(`📦 Found logs from ${containerCount} container(s)`);
      
      if (containerHeaders) {
        console.log('Container names:');
        containerHeaders.forEach((header, i) => {
          console.log(`  ${i + 1}. ${header.replace(/=== Container: (.+) ===/, '$1')}`);
        });
      }
      
    } else {
      console.log('❌ No logs collected');
      console.log('');
      console.log('Possible reasons:');
      console.log('- Pod not found with any of the search strategies');
      console.log('- Pod exists but has no logs');
      console.log('- Kubernetes API access issues');
      console.log('- Pod name mismatch');
    }
    
  } catch (error) {
    console.error('❌ Error during log collection:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  console.log('\\n🏁 Log collection test completed');
}

// Only run if called directly
if (require.main === module) {
  testLogCollection().catch(console.error);
}

module.exports = { testLogCollection };