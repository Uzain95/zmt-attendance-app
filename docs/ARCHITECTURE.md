# ZMT Attendance App Architecture

Preferred stack: React Native with Expo development build, Expo Router, Zustand, React Native Paper, Expo Location and TaskManager, Expo SQLite, NetInfo.

## Current architecture goals

- Support 33 clinic locations in one mobile workspace.
- Enforce strict RBAC for Employee, HR, and Superadmin roles.
- Keep attendance automation geofence-first with no Wi-Fi dependency.
- Preserve offline-safe attendance syncing for unreliable network conditions.
- Support field visit mode so employees can move between clinics without false check-out events.

## Folder structure

```text
app/
  _layout.tsx
  index.tsx
  (auth)/
    _layout.tsx
    login.tsx
  (app)/
    _layout.tsx
    dashboard.tsx
    attendance-calendar.tsx
    leave-management.tsx
    profile-settings.tsx
    hr-attendance-overview.tsx
    hr-leave-anomalies.tsx
    superadmin-clinic-management.tsx
    superadmin-geofence-control.tsx
src/
  components/
    navigation/
      app-drawer-content.tsx
      app-menu-header.tsx
    swipe-action.tsx
  constants/
    clinics.ts
    navigation.ts
    office.ts
  screens/
    dashboard-screen.tsx
    attendance-calendar-screen.tsx
    leave-management-screen.tsx
    profile-settings-screen.tsx
    hr-attendance-overview-screen.tsx
    hr-leave-anomalies-screen.tsx
    superadmin-clinic-management-screen.tsx
    superadmin-geofence-control-screen.tsx
  services/
    api/
      attendance-api.ts
    attendance/
      attendance-service.ts
    auth/
      auth-api.ts
      biometric-auth.ts
      session-storage.ts
    background/
      geofencing.ts
    offline/
      offline-queue.ts
  store/
    auth-store.ts
    attendance-store.ts
    clinic-store.ts
  types/
    auth.ts
    attendance.ts
    clinic.ts
```

## Architectural decisions

- Role-aware routing is handled in `app/(app)/_layout.tsx`, with role menus defined centrally in `src/constants/navigation.ts`.
- Employee, HR, and Superadmin flows each land on different default routes and see different sidebar modules.
- Clinic metadata and geofence configuration live in `clinic-store.ts`, separate from attendance state, so clinic administration and attendance events can evolve independently.
- Attendance events, background geofence transitions, manual fallback, and field visit actions all write through the same `attendance-service.ts` entry point.
- `attendance-store.ts` now carries both employee state and management datasets such as leave requests, clinic snapshots, and anomaly queues.
- Geofence automation registers the home clinic first and then the nearest accessible clinics when the OS region cap is lower than the total allowed clinic count.

## Automation model

- Primary trigger: background geofences.
- Secondary trigger: foreground presence reconciliation using current GPS position.
- Removed: Wi-Fi SSID based attendance logic.
- Field Visit mode blocks false automatic check-out while an employee travels to another clinic.

## OS notes

- iOS background monitoring is limited to 20 regions, so clinic registration must be prioritized dynamically.
- Android callbacks may be delayed by Doze or vendor battery policies, so events are persisted locally first and synced later.
- Biometric auth is only a local unlock control and does not replace backend session validation.