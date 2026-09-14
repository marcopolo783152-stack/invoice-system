# Appointment rollout — not production ready

This branch adds 30-minute reservations per employee (existing Nazif and Farid options),
10:00–18:00 daily, excluding 13:30–14:00, in America/New_York.

## Required before merging
- Verify a real Firebase-authenticated owner with a showroom_roles/{uid} admin document.
  The existing password bypass does not grant Firebase permissions.
- Compare the deployed Firestore rules with this repository before deploying anything.
  Do not blindly replace production rules: the existing rule file omits other application collections.
- Migrate every future active legacy appointment to a deterministic slot lock:
  staffId_YYYY-MM-DD_HH:mm. Resolve overlapping legacy records first.
  Legacy appointments without slotId are not automatically protected by the new locks.
- Deploy the reviewed appointment rule changes and configure any requested query index.
- Test on an isolated Firebase project or emulator: two simultaneous reservations for the
  same employee/time must result in one booking; different employees must both succeed.
- Check rejected/deleted appointments release only their own lock; re-accepting a rejected
  appointment must fail when another customer now owns the slot.
- Test 10:00, 13:00, 13:30, 14:00, 17:30, past times, daylight-saving transitions,
  unavailable database, and browser refresh.
- Add server-side abuse controls and server-authoritative future-date validation before
  public rollout. Current rules enforce allowed slot labels and atomic locks; past-time
  validation is currently in the client.
- Email delivery, staff account invitations, shared-login migration, and AI handoff are
  not implemented by this appointment change.

No live rules, owner roles, credentials, or customer records were changed.
