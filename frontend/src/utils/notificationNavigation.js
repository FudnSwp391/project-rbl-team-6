// notificationNavigation.js

export const NOTIFICATION_NAV_MAP = {
  booking_new_request: (notification) => {
    // Determine if it's a package booking based on metadata or fallback
    const isPackage = notification.metadata?.isPackage || notification.metadata?.packageId;
    return {
      tab: 'overview',
      section: 'pending-bookings',
      requestTab: isPackage ? 'monthly' : 'single',
      highlightRef: true
    };
  },
  reschedule_requested: { tab: 'overview', section: 'pending-bookings', requestTab: 'reschedule', highlightRef: true },
  lesson_reminder: { tab: 'schedule' },
  chat_new_message: { tab: 'messages', highlightRef: true }, // refId is sender_id
  dispute_opened: { tab: 'complaints', highlightRef: true },
  dispute_resolved_refund: { tab: 'complaints', highlightRef: true },
  dispute_resolved_release: { tab: 'complaints', highlightRef: true },
  complaint_penalty: { tab: 'complaints' },
  escrow_released: { tab: 'wallet' },
  wallet_topup_success: { tab: 'wallet' },
  withdrawal_created: { tab: 'wallet' },
  withdrawal_approved: { tab: 'wallet' },
  withdrawal_paid: { tab: 'wallet' },
  booking_approved: { tab: 'schedule', highlightRef: true },
  booking_declined: { tab: 'schedule', highlightRef: true },
  booking_cancelled: { tab: 'schedule', highlightRef: true },
  course_enrollment_ping: { tab: 'courses' },
  tutor_profile_approved: { tab: 'profile' },
  session_info_updated: { tab: 'schedule', highlightRef: true },
  method_change_requested: { tab: 'schedule', highlightRef: true },
  wallet_withdraw: { tab: 'WalletWithdraw', highlightRef: true },
};

/**
 * Get navigation target for a notification
 */
export function getNotificationNavTarget(notification) {
  const eventType = notification.event_type || notification.type;
  const config = NOTIFICATION_NAV_MAP[eventType];
  
  let target = { tab: 'overview' }; // Fallback

  if (typeof config === 'function') {
    target = { ...target, ...config(notification) };
  } else if (config) {
    target = { ...target, ...config };
  }

  if (target.highlightRef && notification.ref_id) {
    target.refId = notification.ref_id;
    target.refType = notification.ref_type;
  }

  return target;
}

/**
 * Navigate based on notification
 */
export function navigateFromNotification(notification, isOnDashboard = false) {
  const target = getNotificationNavTarget(notification);
  
  if (isOnDashboard) {
    // Dispatch custom event if already on dashboard
    window.dispatchEvent(new CustomEvent('notification-navigate', { detail: target }));
  } else {
    // Build hash URL for deep linking
    const params = new URLSearchParams();
    if (target.tab) params.append('tab', target.tab);
    if (target.section) params.append('section', target.section);
    if (target.requestTab) params.append('requestTab', target.requestTab);
    if (target.refId) params.append('ref', target.refId);
    
    window.location.hash = `#/dashboard?${params.toString()}`;
  }
}
