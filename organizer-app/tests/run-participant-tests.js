#!/usr/bin/env node

/**
 * Participant Workflow Test Runner
 * 
 * This script runs the comprehensive test suite for the participant workflow,
 * covering all scenarios from the PARTICIPANT_TEST_SCENARIOS.md document.
 */

const { execSync } = require('child_process');
const path = require('path');

// ANSI color codes for output formatting
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  const separator = '='.repeat(60);
  log(`\n${separator}`, 'cyan');
  log(`${colors.bold}${title}${colors.reset}`, 'cyan');
  log(separator, 'cyan');
}

function logSubsection(title) {
  log(`\n${colors.bold}${title}${colors.reset}`, 'blue');
  log('-'.repeat(40), 'blue');
}

function runCommand(command, description) {
  try {
    log(`\n▶ ${description}`, 'yellow');
    const output = execSync(command, { 
      stdio: 'pipe',
      encoding: 'utf8',
      cwd: process.cwd()
    });
    log('✅ Success', 'green');
    return { success: true, output };
  } catch (error) {
    log(`❌ Failed: ${error.message}`, 'red');
    if (error.stdout) {
      log('STDOUT:', 'yellow');
      log(error.stdout, 'white');
    }
    if (error.stderr) {
      log('STDERR:', 'red');
      log(error.stderr, 'white');
    }
    return { success: false, error };
  }
}

function main() {
  logSection('🧪 PARTICIPANT WORKFLOW TEST SUITE');
  
  log('This test suite covers all scenarios from PARTICIPANT_TEST_SCENARIOS.md:', 'white');
  log('• Authentication Workflow (7 scenarios)', 'white');
  log('• Participant Registration (15 scenarios)', 'white');
  log('• Profile Management (11 scenarios)', 'white');
  log('• Public Profile Access (10 scenarios)', 'white');
  log('• Internal Participant Data (9 scenarios)', 'white');
  log('• Security & Edge Cases (15+ scenarios)', 'white');
  log('• Total: 67+ automated test scenarios', 'bold');

  const testSuites = [
    {
      name: 'Authentication Workflow',
      file: 'tests/participant-workflow/auth.test.ts',
      scenarios: 7,
      description: 'OAuth authentication, role assignment, middleware'
    },
    {
      name: 'Participant Registration',
      file: 'tests/participant-workflow/registration.test.ts',
      scenarios: 15,
      description: 'Profile creation, team joining, validation, edge cases'
    },
    {
      name: 'Profile Management',
      file: 'tests/participant-workflow/profile-management.test.ts',
      scenarios: 11,
      description: 'Profile updates, field clearing, concurrent operations'
    },
    {
      name: 'Public Profile Access',
      file: 'tests/participant-workflow/public-profile-access.test.ts',
      scenarios: 10,
      description: 'Admin access, filtering, authorization, privacy'
    },
    {
      name: 'Internal Participant Data',
      file: 'tests/participant-workflow/internal-participant-data.test.ts',
      scenarios: 9,
      description: 'Admin participant management, team assignment'
    },
    {
      name: 'Security & Edge Cases',
      file: 'tests/participant-workflow/security-edge-cases.test.ts',
      scenarios: 15,
      description: 'SQL injection, XSS, rate limiting, data integrity'
    }
  ];

  // Pre-flight checks
  logSection('🔍 PRE-FLIGHT CHECKS');
  
  const checks = [
    {
      command: 'npm ls jest',
      description: 'Checking Jest installation'
    },
    {
      command: 'npx tsc --noEmit',
      description: 'TypeScript compilation check'
    }
  ];

  let allChecksPass = true;
  for (const check of checks) {
    const result = runCommand(check.command, check.description);
    if (!result.success) {
      allChecksPass = false;
    }
  }

  if (!allChecksPass) {
    log('\n❌ Pre-flight checks failed. Please fix the issues above before running tests.', 'red');
    process.exit(1);
  }

  // Run individual test suites
  logSection('🚀 RUNNING TEST SUITES');

  const results = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const suite of testSuites) {
    logSubsection(`${suite.name} (${suite.scenarios} scenarios)`);
    log(suite.description, 'white');
    
    const result = runCommand(
      `npx jest ${suite.file} --verbose`,
      `Running ${suite.name} tests`
    );
    
    results.push({
      ...suite,
      ...result
    });

    if (result.success) {
      // Parse test results from Jest output
      const testMatches = result.output.match(/(\d+) passing/);
      const suitePassed = testMatches ? parseInt(testMatches[1]) : suite.scenarios;
      passedTests += suitePassed;
      totalTests += suite.scenarios;
    } else {
      failedTests += suite.scenarios;
      totalTests += suite.scenarios;
    }
  }

  // Run all tests together
  logSection('🎯 COMPREHENSIVE TEST RUN');
  
  const comprehensiveResult = runCommand(
    'npx jest tests/participant-workflow/ --coverage --verbose',
    'Running all participant workflow tests with coverage'
  );

  // Integration tests
  logSection('🔗 INTEGRATION TESTS');
  
  const integrationResult = runCommand(
    'npx jest tests/api/ --testNamePattern="(participant|auth|profile)" --coverage',
    'Running existing API integration tests'
  );

  // Generate final report
  logSection('📊 TEST RESULTS SUMMARY');

  log(`\nIndividual Test Suites:`, 'bold');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${status} ${result.name}: ${result.scenarios} scenarios`, color);
  });

  log(`\nOverall Statistics:`, 'bold');
  log(`• Total Test Scenarios: ${totalTests}`, 'white');
  log(`• Passed: ${passedTests}`, 'green');
  log(`• Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`• Success Rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`, 
      passedTests === totalTests ? 'green' : 'yellow');

  const allTestsPassed = results.every(r => r.success) && 
                        comprehensiveResult.success && 
                        integrationResult.success;

  if (allTestsPassed) {
    log('\n🎉 ALL TESTS PASSED! The participant workflow is thoroughly tested.', 'green');
    log('\nCoverage includes:', 'white');
    log('✅ Authentication & Authorization', 'green');
    log('✅ Profile Creation & Management', 'green');
    log('✅ Data Validation & Sanitization', 'green');
    log('✅ Security (SQL Injection, XSS, CSRF)', 'green');
    log('✅ Error Handling & Edge Cases', 'green');
    log('✅ Performance & Concurrency', 'green');
    log('✅ Database Integrity', 'green');
  } else {
    log('\n💥 SOME TESTS FAILED!', 'red');
    log('Please review the failures above and fix the issues.', 'yellow');
    
    const failedSuites = results.filter(r => !r.success);
    if (failedSuites.length > 0) {
      log('\nFailed test suites:', 'red');
      failedSuites.forEach(suite => {
        log(`• ${suite.name}`, 'red');
      });
    }
  }

  // Final recommendations
  logSection('🔧 RECOMMENDATIONS');
  
  if (allTestsPassed) {
    log('• Consider adding performance benchmarks', 'blue');
    log('• Set up continuous integration to run these tests', 'blue');
    log('• Add monitoring for the test scenarios in production', 'blue');
    log('• Update test data fixtures regularly', 'blue');
  } else {
    log('• Fix failing tests before deploying to production', 'red');
    log('• Review error messages and stack traces above', 'yellow');
    log('• Check mock configurations and test data', 'yellow');
    log('• Verify environment setup and dependencies', 'yellow');
  }

  log('\n📚 Test Documentation:', 'white');
  log('• Test scenarios: PARTICIPANT_TEST_SCENARIOS.md', 'white');
  log('• Test helpers: tests/utils/test-helpers.ts', 'white');
  log('• Individual test files: tests/participant-workflow/', 'white');

  process.exit(allTestsPassed ? 0 : 1);
}

// Run the test suite
if (require.main === module) {
  main();
}

module.exports = { main };