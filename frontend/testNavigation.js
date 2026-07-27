import { getNotificationNavTarget } from './src/utils/notificationNavigation.js';

const tests = [
  {
    name: 'booking_new_request (single)',
    notification: { type: 'booking_new_request', ref_id: 'b1', ref_type: 'booking' },
    expected: { tab: 'overview', section: 'pending-bookings', requestTab: 'single', highlightRef: true, refId: 'b1', refType: 'booking' }
  },
  {
    name: 'booking_new_request (monthly)',
    notification: { type: 'booking_new_request', metadata: { isPackage: true }, ref_id: 'b2', ref_type: 'booking' },
    expected: { tab: 'overview', section: 'pending-bookings', requestTab: 'monthly', highlightRef: true, refId: 'b2', refType: 'booking' }
  },
  {
    name: 'reschedule_requested',
    notification: { type: 'reschedule_requested', ref_id: 'b3', ref_type: 'booking' },
    expected: { tab: 'overview', section: 'pending-bookings', requestTab: 'reschedule', highlightRef: true, refId: 'b3', refType: 'booking' }
  },
  {
    name: 'lesson_reminder',
    notification: { type: 'lesson_reminder' },
    expected: { tab: 'schedule' }
  },
  {
    name: 'chat_new_message',
    notification: { type: 'chat_new_message', ref_id: 'user123', ref_type: 'chat' },
    expected: { tab: 'messages', highlightRef: true, refId: 'user123', refType: 'chat' }
  },
  {
    name: 'dispute_opened',
    notification: { type: 'dispute_opened', ref_id: 'd1', ref_type: 'dispute' },
    expected: { tab: 'complaints', highlightRef: true, refId: 'd1', refType: 'dispute' }
  },
  {
    name: 'wallet_topup_success',
    notification: { type: 'wallet_topup_success' },
    expected: { tab: 'wallet' }
  },
  {
    name: 'withdrawal_created',
    notification: { type: 'withdrawal_created' },
    expected: { tab: 'wallet' }
  },
  {
    name: 'booking_approved',
    notification: { event_type: 'booking_approved', ref_id: 'b4' },
    expected: { tab: 'schedule', highlightRef: true, refId: 'b4' }
  },
  {
    name: 'course_enrollment_ping',
    notification: { type: 'course_enrollment_ping' },
    expected: { tab: 'courses' }
  },
  {
    name: 'Unknown type',
    notification: { type: 'unknown_xyz' },
    expected: { tab: 'overview' }
  }
];

let allPassed = true;

tests.forEach(({ name, notification, expected }) => {
  const result = getNotificationNavTarget(notification);
  
  let passed = true;
  for (const key in expected) {
    if (result[key] !== expected[key]) {
      passed = false;
      console.error(`❌ [FAILED] ${name}`);
      console.error(`   Expected ${key} to be '${expected[key]}', got '${result[key]}'`);
    }
  }
  
  if (passed) {
    console.log(`✅ [PASSED] ${name}`);
  } else {
    allPassed = false;
  }
});

if (allPassed) {
  console.log('\n🎉 ALL TESTS PASSED!');
} else {
  console.log('\n⚠️ SOME TESTS FAILED.');
  process.exit(1);
}
