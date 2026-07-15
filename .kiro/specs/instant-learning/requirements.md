# Requirements Document

## Introduction

Instant Learning (Learn Now) is a new feature for the EduX tutoring platform that enables students to immediately connect with tutors who are currently online and available. Unlike the existing scheduled booking workflow (which requires admin approval and advance planning), Instant Learning creates a real-time, on-demand tutoring session within 60 seconds of a student's request. The feature introduces availability management for tutors, a real-time notification and accept/decline flow via Socket.IO (the project's existing real-time infrastructure), frozen wallet balance mechanics built on top of EduX's existing escrow system, and a streamlined session entry that bypasses admin approval entirely.

The tech stack is Node.js/Express (backend), PostgreSQL via Supabase (database), React + JavaScript (frontend), and Socket.IO for real-time communication.

---

## Glossary

- **Student**: A platform user with `role = 'student'` who initiates instant learning requests.
- **Tutor**: A platform user with `role = 'tutor'` whose profile has `status = 'approved'` in `tutor_profiles`.
- **Instant_Booking**: A booking record with `booking_type = 'instant'` created through the Learn Now flow.
- **Instant_Price**: The fee (in VND) charged per instant session, configured by the tutor.
- **Instant_Price_Unit**: The billing unit for an instant session (e.g., `per_30_min` or `per_session`).
- **Availability_Status**: The tutor's current online/offline state for instant learning, stored as `is_available_now` on `tutor_profiles`.
- **Frozen_Balance**: The portion of a student's wallet balance that is held (not spendable) while an instant booking request is pending or a session is in progress. Maps to the existing `held_balance` column on the `wallets` table.
- **Available_Balance**: The spendable balance = `balance` column on `wallets` (which already excludes `held_balance` by the existing escrow functions).
- **Countdown_Timer**: A 60-second timer presented to the tutor on receiving an instant request, after which the request auto-expires.
- **Teaching_Session**: A session record created automatically upon tutor acceptance, linking student, tutor, and the Instant_Booking.
- **System**: The EduX backend application (Node.js/Express + PostgreSQL).
- **Notification_Service**: The existing in-app notification system plus Socket.IO real-time push.
- **Wallet_Service**: The existing wallet module comprising `wallets`, `transactions`, and the PostgreSQL functions `hold_money_for_lesson` and `refund_escrow`.

---

## Requirements

### Requirement 1: Tutor Instant Learning Configuration

**User Story:** As a tutor, I want to configure my Instant Learning settings (price and availability status) from my profile settings, so that I can control when and at what price students can connect with me instantly.

#### Acceptance Criteria

1. THE **System** SHALL provide a dedicated "Instant Learning Settings" section within the Tutor Profile Settings page.
2. THE **Tutor** SHALL be able to set an **Instant_Price** as a positive numeric value in VND (minimum 10,000 VND).
3. THE **Tutor** SHALL be able to set an **Instant_Price_Unit** by selecting one of the options: `per_30_min` or `per_session`.
4. THE **System** SHALL persist `instant_price` and `instant_price_unit` in the `tutor_profiles` table.
5. THE **Tutor** SHALL be able to toggle **Availability_Status** between `Online` (available for instant sessions) and `Offline` (unavailable).
6. THE **System** SHALL persist `is_available_now` as a boolean in the `tutor_profiles` table.
7. WHEN a tutor sets `is_available_now = false`, THE **System** SHALL ensure no new Instant_Booking requests can be created for that tutor.
8. IF a tutor has not configured `instant_price`, THEN THE **System** SHALL prevent the tutor from setting `is_available_now = true` and SHALL return a validation error message: "Vui lòng cấu hình giá trước khi bật trạng thái Online."
9. WHILE a tutor has an Instant_Booking in status `Pending` or `InProgress`, THE **System** SHALL automatically set `is_available_now = false` to prevent duplicate concurrent instant sessions.
10. WHEN a tutor's Instant_Booking transitions to status `Declined`, `Timeout`, or `Completed`, THE **System** SHALL restore `is_available_now` to `true` if the tutor had it enabled before the session.

---

### Requirement 2: Tutor Online Status Display on Tutor Detail Page

**User Story:** As a student, I want to see whether a tutor is currently available for instant learning when I view their profile, so that I know if I can request an immediate session.

#### Acceptance Criteria

1. WHEN a student views a Tutor Detail Page and the tutor's `is_available_now = true`, THE **System** SHALL display a green "Online" badge next to the tutor's name.
2. WHEN a student views a Tutor Detail Page and the tutor's `is_available_now = true`, THE **System** SHALL display the tutor's **Instant_Price** and **Instant_Price_Unit** in a clearly labeled section.
3. WHEN a student views a Tutor Detail Page and the tutor's `is_available_now = true`, THE **System** SHALL display a "Học Ngay" (Learn Now) button.
4. WHEN a student views a Tutor Detail Page and the tutor's `is_available_now = false`, THE **System** SHALL hide the "Học Ngay" button. THE **System** SHALL independently display the message "Gia sư hiện không available" regardless of button visibility.
5. THE **System** SHALL fetch the tutor's `is_available_now`, `instant_price`, and `instant_price_unit` fields from the `tutor_profiles` table as part of the existing tutor detail API response.

---

### Requirement 3: Learn Now Request Initiation — Authentication Check

**User Story:** As a student, when I click "Learn Now," I want the system to verify I am authenticated before proceeding, so that only logged-in students can create instant booking requests.

#### Acceptance Criteria

1. WHEN a student clicks the "Học Ngay" button and the student is not authenticated (no valid JWT), THE **System** SHALL redirect the student to the login page.
2. WHEN a student clicks the "Học Ngay" button and the student is authenticated, THE **System** SHALL proceed to the wallet balance check (Requirement 4).
3. IF a student's JWT is expired or invalid at the moment of clicking "Học Ngay", THEN THE **System** SHALL return HTTP 401 and the frontend SHALL redirect the student to the login page.

---

### Requirement 4: Learn Now Request Initiation — Wallet Balance Check

**User Story:** As a student, I want the system to verify I have sufficient wallet balance before creating an instant booking, so that I cannot create a session I cannot afford.

#### Acceptance Criteria

1. WHEN a student clicks "Học Ngay" and is authenticated, THE **System** SHALL retrieve the student's `balance` (available balance) from the `wallets` table.
2. IF the student's `balance` is less than the tutor's `instant_price`, THEN THE **System** SHALL return HTTP 400 with message "Số dư không đủ. Vui lòng nạp thêm tiền vào ví." and SHALL NOT create any booking or freeze any funds. This check is only triggered after the student clicks "Học Ngay" and is authenticated.
3. WHEN the student's `balance` is greater than or equal to the tutor's `instant_price`, THE **System** SHALL proceed to freeze the funds (Requirement 5).
4. THE **System** SHALL perform the balance check and the freeze operation within a single serializable database transaction to prevent race conditions.

---

### Requirement 5: Frozen Balance (Escrow Hold for Instant Booking)

**User Story:** As a student, when I initiate an instant session, I want the required fee to be reserved from my wallet immediately, so that funds are guaranteed to be available if the tutor accepts.

#### Acceptance Criteria

1. WHEN a student's balance check passes, THE **System** SHALL atomically deduct `instant_price` from the student's `balance` and add it to `held_balance` using the existing `hold_money_for_lesson` PostgreSQL function (or equivalent transaction).
2. THE **System** SHALL record a transaction entry of type `PAYMENT` with status `HELD_IN_ESCROW` referencing the newly created Instant_Booking ID.
3. AFTER freezing, THE **System** SHALL create an Instant_Booking record with `booking_type = 'instant'` and `status = 'Pending'`.
4. IF the database transaction fails for any reason, THEN THE **System** SHALL roll back all changes (no funds deducted, no booking created) and SHALL return HTTP 500 with message "Đã xảy ra lỗi. Vui lòng thử lại."
5. THE **System** SHALL use `SELECT ... FOR UPDATE` on the wallet row to prevent duplicate concurrent freeze operations from the same student.
6. IF a student already has an active Instant_Booking in status `Pending` or `InProgress`, THEN THE **System** SHALL reject the new request with HTTP 409 and message "Bạn đang có một yêu cầu học ngay đang xử lý."

---

### Requirement 6: Real-Time Tutor Notification

**User Story:** As a tutor, I want to receive an immediate real-time notification when a student initiates an instant session with me, so that I can accept or decline quickly.

#### Acceptance Criteria

1. WHEN an Instant_Booking is created with status `Pending`, THE **Notification_Service** SHALL push a real-time event to the tutor via Socket.IO within 2 seconds.
2. THE notification payload SHALL include: student full name, student avatar URL, the `instant_price` (formatted in VND), the `instant_price_unit`, the Instant_Booking ID, and a countdown duration of 60 seconds.
3. THE frontend SHALL display a modal/popup to the tutor containing: student information, the instant price, "Chấp Nhận" (Accept) and "Từ Chối" (Decline) buttons, and a visible countdown timer starting from 60 seconds.
4. THE **System** SHALL also create a persistent in-app notification record in the `notifications` table (or equivalent) linked to the Instant_Booking.
5. WHEN a tutor is not currently connected via Socket.IO, THE **Notification_Service** SHALL store the notification persistently so the tutor sees it upon next connection. THE **System** SHALL automatically trigger the Timeout flow (Requirement 9) after 60 seconds regardless of tutor connectivity. Real-time missed notifications for connected tutors with device-level network issues are not stored persistently.

---

### Requirement 7: Tutor Accepts Instant Request

**User Story:** As a tutor, when I accept an instant session request, I want the system to automatically create the session and open a teaching environment, so that the student and I can start immediately.

#### Acceptance Criteria

1. WHEN a tutor clicks "Chấp Nhận" within the 60-second window, THE **System** SHALL update the Instant_Booking status from `Pending` to `Accepted` within a database transaction.
2. WITHIN the same transaction as step 1, THE **System** SHALL create a Teaching_Session record linked to the Instant_Booking.
3. WITHIN the same transaction as step 1, THE **System** SHALL update the Instant_Booking status from `Accepted` to `InProgress`.
4. THE **System** SHALL push a real-time Socket.IO event to the student notifying them that the tutor has accepted and the session is starting.
5. THE frontend SHALL automatically navigate both the student and tutor to the teaching session interface (chat and video call).
6. IF the tutor attempts to accept a booking that has already timed out or been declined, THEN THE **System** SHALL return HTTP 409 and message "Yêu cầu này không còn hiệu lực." and SHALL NOT modify any booking or wallet record.
7. THE **System** SHALL set `is_available_now = false` on the tutor's profile upon successful acceptance.

---

### Requirement 8: Tutor Declines Instant Request

**User Story:** As a tutor, when I decline an instant session request, I want the system to release the student's frozen funds immediately and mark the booking as declined, so that the student's money is returned without delay.

#### Acceptance Criteria

1. WHEN a tutor clicks "Từ Chối", THE **System** SHALL update the Instant_Booking status to `Declined` within a database transaction.
2. WITHIN the same transaction, THE **System** SHALL release the frozen `instant_price` from `held_balance` back to `balance` on the student's wallet using the existing `refund_escrow` logic.
3. WITHIN the same transaction, THE **System** SHALL record a `REFUND` transaction entry on the student's wallet.
4. THE **System** SHALL push a real-time Socket.IO event to the student notifying them the tutor has declined.
5. THE **System** SHALL restore `is_available_now = true` on the tutor's profile after a decline.
6. IF the database transaction fails, THEN THE **System** SHALL roll back all changes and SHALL attempt the refund again, logging the failure for admin review.

---

### Requirement 9: Tutor Timeout (No Response Within 60 Seconds)

**User Story:** As a student, if the tutor does not respond within 60 seconds, I want my frozen funds returned automatically and the booking marked as timed out, so that I am not left waiting indefinitely.

#### Acceptance Criteria

1. WHEN 60 seconds elapse after an Instant_Booking enters `Pending` status and the tutor has not responded, THE **System** SHALL automatically update the booking status to `Timeout`.
2. THE **System** SHALL release the frozen `instant_price` from `held_balance` back to `balance` on the student's wallet, using the existing `refund_escrow` logic, within the same transaction as the status update.
3. THE **System** SHALL record a `REFUND` transaction entry on the student's wallet.
4. THE **System** SHALL push a real-time Socket.IO event to the student informing them the request has timed out.
5. THE **System** SHALL restore `is_available_now = true` on the tutor's profile upon timeout.
6. THE timeout mechanism SHALL be implemented server-side (e.g., using `setTimeout` or a scheduled check) and SHALL NOT rely solely on the client countdown to trigger.
7. IF the tutor accepts or declines within the 60-second window before the server-side timeout fires, THEN THE **System** SHALL cancel the pending timeout and SHALL NOT perform a duplicate refund.

---

### Requirement 10: Session Completion and Fund Transfer

**User Story:** As a tutor, when a teaching session is completed, I want the frozen funds transferred to my wallet automatically, so that I receive payment for the session I provided.

#### Acceptance Criteria

1. WHEN a student confirms session completion (or the existing session completion flow is triggered), THE **System** SHALL update the Instant_Booking status to `Completed`.
2. WITHIN the same transaction, THE **System** SHALL release the `held_balance` from the student's wallet and transfer the `instant_price` to the tutor's wallet using the existing `release_escrow` PostgreSQL function.
3. THE **System** SHALL apply the platform commission rate (as configured in the existing system) and credit the remainder to the tutor's wallet.
4. THE **System** SHALL record a `RELEASED` transaction on the student's wallet and a `PAYMENT` transaction on the tutor's wallet.
5. IF the completion transaction fails, THEN THE **System** SHALL log the failure and retain the `held_balance` in escrow until an admin manually resolves the dispute.
6. AFTER completion, THE **System** SHALL update `is_available_now = true` on the tutor profile if the tutor has instant pricing configured.

---

### Requirement 11: Booking Status State Machine

**User Story:** As a developer/admin, I want the Instant_Booking status to follow a well-defined state machine, so that invalid status transitions are rejected and the system remains consistent.

#### Acceptance Criteria

1. THE **System** SHALL define the following valid Instant_Booking statuses: `Pending`, `Accepted`, `InProgress`, `Completed`, `Declined`, `Timeout`.
2. THE **System** SHALL only allow the following status transitions:
   - `Pending` → `Accepted` (tutor accepts)
   - `Accepted` → `InProgress` (session started)
   - `InProgress` → `Completed` (session completed)
   - `Pending` → `Declined` (tutor declines)
   - `Pending` → `Timeout` (60-second timeout)
3. IF a status update would result in an invalid transition, THEN THE **System** SHALL reject the update with HTTP 409 and message "Chuyển trạng thái không hợp lệ."
4. THE **System** SHALL store `booking_type = 'instant'` on all Instant_Bookings to distinguish them from normal scheduled bookings.
5. THE existing `bookings` table SHALL be extended with the `booking_type` column (default `'normal'`) and the new statuses if not already present.

---

### Requirement 12: Admin Monitoring (Read-Only)

**User Story:** As an admin, I want to view all instant booking history and their statuses in the admin dashboard, so that I can monitor activity and investigate issues without intervening in the automated flow.

#### Acceptance Criteria

1. THE **System** SHALL expose an admin-only API endpoint `GET /api/admin/instant-bookings` that returns a paginated list of all bookings where `booking_type = 'instant'`, protected by the existing `requireAdmin` middleware.
2. THE response SHALL include: booking ID, student name, tutor name, instant price, status, `created_at`, and `updated_at`.
3. THE **System** SHALL NOT provide any admin endpoint to approve or reject individual instant bookings, as the flow is fully automated.
4. WHERE the admin role is active, THE **System** SHALL display instant booking history in the Admin Dashboard under a "Instant Learning" section.

---

### Requirement 13: Duplicate Request Prevention and Race Condition Safety

**User Story:** As a system operator, I want the instant booking flow to be safe under concurrent requests, so that a student cannot freeze funds twice and a tutor cannot accept the same request twice.

#### Acceptance Criteria

1. THE **System** SHALL use `SELECT ... FOR UPDATE` on both the student's wallet row and the Instant_Booking row during any status update to serialize concurrent access.
2. IF two simultaneous requests attempt to create an Instant_Booking for the same student-tutor pair while one is already `Pending`, THEN THE **System** SHALL reject the second request with HTTP 409.
3. THE **System** SHALL use database transactions for all operations that touch both the `wallets` table and the `bookings` table, ensuring atomicity.
4. THE **System** SHALL implement an idempotency check on the instant booking creation endpoint: if an identical request (same student, same tutor, within 5 seconds) is received twice, THE **System** SHALL return the existing booking record regardless of whether the previous attempt succeeded or failed.

---

### Requirement 14: Frontend State and Error Handling

**User Story:** As a student or tutor, I want the frontend to show appropriate loading states, error messages, and real-time status updates throughout the instant learning flow, so that I always know what is happening.

#### Acceptance Criteria

1. WHEN a student clicks "Học Ngay", THE frontend SHALL display a loading indicator until the backend confirms the booking is created or returns an error.
2. WHEN the student's balance is insufficient or a payment-related error occurs during the booking initiation, THE frontend SHALL display the message "Số dư không đủ. Vui lòng nạp thêm tiền." and SHALL provide a direct link to the wallet deposit page.
3. WHEN the tutor has accepted and the session is starting, THE frontend SHALL automatically navigate the student to the teaching session interface without requiring a manual page refresh.
4. WHEN the tutor declines, THE frontend SHALL display the message "Gia sư đã từ chối yêu cầu của bạn." to the student and SHALL close any pending confirmation modals.
5. WHEN the request times out, THE frontend SHALL display "Gia sư không phản hồi. Tiền đã được hoàn lại vào ví của bạn." to the student.
6. WHEN a tutor receives an instant session request, THE frontend SHALL render the Accept/Decline modal on top of any currently active view without requiring a page reload.
7. THE **System** SHALL ensure that all Socket.IO event listeners are cleaned up when a component unmounts to prevent memory leaks.

