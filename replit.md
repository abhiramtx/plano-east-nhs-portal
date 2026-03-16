# VolunteerClub.io - Volunteer Territory Game Platform

## Overview

VolunteerClub.io is a gamified volunteer tracking platform designed to enable clubs to compete for territory by logging volunteer hours. The platform features Firebase Authentication for secure access and Firestore for all data storage. Key capabilities include a world map visualization with service request markers, comprehensive leaderboards, and territory mechanics where clubs expand their territory based on logged hours. Volunteers can join clubs, log hours, create and join service requests, and track their contributions globally. The application supports separate interfaces for volunteers and administrators, offering a complete solution for managing volunteer activities and fostering competition. The business vision is to create an engaging and competitive environment to encourage volunteerism and community involvement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled by Vite.
- **UI/UX**: shadcn/ui component library built on Radix UI, styled with Tailwind CSS (complete light mode theme).
- **Theme**: Full light mode design with white backgrounds, gray-100/200 borders, gray-900 text, gray-500/600 secondary text.
- **Authentication**: Firebase Authentication with Google OAuth.
- **State Management**: TanStack Query for server state, React state for UI.
- **Form Management**: React Hook Form with Zod validation.

### Backend Architecture
- **Framework**: Express.js for a minimal backend.
- **Database**: Firebase Firestore is the primary data store for all features (volunteer and admin).
- **API Pattern**: RESTful API with Zod for request/response validation.

### Key Features
- **Dashboard**: Overview of service hours and statistics.
- **Hours Management**: Submission, viewing, editing, and deletion of service hours with image proof.
- **Hours Logs**: Named tracking periods (e.g., "Fall Semester") with hours requirements. Admins create/edit/toggle logs in Settings > Logs. Volunteers see open logs as tabs and submit hours to specific logs. Admin filters and CSV export include per-log met/not-met status.
- **Query History (Admin)**: Admins can search any club member by name/email and see their complete archived history (all periods, clubs, stats, and full submission details with images, descriptions, and partnerships).
- **Grouped Navigation**: Both volunteer and admin sidebars use section headers (e.g., Home/Community/Partners/History/Profile for volunteers; Overview/Data/Events/Admin for admins).
- **Service Requests**: Creation and joining of volunteer opportunities, including location-based matching.
- **World Map**: Interactive visualization of club territories and service request pins using MapLibre GL. Territories grow logarithmically based on volunteer hours.
- **Leaderboards**: Global club rankings integrated with the territory map.
- **Club System**: Functionality to join or create clubs, manage members, and track collective hours.
- **Admin Features**: Full administration capabilities for managing submissions, users, and database operations (e.g., archiving, wiping data).

### Database Layer
- **Primary Database**: Firebase Firestore.
- **Collections**: `clubs`, `memberships`, `submissions`, `serviceRequests`, `serviceRequestParticipants`, `settings`, `users`, `yearlyArchives`, `hoursLogs`.
- **Security**: Relies on Firebase security rules for authorization, with client-side verification for user-specific actions.

### UI System
- **Design System**: shadcn/ui "new-york" style with CSS variables for theming.
- **Theme Colors**: Complete light mode - white backgrounds, gray-100/200 borders, gray-900 text, gray-500/600 secondary text.
- **Icons**: Lucide React.
- **Responsiveness**: Mobile-first design with adaptive breakpoints.
- **Map Style**: CARTO Positron (https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json)

### Territory System (Per-Location)
- **Per-Location Circles**: Each volunteer hour submission can include a location. Circles grow independently at each location based on hours logged there.
- **Radius Formula**: Base 4 miles + (16 miles range) * min(1, log₁₀(hours+1) / log₁₀(1000))
- **Range**: 4-20 miles radius based on approved hours at that specific location
- **Metaball Physics**: When circles from the same club are close (within 1.5x combined radii), they merge visually using metaball-style blending
- **Decay System**: Circles decay by 0.25 miles per week of inactivity, capped at 10% of the circle's highest radius
- **Location Capture**: Hours submission form includes optional location search using Nominatim API
- **Rendering**: GeoJSON polygons with hex colors and separate opacity properties (MapLibre doesn't support rgba() strings in data-driven styling)

### Events System
- **Types**: Open (no auth), Password-protected, scan_qr (admin scans volunteer QR), show_qr (admin displays sign-in/sign-out codes)
- **Time Tracking**: QR events record check-in/check-out times; attendance duration used for conditional hours granting
- **Conditionals**: Rules like "less than / exactly / more than X hours → grant Y hours" applied when granting hours
- **Grant Hours**: Admins can grant hours to all attendees or select individual volunteers, with per-person overrides
- **Volunteer QR**: Each volunteer has a personal QR code (email encoded) for scan_qr events

### Partnerships System (v2 - Reversed Affiliation Flow)
- **Purpose**: External organizations (food banks, businesses, nonprofits) can register as Partnerships to receive volunteer hours from any club's members without those members joining the org
- **Affiliation Flow (reversed)**: Partnerships REQUEST to affiliate with clubs (not the other way). Partnership owners search clubs and send a request. Club admins respond (approve/reject) in Settings > Partnerships tab
- **No requireApproval toggle**: Removed from partnership settings UI (field kept in DB for legacy)
- **Partnership Logos**: Partnerships and clubs both support logo image upload (base64, max 2MB, stored in Firestore). Logo shown in list cards, manage header, etc.
- **Admin Dashboard**: Partnership owners get full management (events, volunteers, affiliations, settings tabs). Affiliations tab shows outgoing requests + approved clubs
- **Hours Form**: Volunteers can submit hours to "My Club" or "A Partnership" from the hours submission form

### Admin Settings Reorganization (v2)
- Tabs: Club | Members | Logs | Approvals | Territory | Partnerships
- **Club**: Name, description, color, club logo upload, home base location (lat/lng), optional password — all saved via `updateClub()`
- **Members**: Profile field visibility toggles + custom fields
- **Logs**: Hours tracking periods management
- **Approvals**: Multi-admin approval/rejection threshold configuration
- **Territory**: Decay rate, max decay floor, high-need bonus multiplier + formula reference
- **Partnerships**: Shows incoming affiliation requests from partnerships (approve/reject). Shows currently affiliated partnerships

### Grant Hours (Admin)
- Admins can grant hours directly from the Volunteers tab
- Special submissions tagged "Granted by Admin" with a badge in the submission list
- Inline edit of existing submission hours

## External Dependencies

- **Authentication**: Google OAuth (via Firebase Authentication).
- **Mapping**: MapLibre GL (used by react-map-gl) for interactive world map; Nominatim API for location search autocomplete.
- **UI Components**: Radix UI primitives, shadcn/ui.
- **Styling**: Tailwind CSS.
- **Data Fetching/State Management**: TanStack Query.
- **Validation**: Zod.
- **Icons**: Lucide React.