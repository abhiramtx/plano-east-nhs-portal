# VolunteerClub.io - Volunteer Territory Game Platform

## Overview

VolunteerClub.io is a gamified volunteer tracking platform designed to enable clubs to compete for territory by logging volunteer hours. The platform features Firebase Authentication for secure access and Firestore for all data storage. Key capabilities include a world map visualization with service request markers, comprehensive leaderboards, and territory mechanics where clubs expand their territory based on logged hours. Volunteers can join clubs, log hours, create and join service requests, and track their contributions globally. The application supports separate interfaces for volunteers and administrators, offering a complete solution for managing volunteer activities and fostering competition. The business vision is to create an engaging and competitive environment to encourage volunteerism and community involvement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled by Vite.
- **UI/UX**: shadcn/ui component library built on Radix UI, styled with Tailwind CSS (light mode).
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
- **Service Requests**: Creation and joining of volunteer opportunities, including location-based matching.
- **World Map**: Interactive visualization of club territories and service request pins using MapLibre GL. Territories grow logarithmically based on volunteer hours.
- **Leaderboards**: Global club rankings integrated with the territory map.
- **Club System**: Functionality to join or create clubs, manage members, and track collective hours.
- **Admin Features**: Full administration capabilities for managing submissions, users, and database operations (e.g., archiving, wiping data).

### Database Layer
- **Primary Database**: Firebase Firestore.
- **Collections**: `clubs`, `memberships`, `submissions`, `serviceRequests`, `serviceRequestParticipants`, `settings`, `users`, `yearlyArchives`.
- **Security**: Relies on Firebase security rules for authorization, with client-side verification for user-specific actions.

### UI System
- **Design System**: shadcn/ui "new-york" style with CSS variables for theming.
- **Icons**: Lucide React.
- **Responsiveness**: Mobile-first design with adaptive breakpoints.

## External Dependencies

- **Authentication**: Google OAuth (via Firebase Authentication).
- **Mapping**: MapLibre GL (used by react-map-gl) for interactive world map; Nominatim API for location search autocomplete.
- **UI Components**: Radix UI primitives, shadcn/ui.
- **Styling**: Tailwind CSS.
- **Data Fetching/State Management**: TanStack Query.
- **Validation**: Zod.
- **Icons**: Lucide React.