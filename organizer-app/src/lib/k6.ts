import * as k8s from '@kubernetes/client-node'

const kc = new k8s.KubeConfig()

// Load config from service account when running in cluster
if (process.env.KUBERNETES_SERVICE_HOST) {
  kc.loadFromCluster()
} else {
  // For local development, load from kubeconfig
  kc.loadFromDefault()
}

const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi)

export interface LoadTestConfig {
  url: string
  virtualUsers: number
  duration: string
}

export async function createK6Test(config: LoadTestConfig): Promise<string> {
  const testId = `load-test-${Date.now()}`
  
  const k6Script = `
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: ${config.virtualUsers} },
    { duration: '${config.duration}', target: ${config.virtualUsers} },
    { duration: '30s', target: 0 },
  ],
};

export default function() {
  let response = http.get('${config.url}');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
`

  const k6TestResource = {
    apiVersion: 'k6.io/v1alpha1',
    kind: 'K6',
    metadata: {
      name: testId,
      namespace: 'k6-system'
    },
    spec: {
      parallelism: 1,
      script: {
        configMap: {
          name: `${testId}-script`,
          file: 'test.js'
        }
      },
      separate: false,
      arguments: '--out cloud'
    }
  }

  const configMapResource = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: `${testId}-script`,
      namespace: 'k6-system'
    },
    data: {
      'test.js': k6Script
    }
  }

  try {
    // Create ConfigMap first
    await customObjectsApi.createNamespacedCustomObject(
      '',
      'v1',
      'k6-system',
      'configmaps',
      configMapResource
    )

    // Create K6 test resource
    await customObjectsApi.createNamespacedCustomObject(
      'k6.io',
      'v1alpha1',
      'k6-system',
      'k6s',
      k6TestResource
    )

    return testId
  } catch (error) {
    console.error('Failed to create K6 test:', error)
    throw new Error('Failed to create load test')
  }
}

export async function getK6TestStatus(testId: string) {
  try {
    const response = await customObjectsApi.getNamespacedCustomObject(
      'k6.io',
      'v1alpha1',
      'k6-system',
      'k6s',
      testId
    )
    
    return response.body
  } catch (error) {
    console.error('Failed to get K6 test status:', error)
    throw new Error('Failed to get test status')
  }
}