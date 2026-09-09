# ZMT Attendance App Features

## 1. Overview

ZMT Attendance App ab ek enterprise multi-clinic workforce platform ke shape me refactor ho chuka hai. App 33 clinic locations, role-based access control, dynamic geofencing, field visits, HR review flows, aur superadmin clinic management ko support karta hai.

## 2. Role-Based Workspaces

### 2.1 Employee Workspace

- Dashboard
- Attendance Calendar
- Leave Management
- Profile & Settings

Employee focus:

- Daily check-in and check-out
- Field visit start and end
- Personal attendance history
- Personal leave requests
- Personal automation status

### 2.2 HR Workspace

- HR Attendance Overview
- Leave & Anomalies
- Profile & Settings

HR focus:

- Multi-clinic staffing visibility
- Open anomaly queue handling
- Pending leave approvals
- Region-scoped clinic operations

### 2.3 Superadmin Workspace

- Clinic Management
- Geofence Control
- Profile & Settings

Superadmin focus:

- Clinic onboarding and updates
- Activate or deactivate clinic locations
- Latitude, longitude, and radius tuning
- Enterprise-wide clinic visibility

## 3. Authentication Flow

- Work email and password login
- Microsoft sign-in style flow
- Biometric preference at sign-in
- Secure session persistence using device secure storage
- Returning user biometric unlock
- Demo account mapping by email for Employee, HR, and Superadmin previews

## 4. Attendance Features

### 4.1 Manual Attendance

- Swipe-to-check-in
- Swipe-to-check-out
- Manual events still go through the shared attendance service

### 4.2 Dynamic Geofencing

- Geofence-first attendance automation
- Clinic-specific geofence coordinates and radius
- Dynamic registration of allowed clinics
- Home clinic pinned first
- Nearest clinics prioritized when OS geofence limit is lower than total clinic count
- Wi-Fi dependency removed entirely

### 4.3 Field Visit Workflow

- Employee assigned clinic list se destination choose kar sakta hai
- Field Visit mode start kar sakta hai
- Geofence exit par false check-out avoid hota hai
- Visit complete hone par employee field visit end kar sakta hai
- Attendance history me field visit stops visible rehte hain

### 4.4 Presence Reconciliation

- Foreground GPS check
- Current coordinates ke basis par clinic detection
- Need ho to automatic check-in or check-out correction

## 5. HR Operations Features

- Company or region-level clinic staffing cards
- Checked-in headcount summary
- Field visit count summary
- Pending leave count summary
- Open anomaly count summary
- Leave approve and reject actions
- Attendance anomaly resolution

## 6. Superadmin Features

- New clinic creation form
- Existing clinic update form
- Clinic activation and deactivation
- Clinic search and operational metadata review
- Geofence coordinate editor per clinic
- Radius adjustment per clinic

## 7. Offline-First Features

- Attendance events offline queue me store hote hain
- SQLite queue persistence
- Connectivity wapas aane par auto sync
- Manual sync trigger
- Retry count tracking
- Pending sync count UI me visible

Database details:

- Database: `zmt-attendance.db`
- Table: `attendance_queue`

## 8. Profile & Settings Features

- Job title display
- System role display
- Assigned clinic count
- Registered geofence count
- Permission state
- Automation enable button
- Manual sync button
- Sign out button

## 9. Navigation Model

- Custom sidebar retained
- Sidebar items role ke hisaab se change hote hain
- Unauthorized routes automatically redirect ho jate hain
- Har role ka default landing route alag hai

## 10. Security and Session Features

- SecureStore based session persistence
- Biometric preference persistence
- Biometric unlock for returning users
- Role payload session me stored rehta hai

## 11. Data Model Highlights

- User object me role, job title, home clinic, aur assigned clinic IDs stored hain
- Attendance event payload me clinic ID support hai
- Leave request me employee aur clinic context stored hai
- Attendance anomaly model HR workflows ke liye add kiya gaya hai
- Clinic model me geofence configuration included hai

## 12. Current Demo Role Emails

- Employee: `ada.okafor@zmt.example.com`
- HR: `hr.operations@zmt.example.com`
- Superadmin: `superadmin@zmt.example.com`

Current app navigation third-party drawer export par runtime dependency ke bina custom sidebar overlay ke through kaam karti hai.

Benefits:

- Clean menu experience
- Dedicated workflow separation
- Reduced dashboard clutter
- Better route discoverability

### 7.2 Transition Behavior

- Route transitions fade animation ke saath configured hain
- Main app background theme-consistent hai
- Drawer overlay modal-style experience use karta hai

### 7.3 Updated Branding

App me lighter teal aur blue based palette apply ki gayi hai.

Brand direction:

- Dark green-heavy look reduce kiya gaya
- Soft teal + blue tones use kiye gaye
- Lighter cards and surfaces
- Refined enterprise visual hierarchy

## 8. API / Backend Integration Features

### 8.1 Attendance API Support

Attendance events remote backend par send kiye ja sakte hain.

Endpoint group:

- `/attendance/events`

### 8.2 Leave API Structure Present

Codebase me leave API request helper present hai.

Endpoint group:

- `/leave/requests`

Note:

- Current leave screen submission UI store update karti hai
- Leave backend transport helper defined hai, lekin current screen flow me direct use nahi ho raha

### 8.3 Base URL

API base URL env variable se li ja sakti hai:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

Map note:

- Android and iOS map views use Google Maps native SDK configuration
- `react-native-maps` screens need a valid Google Maps API key in Expo config
- Place search in geofence control uses OpenStreetMap Nominatim and does not need its own API key

Fallback default:

- `https://api.zmt.example.com/v1`

## 9. State Management Features

App Zustand-based state management use karta hai.

### 9.1 Auth Store

Managed state:

- Hydration status
- Authentication status
- Busy/loading status
- Biometric enabled status
- Stored session availability
- Current user
- Current auth provider

### 9.2 Attendance Store

Managed state:

- Employee identity for UI
- Today status
- Session start/end
- Hours worked today
- Pending sync count
- Sync status
- Automation enabled/permission state
- Last attendance event tracking
- Attendance history
- Leave requests

## 10. Data Model Features

Attendance domain supports:

- Event kind
  - `check_in`
  - `check_out`
- Event source
  - `manual`
  - `geofence-enter`
  - `geofence-exit`
  - `wifi`
  - `reconciliation`
- Daily status
  - `present`
  - `late`
  - `absent`
  - `leave`

Leave domain supports:

- Types: Sick, Casual, Annual
- Status: Pending, Approved, Rejected

## 11. Runtime Services

App startup par ye bootstrap services run hote hain:

- Auth hydration
- Offline queue initialization
- Queued attendance synchronization
- Automation runtime state fetch
- Network listener-based auto sync

## 12. Current Functional Notes / Limitations

Ye points current implementation samajhne ke liye important hain:

- Password login currently mocked/demo style flow use karta hai
- Microsoft login bhi simulated session return karta hai
- Leave requests currently UI/store level par persist hoti hain
- Geofencing test karne ke liye emulator/device location movement required hai
- Wi-Fi detection supporting signal hai, primary background trigger nahi

## 13. Quick Testing Checklist

### Login

- Valid email + password enter karo
- Sign In press karo
- Microsoft button test karo
- Biometric preference toggle test karo

### Dashboard

- Manual swipe check-in test karo
- Swipe check-out test karo
- Pending sync count dekho

### Calendar

- Date dots verify karo
- Historical rows verify karo

### Leave

- Naya leave request create karo
- History list update verify karo

### Automation / Geofencing

- Profile & Settings me jao
- Enable automation press karo
- Background location allow karo
- Emulator location office region ke bahar aur andar move karo

### Offline Sync

- Internet band karke attendance action trigger karo
- Pending sync count verify karo
- Internet on karke sync verify karo

## 14. Important Files Reference

Feature mapping ke liye useful files:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [app/_layout.tsx](app/_layout.tsx)
- [app/(app)/_layout.tsx](app/(app)/_layout.tsx)
- [src/screens/login-screen.tsx](src/screens/login-screen.tsx)
- [src/screens/dashboard-screen.tsx](src/screens/dashboard-screen.tsx)
- [src/screens/attendance-calendar-screen.tsx](src/screens/attendance-calendar-screen.tsx)
- [src/screens/leave-management-screen.tsx](src/screens/leave-management-screen.tsx)
- [src/screens/profile-settings-screen.tsx](src/screens/profile-settings-screen.tsx)
- [src/services/background/geofencing.ts](src/services/background/geofencing.ts)
- [src/services/attendance/attendance-service.ts](src/services/attendance/attendance-service.ts)
- [src/services/offline/offline-queue.ts](src/services/offline/offline-queue.ts)
- [src/store/auth-store.ts](src/store/auth-store.ts)
- [src/store/attendance-store.ts](src/store/attendance-store.ts)

## 15. Summary

Current ZMT Attendance App ke major implemented feature pillars ye hain:

- Authentication and secure session handling
- Custom sidebar-based multi-screen workspace
- Daily dashboard with manual attendance fallback
- Dedicated attendance calendar screen
- Dedicated leave management screen
- Dedicated profile and automation settings screen
- Geofencing-based attendance automation
- Offline queue and network-based sync recovery
- Biometric unlock support
- Refreshed teal-blue branded UI