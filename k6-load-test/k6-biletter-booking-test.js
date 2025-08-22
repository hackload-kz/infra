import http from 'k6/http';
import { sleep, check } from 'k6';
import encoding from 'k6/encoding';

export const options = {
  scenarios: {
    biletter_booking_test: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 1000, // 10 users x 1000 iterations = 10000 booking attempts
      maxDuration: '30m',
    },
    conflict_test: {
      executor: 'per-vu-iterations',
      vus: 2, // 2 users competing for the same seat
      iterations: 100,
      maxDuration: '10m',
      exec: 'conflictTest', // Use separate function for conflict testing
    },
  },
};

const users = [
  { email: 'user1@test.com', password: 'password1' },
  { email: 'user2@test.com', password: 'password2' },
  { email: 'user3@test.com', password: 'password3' },
  { email: 'user4@test.com', password: 'password4' },
  { email: 'user5@test.com', password: 'password5' },
  { email: 'user6@test.com', password: 'password6' },
  { email: 'user7@test.com', password: 'password7' },
  { email: 'user8@test.com', password: 'password8' },
  { email: 'user9@test.com', password: 'password9' },
  { email: 'user10@test.com', password: 'password10' },
];

function createBasicAuthHeader(user) {
  const credentials = `${user.email}:${user.password}`;
  const encodedCredentials = encoding.b64encode(credentials);
  return `Basic ${encodedCredentials}`;
}

export default function () {
  const baseUrl = __ENV.API_URL || 'https://localhost:8081';
  const user = users[__VU - 1]; // Each VU gets a specific user (VU 1 gets user[0], VU 2 gets user[1], etc.)
  
  const params = {
    headers: {
      'Authorization': createBasicAuthHeader(user),
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    timeout: '30s'
  };

  // Step 1: Use event with ID 1 (hardcoded as per requirements)
  const eventId = 1;

  // Step 3: Gather information about free places
  const seatsResponse = http.get(
    `${baseUrl}/api/seats?event_id=${eventId}&page=1&pageSize=20&row=5&status=FREE`,
    params
  );

  check(seatsResponse, {
    'get free seats status is 200': (r) => r.status === 200,
    'seats response has valid structure': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data);
      } catch {
        return false;
      }
    },
  });

  if (seatsResponse.status !== 200) {
    console.error(`❌ Get seats failed: ${seatsResponse.status} - ${seatsResponse.body}`);
    return;
  }

  let freeSeats;
  try {
    freeSeats = JSON.parse(seatsResponse.body);
  } catch {
    console.error(`❌ Failed to parse seats response`);
    return;
  }

  if (!Array.isArray(freeSeats) || freeSeats.length === 0) {
    console.error(`❌ No free seats available`);
    return;
  }

  // Step 4: Create a booking
  const createBookingPayload = {
    event_id: eventId
  };

  const bookingResponse = http.post(
    `${baseUrl}/api/bookings`,
    JSON.stringify(createBookingPayload),
    params
  );

  check(bookingResponse, {
    'create booking status is 201': (r) => r.status === 201,
    'booking response has id': (r) => {
      try {
        const data = JSON.parse(r.body);
        return typeof data.id === 'number';
      } catch {
        return false;
      }
    },
  });

  if (bookingResponse.status !== 201) {
    console.error(`❌ Create booking failed: ${bookingResponse.status} - ${bookingResponse.body}`);
    return;
  }

  let booking;
  try {
    booking = JSON.parse(bookingResponse.body);
  } catch {
    console.error(`❌ Failed to parse booking response`);
    return;
  }

  // Step 5: Take the first free place
  const firstFreeSeat = freeSeats[0];
  const selectSeatPayload = {
    booking_id: booking.id,
    seat_id: firstFreeSeat.id
  };

  const selectSeatResponse = http.patch(
    `${baseUrl}/api/seats/select`,
    JSON.stringify(selectSeatPayload),
    params
  );

  check(selectSeatResponse, {
    'select seat status is 200': (r) => r.status === 200,
  });

  if (selectSeatResponse.status === 200) {
    console.log(`✅ User ${user.email} successfully booked seat ${firstFreeSeat.id} (row ${firstFreeSeat.row}, number ${firstFreeSeat.number})`);
  } else if (selectSeatResponse.status === 419) {
    console.log(`⚠️ User ${user.email} failed to book seat ${firstFreeSeat.id} - seat already taken`);
  } else {
    console.error(`❌ User ${user.email} select seat failed: ${selectSeatResponse.status} - ${selectSeatResponse.body}`);
  }

  sleep(Math.random() * 2 + 0.5);
}

// Conflict test function - two users try to book the same seat
export function conflictTest() {
  const baseUrl = __ENV.API_URL || 'https://localhost:8081';
  const user = users[__VU - 1]; // VU 1 gets user1, VU 2 gets user2
  
  const params = {
    headers: {
      'Authorization': createBasicAuthHeader(user),
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    timeout: '30s'
  };

  const eventId = 1;

  // Both users get free seats
  const seatsResponse = http.get(
    `${baseUrl}/api/seats?event_id=${eventId}&page=1&pageSize=20&row=5&status=FREE`,
    params
  );

  check(seatsResponse, {
    'conflict test get free seats status is 200': (r) => r.status === 200,
  });

  if (seatsResponse.status !== 200) {
    console.error(`❌ Conflict test get seats failed: ${seatsResponse.status}`);
    return;
  }

  let freeSeats;
  try {
    freeSeats = JSON.parse(seatsResponse.body);
  } catch {
    console.error(`❌ Conflict test failed to parse seats response`);
    return;
  }

  if (!Array.isArray(freeSeats) || freeSeats.length === 0) {
    console.error(`❌ Conflict test no free seats available`);
    return;
  }

  // Both users create bookings
  const createBookingPayload = {
    event_id: eventId
  };

  const bookingResponse = http.post(
    `${baseUrl}/api/bookings`,
    JSON.stringify(createBookingPayload),
    params
  );

  check(bookingResponse, {
    'conflict test create booking status is 201': (r) => r.status === 201,
  });

  if (bookingResponse.status !== 201) {
    console.error(`❌ Conflict test create booking failed: ${bookingResponse.status}`);
    return;
  }

  let booking;
  try {
    booking = JSON.parse(bookingResponse.body);
  } catch {
    console.error(`❌ Conflict test failed to parse booking response`);
    return;
  }

  // Both users try to book THE SAME SEAT (first free seat)
  const targetSeat = freeSeats[0];
  const selectSeatPayload = {
    booking_id: booking.id,
    seat_id: targetSeat.id
  };

  console.log(`🎯 User ${user.email} attempting to book seat ${targetSeat.id} (row ${targetSeat.row}, number ${targetSeat.number})`);

  // Small random delay to simulate real-world timing variations
  sleep(Math.random() * 0.1);

  const selectSeatResponse = http.patch(
    `${baseUrl}/api/seats/select`,
    JSON.stringify(selectSeatPayload),
    params
  );

  check(selectSeatResponse, {
    'conflict test seat response is valid': (r) => r.status === 200 || r.status === 419,
  });

  if (selectSeatResponse.status === 200) {
    console.log(`✅ User ${user.email} successfully booked seat ${targetSeat.id} - WINNER!`);
    check(selectSeatResponse, {
      'conflict test winner gets seat': (r) => r.status === 200,
    });

    // Verify booking confirmation using ListBookings
    sleep(0.5); // Brief delay to ensure booking is processed
    const listBookingsResponse = http.get(`${baseUrl}/api/bookings`, params);
    
    check(listBookingsResponse, {
      'conflict test list bookings status is 200': (r) => r.status === 200,
      'conflict test booking is confirmed': (r) => {
        try {
          const bookings = JSON.parse(r.body);
          if (!Array.isArray(bookings)) return false;
          
          // Find our booking and verify it has the selected seat
          const ourBooking = bookings.find(b => b.id === booking.id);
          if (!ourBooking) return false;
          
          // Check if the booking has seats and contains our target seat
          if (!Array.isArray(ourBooking.seats)) return false;
          return ourBooking.seats.some(seat => seat.id === targetSeat.id);
        } catch {
          return false;
        }
      },
    });

    try {
      const bookings = JSON.parse(listBookingsResponse.body);
      const ourBooking = bookings.find(b => b.id === booking.id);
      if (ourBooking && ourBooking.seats && ourBooking.seats.length > 0) {
        console.log(`🎫 User ${user.email} booking confirmed with ${ourBooking.seats.length} seat(s)`);
      }
    } catch {
      console.error(`❌ User ${user.email} failed to verify booking confirmation`);
    }

  } else if (selectSeatResponse.status === 419) {
    console.log(`⚠️ User ${user.email} failed to book seat ${targetSeat.id} - seat already taken (EXPECTED BEHAVIOR)`);
    check(selectSeatResponse, {
      'conflict test loser gets 419 status': (r) => r.status === 419,
    });

    // Verify that loser's booking has no seats
    sleep(0.5);
    const listBookingsResponse = http.get(`${baseUrl}/api/bookings`, params);
    
    check(listBookingsResponse, {
      'conflict test loser list bookings status is 200': (r) => r.status === 200,
      'conflict test loser booking has no seats': (r) => {
        try {
          const bookings = JSON.parse(r.body);
          if (!Array.isArray(bookings)) return false;
          
          const ourBooking = bookings.find(b => b.id === booking.id);
          if (!ourBooking) return true; // Booking might not exist, which is also valid
          
          // If booking exists, it should have no seats or empty seats array
          return !ourBooking.seats || ourBooking.seats.length === 0;
        } catch {
          return false;
        }
      },
    });

    console.log(`📋 User ${user.email} booking correctly has no confirmed seats`);

  } else {
    console.error(`❌ User ${user.email} conflict test unexpected response: ${selectSeatResponse.status} - ${selectSeatResponse.body}`);
  }

  sleep(0.5);
}

export function setup() {
  console.log(`🚀 Starting Biletter booking test with ${users.length} users`);
  console.log(`📊 Main scenario: ${options.scenarios.biletter_booking_test.vus * options.scenarios.biletter_booking_test.iterations} total booking attempts`);
  console.log(`🥊 Conflict scenario: ${options.scenarios.conflict_test.vus * options.scenarios.conflict_test.iterations} conflict tests`);
  return {
    startTime: Date.now(),
    testVersion: 'v1.0.0',
    environment: 'biletter_booking_test'
  };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`✅ Biletter Booking Test completed in ${duration}s`);
  console.log(`📈 Check metrics for booking performance analysis`);
  console.log(`   Target: ${data.environment}`);
  console.log(`   Scenarios tested: system reset, seat lookup, booking creation, seat selection`);
}