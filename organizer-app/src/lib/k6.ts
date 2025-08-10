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
  parallelism?: number // Number of parallel K6 containers (default: 1)
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
      parallelism: config.parallelism || 1,
      script: {
        configMap: {
          name: configMapName,
          file: 'test.js'
        }
      },
      arguments: `--out experimental-prometheus-rw --tag team=${config.teamNickname} --tag test_scenario=${config.scenarioIdentifier} --tag step=${sanitizedStepName} --tag step_order=${config.stepOrder} --tag testid=${testRunName} --tag run_number=${config.runNumber}`,
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
export function mapK6StageToStatus(stage: string): 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' {
  switch (stage) {
    case 'initialization':
    case 'initialized':
      return 'PENDING'
    case 'created':
    case 'started':
      return 'RUNNING'
    case 'finished':
      return 'SUCCEEDED'
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


// Check if K6 TestRun exists and get its status
export async function checkK6TestRunStatus(testRunName: string) {
  try {
    const response = await customObjectsApi.getNamespacedCustomObject({
      group: 'k6.io',
      version: 'v1alpha1',
      namespace: 'k6-runs',
      plural: 'testruns',
      name: testRunName
    })

    // Kubernetes client возвращает данные напрямую в response
    const testRun = response.body || (response as unknown)

    const status = testRun?.status
    const stage = status?.stage
    const conditions = status?.conditions || []
    const jobName = status?.jobName

    return {
      exists: true,
      status: stage || 'unknown',
      conditions: conditions,
      jobName: jobName
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error &&
      error.response && typeof error.response === 'object' && 'statusCode' in error.response &&
      error.response.statusCode === 404) {
      return {
        exists: false,
        status: 'deleted',
        conditions: [],
        jobName: null
      }
    }
    console.error(`Failed to check K6 TestRun status for ${testRunName}:`, error)
    throw error
  }
}

// Get container logs for a K6 TestRun, supporting multiple containers from parallelism
export async function getK6TestRunLogs(testRunName: string, tailLines: number = 100) {
  try {
    const coreApi = kc.makeApiClient(k8s.CoreV1Api)
    let podsResponse: k8s.V1PodList | null = null

    // Strategy 1: Try to get job name from TestRun status
    try {
      const testRunStatus = await checkK6TestRunStatus(testRunName)
      
      if (testRunStatus.exists && testRunStatus.jobName) {
        try {
          const podSearchResponse = await coreApi.listNamespacedPod({
            namespace: 'k6-runs',
            labelSelector: `job-name=${testRunStatus.jobName}`
          })
          
          // Handle different response structures
          const responseBody = podSearchResponse.body || podSearchResponse
          podsResponse = { body: responseBody } as any
        } catch (podError) {
          console.warn(`Failed to find pods with job-name: ${podError instanceof Error ? podError.message : 'Unknown error'}`)
          podsResponse = null
        }
      }
    } catch (error) {
      console.warn(`Failed to get job name from TestRun status: ${error instanceof Error ? error.message : 'Unknown error'}`)
      podsResponse = null
    }

    // Strategy 2: If no pods found, try finding pods by k6_cr label (K6 TestRun name)
    if (!podsResponse || !podsResponse.body || !podsResponse.body.items || podsResponse.body.items.length === 0) {
      try {
        const podSearchResponse = await coreApi.listNamespacedPod({
          namespace: 'k6-runs',
          labelSelector: `k6_cr=${testRunName}`
        })
        
        // Handle different response structures
        const responseBody = podSearchResponse.body || podSearchResponse
        podsResponse = { body: responseBody } as any
      } catch (error) {
        console.warn(`Failed to find pods with k6_cr label: ${error instanceof Error ? error.message : 'Unknown error'}`)
        podsResponse = null // Reset to null on error
      }
    }

    // Strategy 3: If still no pods, try broader search with partial name match
    if (!podsResponse || !podsResponse.body || !podsResponse.body.items || podsResponse.body.items.length === 0) {
      try {
        const allPodsSearchResponse = await coreApi.listNamespacedPod({
          namespace: 'k6-runs'
        })
        
        // Handle different response structures
        const responseBody = allPodsSearchResponse.body || allPodsSearchResponse
        
        // Check if we have items to filter
        if (responseBody?.items) {
          // Filter pods that contain the testRunName in their name
          const matchingPods = responseBody.items.filter(pod => 
            pod.metadata?.name?.includes(testRunName)
          )
          
          if (matchingPods.length > 0) {
            podsResponse = { body: { items: matchingPods } } as any
          }
        }
      } catch (error) {
        console.warn(`Failed broad pod search: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (!podsResponse || !podsResponse.body || !podsResponse.body.items || podsResponse.body.items.length === 0) {
      console.log(`No pods found for K6 TestRun: ${testRunName}`)
      return null
    }

    console.log(`Found ${podsResponse.body.items.length} pod(s) for K6 TestRun: ${testRunName}`)
    const allLogs: string[] = []
    
    // Get logs from all pods if parallelism > 1
    for (const pod of podsResponse.body.items) {
      const podName = pod.metadata?.name
      
      if (!podName) {
        continue
      }

      try {
        const logsResponse = await coreApi.readNamespacedPodLog({
          name: podName,
          namespace: 'k6-runs',
          tailLines: tailLines,
          timestamps: true
        })

        // Handle different log response structures
        const logData = logsResponse.body || logsResponse
        const logText = typeof logData === 'string' ? logData : (logData?.toString() || '')
        
        // Add container header and logs
        const containerHeader = `\n=== Container: ${podName} ===\n`
        const containerLogs = `${containerHeader}${logText}\n`
        allLogs.push(containerLogs)
        console.log(`Successfully collected logs from pod: ${podName} (${logText.length} chars)`)
        
      } catch (podError) {
        console.warn(`Failed to get logs from pod ${podName}:`, podError)
        // Continue with other pods even if one fails
        const errorHeader = `\n=== Container: ${podName} (ERROR) ===\n`
        const errorMessage = `Failed to retrieve logs: ${podError instanceof Error ? podError.message : 'Unknown error'}\n`
        allLogs.push(`${errorHeader}${errorMessage}`)
      }
    }

    const totalLogs = allLogs.join('\n')
    console.log(`Total logs collected for ${testRunName}: ${totalLogs.length} characters from ${allLogs.length} container(s)`)
    return allLogs.length > 0 ? totalLogs : null
  } catch (error) {
    console.error(`Failed to get logs for K6 TestRun ${testRunName}:`, error)
    return null
  }
}

// Check pod statuses to determine actual test result
export async function checkK6TestRunPodStatuses(testRunName: string): Promise<{
  hasFailedPods: boolean
  hasCompletedPods: boolean
  podStatuses: Array<{ name: string, phase: string }>
}> {
  try {
    const coreApi = kc.makeApiClient(k8s.CoreV1Api)
    let podsResponse: k8s.V1PodList | null = null

    // Try multiple strategies to find pods (same as in log collection)
    
    // Strategy 1: Try to get job name from TestRun status
    try {
      const testRunStatus = await checkK6TestRunStatus(testRunName)
      if (testRunStatus.exists && testRunStatus.jobName) {
        try {
          const podSearchResponse = await coreApi.listNamespacedPod({
            namespace: 'k6-runs',
            labelSelector: `job-name=${testRunStatus.jobName}`
          })
          const responseBody = podSearchResponse.body || podSearchResponse
          podsResponse = { body: responseBody } as any
        } catch (podError) {
          // Continue to next strategy
        }
      }
    } catch (error) {
      // Continue to next strategy
    }

    // Strategy 2: Try k6_cr label
    if (!podsResponse || !podsResponse.body || !podsResponse.body.items || podsResponse.body.items.length === 0) {
      try {
        const podSearchResponse = await coreApi.listNamespacedPod({
          namespace: 'k6-runs',
          labelSelector: `k6_cr=${testRunName}`
        })
        const responseBody = podSearchResponse.body || podSearchResponse
        podsResponse = { body: responseBody } as any
      } catch (error) {
        // Continue to next strategy
      }
    }

    // Strategy 3: Broader search
    if (!podsResponse || !podsResponse.body || !podsResponse.body.items || podsResponse.body.items.length === 0) {
      try {
        const allPodsSearchResponse = await coreApi.listNamespacedPod({
          namespace: 'k6-runs'
        })
        const responseBody = allPodsSearchResponse.body || allPodsSearchResponse
        
        if (responseBody?.items) {
          const matchingPods = responseBody.items.filter(pod => 
            pod.metadata?.name?.includes(testRunName)
          )
          
          if (matchingPods.length > 0) {
            podsResponse = { body: { items: matchingPods } } as any
          }
        }
      } catch (error) {
        // No pods found
      }
    }

    if (!podsResponse || !podsResponse.body || !podsResponse.body.items) {
      return {
        hasFailedPods: false,
        hasCompletedPods: false,
        podStatuses: []
      }
    }

    const podStatuses = podsResponse.body.items.map(pod => ({
      name: pod.metadata?.name || 'unknown',
      phase: pod.status?.phase || 'unknown'
    }))

    // Check if any pods are in Error state (indicating test failure due to thresholds)
    const hasFailedPods = podStatuses.some(pod => pod.phase === 'Failed' || pod.phase === 'Error')
    const hasCompletedPods = podStatuses.some(pod => pod.phase === 'Succeeded' || pod.phase === 'Completed')

    return {
      hasFailedPods,
      hasCompletedPods,
      podStatuses
    }

  } catch (error) {
    console.error(`Failed to check pod statuses for K6 TestRun ${testRunName}:`, error)
    return {
      hasFailedPods: false,
      hasCompletedPods: false,
      podStatuses: []
    }
  }
}

// Enhanced status mapping that checks pod statuses for finished tests
export async function getK6TestRunActualStatus(testRunName: string): Promise<'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'DELETED'> {
  try {
    const testRunStatus = await checkK6TestRunStatus(testRunName)
    
    if (!testRunStatus.exists) {
      return 'DELETED'
    }

    const stage = testRunStatus.status
    const baseStatus = mapK6StatusToStepStatus(stage)

    // For finished tests, check pod statuses to determine actual result
    if (stage === 'finished') {
      const podCheck = await checkK6TestRunPodStatuses(testRunName)
      
      // If any pods failed (Error status), the test failed
      if (podCheck.hasFailedPods) {
        console.log(`TestRun ${testRunName}: Found failed pods, marking as FAILED`)
        return 'FAILED'
      }
    }

    return baseStatus
  } catch (error) {
    console.error(`Failed to get actual status for K6 TestRun ${testRunName}:`, error)
    return 'FAILED'
  }
}

// Map K6 TestRun stage to database status
export function mapK6StatusToStepStatus(stage: string): 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'DELETED' {
  switch (stage) {
    case 'initialization':
    case 'initialized':
      return 'PENDING'
    case 'created':
    case 'started':
      return 'RUNNING'
    case 'finished':
      return 'SUCCEEDED'
    case 'stopped':
      return 'CANCELLED'
    case 'error':
      return 'FAILED'
    case 'deleted':
      return 'DELETED'
    default:
      return 'PENDING'
  }
}
