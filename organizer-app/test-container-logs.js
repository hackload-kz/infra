#!/usr/bin/env node
/**
 * Simple test script to verify container log collection functionality
 * This script demonstrates the enhanced logging capabilities for K6 test runs with parallelism
 */

const { getK6TestRunLogs, createK6TestRun } = require('./src/lib/k6');

async function testContainerLogging() {
  console.log('🧪 Testing K6 Container Log Collection');
  console.log('=====================================');
  
  // Test configuration for a simple K6 test with parallelism
  const testConfig = {
    teamId: 'test-team-id',
    teamNickname: 'test-team',
    scenarioId: 'test-scenario-id', 
    scenarioIdentifier: 'test-scenario',
    stepName: 'Basic HTTP Test',
    stepOrder: 1,
    runNumber: Date.now(), // Use timestamp for unique run number
    parallelism: 2, // Test with 2 parallel containers
    k6Script: `
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 5 },
    { duration: '10s', target: 0 },
  ],
};

export default function() {
  console.log('Container ${__ENV.K6_INSTANCE_ID || 'unknown'} - Making request...');
  let response = http.get('https://httpbin.org/get');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  sleep(1);
}
`
  };

  try {
    console.log('🚀 Creating K6 TestRun with parallelism =', testConfig.parallelism);
    
    // Create the K6 test run
    const k6TestName = await createK6TestRun(testConfig);
    console.log('✅ Created K6 TestRun:', k6TestName);
    
    // Wait a bit for the test to start
    console.log('⏳ Waiting 15 seconds for test to start...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Attempt to get logs
    console.log('📋 Attempting to collect container logs...');
    const logs = await getK6TestRunLogs(k6TestName, 100);
    
    if (logs) {
      console.log('✅ Successfully collected logs:');
      console.log('='.repeat(50));
      console.log(logs);
      console.log('='.repeat(50));
      
      // Count how many container headers we found
      const containerHeaders = logs.match(/=== Container: .+ ===/g);
      const containerCount = containerHeaders ? containerHeaders.length : 0;
      console.log(`📊 Found logs from ${containerCount} container(s)`);
      
      if (containerCount >= testConfig.parallelism) {
        console.log('✅ SUCCESS: Found logs from all expected containers!');
      } else {
        console.log('⚠️ WARNING: Expected logs from', testConfig.parallelism, 'containers, but found', containerCount);
      }
    } else {
      console.log('❌ No logs found - test may not have started yet or failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  console.log('\n🏁 Test completed');
}

// Only run if called directly
if (require.main === module) {
  testContainerLogging().catch(console.error);
}

module.exports = { testContainerLogging };