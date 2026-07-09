Add a tour-booking and payment flow to RoomRadar, with precise map location gated behind a confirmed, paid booking. Additive only — do not modify the ML model, existing auth, listings CRUD, or bidding, except the specific listing-serialization change described under "Location gating." After each step run npm run build and keep it green. Match existing design tokens (teal #0e6e6e, warm #ea8b47, Fraunces headings) and mirror the existing controller/route/Zod patterns in the repo (controllers/, app/api/, lib/validations.ts, lib/constants.ts).
Business logic (read carefully — payment timing is deliberate):

A seeker requests a tour on a listing, choosing a preferred date/time. No charge at request time.
Multiple seekers may have PENDING requests on the same listing at once — expected.
The owner sees all pending requests in their dashboard and confirms one. Only on confirmation is the chosen seeker prompted to pay the booking fee (BOOKING_FEE_NPR = 300) via eSewa. Non-selected seekers are never charged — no refunds ever.
On owner confirm, also record the platform commission = COMMISSION_RATE (0.05) × listing rent, as a DUE record (honest business-model line, not force-collected).
The confirmed seeker pays → booking becomes fully active and the precise map location unlocks for that seeker.
If the confirmed seeker doesn't pay within CONFIRM_HOLD_HOURS (default 24), the confirmation lapses (lazy check on read is fine — no cron) so the owner can pick someone else.

Data model (Prisma — new models, migration add_bookings):

Booking: id, listingId (→Listing), seekerId (→User), tourDate (DateTime), status (PENDING|CONFIRMED|DECLINED|COMPLETED), bookingFee (Int), paymentStatus (UNPAID|AWAITING_PAYMENT|PAID), paymentRef (String?), confirmedAt (DateTime?), createdAt, updatedAt.
Commission: id, bookingId (→Booking), listingId, amount (Int = round(0.05×rent)), status (DUE|PAYABLE|WAIVED), createdAt.
Notification: id, userId (→User), type (TOUR_REQUEST|TOUR_CONFIRMED_PAY|TOUR_PAID|TOUR_DECLINED), message, bookingId?, read (Boolean=false), createdAt.
Add reverse relations on User and Listing; sensible onDelete: Cascade.

Location gating (the map lock) — implement server-side:

Add a helper lib/location.ts → visibleLocation(listing, viewerBookingState) returning either the exact {lat,lng, precise:true} or an approximate {lat,lng, precise:false}. For approximate, use the listing's area center from AREA_COORDS in lib/constants.ts (fallback: round the real coords to ~3 decimals / jitter within ~400m).
Every listing API response and server-rendered listing must pass coordinates through this helper. Locked (default) → approximate only; the real lat/lng must not be sent to the client. Unlocked → exact, only when the viewer is: the seeker on a CONFIRMED + PAID booking for that listing, OR the listing's owner, OR an admin.
Add a boolean locationUnlocked to the serialized listing so the UI knows which state to render.

Payment abstraction (make eSewa swappable):

lib/payments/esewa.ts → initiatePayment({amount, bookingId}) and verifyPayment(ref). Env flag PAYMENT_MODE = mock | sandbox, default mock.
mock: initiatePayment returns instant success with a generated paymentRef — the demo never needs network.
sandbox: implement the real eSewa ePay v2 UAT flow (signed redirect + a app/api/payments/esewa/callback/route.ts that verifies and marks the booking PAID). Look up eSewa's current ePay v2 UAT endpoint, required fields, and HMAC signature method from eSewa's official developer docs before coding; if uncertain, keep it behind the flag and leave mock default so the app always runs.

API routes → thin handlers calling controllers (bookingController.ts, notificationController.ts); use a DB transaction wherever a status change also writes a commission/notification:

POST /api/listings/[id]/book (seeker, auth): validate bookingSchema (tourDate); create Booking PENDING/UNPAID; notify owner (TOUR_REQUEST). No payment. Multiple pending allowed.
PATCH /api/bookings/[id] action=confirm|decline|complete (listing owner or admin; re-check server-side):

confirm → CONFIRMED + paymentStatus=AWAITING_PAYMENT + confirmedAt=now; create Commission(DUE); notify seeker (TOUR_CONFIRMED_PAY).
decline → DECLINED.
complete → COMPLETED; commission → PAYABLE; auto-set the listing's other PENDING bookings to DECLINED.


POST /api/bookings/[id]/pay (the confirmed seeker only): initiatePayment; on success paymentStatus=PAID, notify owner (TOUR_PAID). This is the action that unlocks the map for that seeker.
GET /api/notifications + PATCH /api/notifications/[id] (mark read).
Lazy expiry: on any read of a CONFIRMED/AWAITING_PAYMENT booking older than CONFIRM_HOLD_HOURS, revert to allow re-confirmation.

UI (reuse existing Card/Button/Badge, npr(), and the bidding status-chip style):

Listing detail map: if locationUnlocked is false, render a shaded circle over the area (Leaflet Circle centered on the approximate point, radius ~400m) with an overlay label "Exact location unlocks after your tour booking is confirmed and paid." If true, render the precise marker. Never rely on CSS to hide a real pin — the exact coords must simply not be in the payload when locked.
Listing detail: "Request a tour" button (seekers only, not the owner) → date/time modal → posts to book → "Tour requested — you'll only pay if the owner confirms."
Navbar: bell icon with unread notification count.
Owner dashboard /dashboard/bookings: list pending requests per listing with Confirm/Decline; on confirm show the generated 5% commission line and that the seeker has been asked to pay.
Seeker /bookings: their requests with statuses; when a booking is CONFIRMED/AWAITING_PAYMENT, show a "Pay Rs 300 to lock your tour & unlock exact location" button → /api/bookings/[id]/pay; after paying, the listing's map shows the precise pin.
Earnings/commission summary (owner + admin): totals of DUE/PAYABLE, labelled "platform commission (5%)". Honest copy: booking fee collected in-app on confirmation; commission recorded as business model.

Constants (lib/constants.ts): BOOKING_FEE_NPR = 300, COMMISSION_RATE = 0.05, CONFIRM_HOLD_HOURS = 24, APPROX_RADIUS_M = 400.
Build order: (1) schema + migration; (2) constants + Zod bookingSchema; (3) lib/location.ts + wire the gating into listing serialization (verify locked responses contain no exact coords); (4) payment abstraction in mock mode; (5) booking + notification controllers/routes; (6) UI: request → notify → confirm → pay → map unlock; (7) commission/earnings view; (8) npm run build + manually test the full loop in mock mode; (9) only then try sandbox eSewa behind the flag. Update README with the flow, PAYMENT_MODE, the location-gating design, and the honest note (booking fee collected in-app; 5% commission recorded on confirmation; location gating discourages but can't fully prevent offline bypass).
Acceptance:

5 seekers request tours on one listing → zero charges; map shows only the area circle for all of them.
Owner confirms one → only that seeker gets a pay prompt + commission recorded; others never charged, auto-DECLINED on completion.
Confirmed seeker pays (mock) → their view unlocks the precise pin; everyone else still sees the circle.
Locked API responses provably omit exact coordinates (check the network payload).
npm run build passes; ML, bidding, auth, and other pages unaffected.


For your defence
This gives you a genuinely strong story to tell:

"The precise location is gated server-side behind a confirmed, paid booking — browsers see only an area circle. This adds value to paying through the platform and discourages people from bypassing us to transact offline. It doesn't make bypass impossible, but it removes the free exact-address that makes bypass easy."

That's mature product thinking, and the "server-side, not just CSS" detail is exactly the kind of security-aware point that impresses examiners.