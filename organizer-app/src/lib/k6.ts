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
const coreV1Api = kc.makeApiClient(k8s.CoreV1Api)

export interface LoadTestConfig {
  url: string
  virtualUsers: number
  duration: string
}

export interface K6TestRunConfig {
  teamId: string
  teamNickname: string
  scenarioId: string
  scenarioIdentifier: string
  stepName: string
  stepOrder: number
  runNumber: number // Global sequential run number
  k6Script: string
}

// Legacy function for backward compatibility
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
      namespace: 'k6-runs'
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
      namespace: 'k6-runs'
    },
    data: {
      'test.js': k6Script
    }
  }

  try {
    // Create ConfigMap first
    await coreV1Api.createNamespacedConfigMap({
      namespace: 'k6-runs',
      body: configMapResource
    })

    // Create K6 test resource
    await customObjectsApi.createNamespacedCustomObject({
      group: 'k6.io',
      version: 'v1alpha1',
      namespace: 'k6-runs',
      plural: 'k6s',
      body: k6TestResource
    })

    return testId
  } catch (error) {
    console.error('Failed to create K6 test:', error)
    throw new Error('Failed to create load test')
  }
}

// New function that follows the specific K6 TestRun specification
export async function createK6TestRun(config: K6TestRunConfig): Promise<string> {
  // Generate test name: teamNickname + scenarioIdentifier + stepName + runNumber
  const sanitizedStepName = config.stepName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const testRunName = `${config.teamNickname}-${config.scenarioIdentifier}-${sanitizedStepName}-${config.runNumber}`
  const configMapName = `${testRunName}-config`

  // Create ConfigMap with the K6 script
  const configMapResource = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: configMapName,
      namespace: 'k6-runs',
      labels: {
        'app': 'k6',
        'testrun': testRunName,
        'team': config.teamNickname,
        'scenario': config.scenarioIdentifier,
        'step': sanitizedStepName,
        'stepOrder': config.stepOrder.toString()
      }
    },
    data: {
      'test.js': config.k6Script
    }
  }

  // Create K6 TestRun resource following the YAML spec
  const k6TestRunResource = {
    apiVersion: 'k6.io/v1alpha1',
    kind: 'TestRun',
    metadata: {
      name: testRunName,
      namespace: 'k6-runs',
      labels: {
        'app': 'k6',
        'testrun': testRunName,
        'team': config.teamNickname,
        'scenario': config.scenarioIdentifier,
        'step': sanitizedStepName,
        'stepOrder': config.stepOrder.toString()
      }
    },
    spec: {
      parallelism: 1,
      script: {
        configMap: {
          name: configMapName,
          file: 'test.js'
        }
      },
      arguments: `--out experimental-prometheus-rw --tag team=${config.teamNickname} --tag test_scenario=${config.scenarioIdentifier} --tag step=${sanitizedStepName} --tag stepOrder=${config.stepOrder} --tag testid=${testRunName} --tag runNumber=${config.runNumber}`,
      runner: {
        image: 'grafana/k6:latest',
        env: [
          {
            name: 'K6_PROMETHEUS_RW_SERVER_URL',
            value: 'http://prometheus-kube-prometheus-prometheus.telemetry.svc.cluster.local:9090/prometheus/api/v1/write'
          },
          {
            name: 'K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM',
            value: 'true'
          },
          {
            name: 'K6_PROMETHEUS_RW_PUSH_INTERVAL',
            value: '5s'
          }
        ]
      }
    }
  }

  try {
    // Create ConfigMap first
    await coreV1Api.createNamespacedConfigMap({
      namespace: 'k6-runs',
      body: configMapResource
    })

    // Create K6 TestRun resource
    await customObjectsApi.createNamespacedCustomObject({
      group: 'k6.io',
      version: 'v1alpha1',
      namespace: 'k6-runs',
      plural: 'testruns',
      body: k6TestRunResource
    })

    return testRunName
  } catch (error) {
    console.error('Failed to create K6 TestRun:', error)
    throw new Error('Failed to create K6 test run')
  }
}

export async function getK6TestRunStatus(testRunName: string) {
  try {
    const response = await customObjectsApi.getNamespacedCustomObject({
      group: 'k6.io',
      version: 'v1alpha1',
      namespace: 'k6-runs',
      plural: 'testruns',
      name: testRunName
    })

    return response.body
  } catch (error) {
    console.error('Failed to get K6 TestRun status:', error)
    throw new Error('Failed to get test run status')
  }
}

export async function deleteK6TestRun(testRunName: string) {
  try {
    const configMapName = `${testRunName}-config`

    // Delete K6 TestRun resource
    await customObjectsApi.deleteNamespacedCustomObject({
      group: 'k6.io',
      version: 'v1alpha1',
      namespace: 'k6-runs',
      plural: 'testruns',
      name: testRunName
    })

    // Delete ConfigMap
    await coreV1Api.deleteNamespacedConfigMap({
      name: configMapName,
      namespace: 'k6-runs'
    })

    return true
  } catch (error) {
    console.error('Failed to delete K6 TestRun:', error)
    throw new Error('Failed to delete K6 test run')
  }
}

export async function getK6TestStatus(testId: string) {
  try {
    const response = await customObjectsApi.getNamespacedCustomObject({
      group: 'k6.io',
      version: 'v1alpha1',
      namespace: 'k6-runs',
      plural: 'k6s',
      name: testId
    })

    return response.body
  } catch (error) {
    console.error('Failed to get K6 test status:', error)
    throw new Error('Failed to get test status')
  }
}

// Map K6 TestRun stage to database status
export function mapK6StageToStatus(stage: string): 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' {
  switch (stage) {
    case 'initialization':
    case 'initialized':
      return 'PENDING'
    case 'created':
    case 'started':
      return 'RUNNING'
    case 'finished':
      return 'COMPLETED'
    case 'stopped':
      return 'CANCELLED'
    case 'error':
      return 'FAILED'
    default:
      return 'PENDING'
  }
}

// Get all K6 test runs with their current status
export async function getAllK6TestRuns() {
  try {
    const response = await customObjectsApi.listNamespacedCustomObject({
      group: 'k6.io',
      version: 'v1alpha1',
      namespace: 'k6-runs',
      plural: 'testruns'
    })

    return response.body
  } catch (error) {
    console.error('Failed to list K6 test runs:', error)
    throw new Error('Failed to list K6 test runs')
  }
}
