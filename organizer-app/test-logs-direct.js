#!/usr/bin/env node
/**
 * Direct test of K6 log collection using Kubernetes client
 */

const k8s = require('@kubernetes/client-node');

async function testLogCollectionDirect() {
  console.log('🧪 Direct K6 Log Collection Test');
  console.log('=================================');
  
  const kc = new k8s.KubeConfig();
  
  // Load config from service account when running in cluster
  if (process.env.KUBERNETES_SERVICE_HOST) {
    kc.loadFromCluster();
  } else {
    // For local development, load from kubeconfig
    kc.loadFromDefault();
  }
  
  const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);
  const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
  
  const testRunName = 'drim-dev-nginx-nginx-1';
  console.log(`Testing log collection for: ${testRunName}`);
  console.log('');
  
  try {
    // Test 1: Check TestRun status
    console.log('📋 Step 1: Checking TestRun status...');
    try {
      const testRunResponse = await customObjectsApi.getNamespacedCustomObject({
        group: 'k6.io',
        version: 'v1alpha1',
        namespace: 'k6-runs',
        plural: 'testruns',
        name: testRunName
      });
      
      const testRun = testRunResponse.body || testRunResponse;
      const status = testRun?.status;
      const stage = status?.stage;
      const jobName = status?.jobName;
      
      console.log(`✅ TestRun found - Stage: ${stage}, JobName: ${jobName || 'null'}`);
      
      if (jobName) {
        console.log(`📋 Step 2a: Looking for pods with job-name=${jobName}`);
        try {
          const podsResponse = await coreV1Api.listNamespacedPod({
            namespace: 'k6-runs',
            labelSelector: `job-name=${jobName}`
          });
          
          console.log(`Found ${podsResponse.body.items.length} pods with job-name label`);
          podsResponse.body.items.forEach(pod => {
            console.log(`  - ${pod.metadata?.name} (${pod.status?.phase})`);
          });
        } catch (error) {
          console.warn(`❌ Failed to find pods with job-name: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.warn(`❌ Failed to get TestRun status: ${error.message}`);
    }
    
    // Test 2: Look for pods with k6_cr label
    console.log(`\\n📋 Step 2b: Looking for pods with k6_cr=${testRunName}`);
    try {
      const podsResponse = await coreV1Api.listNamespacedPod({
        namespace: 'k6-runs',
        labelSelector: `k6_cr=${testRunName}`
      });
      
      console.log(`Found ${podsResponse.body.items.length} pods with k6_cr label`);
      podsResponse.body.items.forEach(pod => {
        console.log(`  - ${pod.metadata?.name} (${pod.status?.phase})`);
      });
      
      if (podsResponse.body.items.length > 0) {
        // Try to get logs from the first pod
        const firstPod = podsResponse.body.items[0];
        const podName = firstPod.metadata?.name;
        
        if (podName) {
          console.log(`\\n📋 Step 3: Getting logs from pod: ${podName}`);
          try {
            const logsResponse = await coreV1Api.readNamespacedPodLog({
              name: podName,
              namespace: 'k6-runs',
              tailLines: 20,
              timestamps: true
            });
            
            console.log(`✅ Successfully got logs (${logsResponse.body.length} characters)`);
            console.log('First few lines of logs:');
            console.log('---');
            const lines = logsResponse.body.split('\\n').slice(0, 10);
            lines.forEach(line => console.log(`  ${line}`));
            if (logsResponse.body.split('\\n').length > 10) {
              console.log('  ... (truncated)');
            }
            console.log('---');
            
          } catch (logError) {
            console.error(`❌ Failed to get pod logs: ${logError.message}`);
          }
        }
      }
      
    } catch (error) {
      console.warn(`❌ Failed to find pods with k6_cr label: ${error.message}`);
    }
    
    // Test 3: Broad search for pods containing the test name
    console.log(`\\n📋 Step 2c: Broad search for pods containing: ${testRunName}`);
    try {
      const allPodsResponse = await coreV1Api.listNamespacedPod({
        namespace: 'k6-runs'
      });
      
      const matchingPods = allPodsResponse.body.items.filter(pod => 
        pod.metadata?.name?.includes(testRunName)
      );
      
      console.log(`Found ${matchingPods.length} pods with names containing "${testRunName}"`);
      matchingPods.forEach(pod => {
        console.log(`  - ${pod.metadata?.name} (${pod.status?.phase})`);
        
        // Show pod labels for debugging
        if (pod.metadata?.labels) {
          console.log(`    Labels: ${JSON.stringify(pod.metadata.labels)}`);
        }
      });
      
      if (matchingPods.length > 0) {
        // Try to get logs from the first matching pod
        const firstPod = matchingPods[0];
        const podName = firstPod.metadata?.name;
        
        if (podName) {
          console.log(`\\n📋 Step 3: Getting logs from matching pod: ${podName}`);
          try {
            const logsResponse = await coreV1Api.readNamespacedPodLog({
              name: podName,
              namespace: 'k6-runs',
              tailLines: 50,
              timestamps: true
            });
            
            console.log(`\\n✅ SUCCESS! Got logs from ${podName}`);
            console.log(`📊 Log size: ${logsResponse.body.length} characters`);
            console.log('\\n='.repeat(50));
            console.log('SAMPLE LOGS (first 20 lines):');
            console.log('='.repeat(50));
            const lines = logsResponse.body.split('\\n').slice(0, 20);
            lines.forEach((line, i) => console.log(`${String(i + 1).padStart(3)}: ${line}`));
            console.log('='.repeat(50));
            
          } catch (logError) {
            console.error(`❌ Failed to get pod logs: ${logError.message}`);
          }
        }
      }
      
    } catch (error) {
      console.warn(`❌ Failed broad pod search: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  console.log('\\n🏁 Direct log collection test completed');
}

// Run the test
testLogCollectionDirect().catch(console.error);