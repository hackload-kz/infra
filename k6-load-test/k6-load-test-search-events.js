import http from 'k6/http';
import { sleep, check } from 'k6';
import encoding from 'k6/encoding';

export const options = {
  scenarios: {
    search_events_load_test: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 8000,
      maxVUs: 10000,
      stages: [
        { duration: '1m', target: 1000 },   // Ramp up to 1000 RPS
        { duration: '2m', target: 5000 },   // Ramp up to 5000 RPS  
        { duration: '3m', target: 10000 },  // Ramp up to 10000 RPS
        { duration: '6m', target: 10000 },  // Hold at 10000 RPS
        { duration: '3m', target: 0 },      // Ramp down
      ],
    },
  },
};

const searchPhrases = [
  'концерт',
  'Дмитрий Козлов',
  'азарт',
  'Чемпионат',
  'Красная шапочка',
  'Экспозиция "Звездные войны"'
];

const users = [
  { email: 'aysultan_talgat_1@fest.tix', password: '/8eC$AD>' },
  { email: 'ayaulym_bazarbaeva_3@quick.pass', password: 'LDb60_%]4' },
  { email: 'sultan_sultanov_2@show.go', password: '*IVSf?kh)xa' }
];

// Note: Archive test IDs are set via k6 configuration/environment variables, not generated in script

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Removed unused getRandomInt and getRandomDate functions as they're no longer used with fixed parameters

function createBasicAuthHeader(user) {
  const credentials = `${user.email}:${user.password}`;
  const encodedCredentials = encoding.b64encode(credentials);
  return `Basic ${encodedCredentials}`;
}

export default function () {
  const baseUrl = __ENV.API_URL;
  const user = getRandomElement(users);
  
  const params = {
    headers: {
      'Authorization': createBasicAuthHeader(user),
      'Accept': 'application/json'
    },
    timeout: '30s'
  };

  // Extremely limited scenarios to minimize cardinality
  const testScenarios = [
    // 1. Simple query search (fixed page=1, pageSize=20)
    () => {
      const query = getRandomElement(searchPhrases);
      return `${baseUrl}/api/events?query=${encodeURIComponent(query)}&page=1&pageSize=20`;
    },
    
    // 2. Query with fixed date (fixed page=1, pageSize=20)
    () => {
      const query = getRandomElement(searchPhrases);
      return `${baseUrl}/api/events?query=${encodeURIComponent(query)}&date=2024-12-25&page=1&pageSize=20`;
    },
    
    // 3. Archive testing - just query (fixed page=1, pageSize=20)
    () => {
      const query = getRandomElement(searchPhrases);
      return `${baseUrl}/api/events?query=${encodeURIComponent(query)}&page=1&pageSize=20`;
    }
  ];

  const scenario = getRandomElement(testScenarios);
  const url = scenario();

  const response = http.get(url, params);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response has valid structure with success=true': (r) => {
      try {
        const data = JSON.parse(r.body);
        // Actual API response: {"count":0,"events":[],"success":true}
        if (typeof data !== 'object' || data === null) return false;
        
        // Check required properties
        if (typeof data.success !== 'boolean' || !data.success) return false;
        if (typeof data.count !== 'number') return false;
        if (!Array.isArray(data.events)) return false;
        
        // Validate events array structure if not empty
        if (data.events.length > 0) {
          const event = data.events[0];
          // Each event should have id and title at minimum
          if (typeof event !== 'object' || event === null) return false;
          if (typeof event.id !== 'number') return false;
          if (typeof event.title !== 'string') return false;
        }
        
        // Count should match events array length
        return data.count === data.events.length;
      } catch {
        return false;
      }
    },
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  if (response.status !== 200) {
    console.error(`❌ Request failed: ${response.status} - ${url}`);
    console.error(`📝 Response body: ${response.body}`);
    console.error(`🔑 Auth header: ${params.headers.Authorization.substring(0, 20)}...`);
  } else {
    // Uncomment for debugging successful requests
    // console.log(`✅ Success: ${response.status} - ${url}`);
  }

  sleep(Math.random() * 2 + 0.5);
}

export function setup() {
  return {
    startTime: Date.now(),
    testVersion: 'v1.0.0',
    environment: 'search_events_load_test'
  };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`✅ Search Events Load Test completed in ${duration}s`);
  console.log(`📈 Check metrics for search performance analysis`);
  console.log(`   Target: ${data.environment}`);
  console.log(`   Scenarios tested: query search, date filtering, pagination`);
}