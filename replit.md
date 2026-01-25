# VolunteerClub.io - Volunteer Territory Game Platform

## Overview

VolunteerClub.io is a gamified volunteer tracking platform where clubs compete for territory by logging volunteer hours. The application features Firebase Authentication and Firestore for all data storage, a world map visualization with service request markers, comprehensive leaderboards, and territory mechanics. Volunteers can join clubs, log hours, create and join service requests, and compete globally. The application is structured with separate volunteer interface and admin interface routes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Structure
- `client/` - React frontend application with authentication UI
- `server/` - Express backend (minimal setup for Replit hosting)

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite for fast development and optimized builds
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light mode only)
- **Authentication**: Mock Google OAuth with localStorage persistence
- **State Management**: TanStack Query for server state, React state for UI state
- **Form Management**: React Hook Form with Zod validation
- **File Upload**: Base64 encoding for image proof storage (mock implementation)

### Key Features
- **Dashboard**: Overview of service hours with statistics and monthly chart
- **Hours Submission**: Form to submit service hours with proof images
- **Hours Management**: View, edit, and delete submitted hours
- **Service Requests**: Create and join volunteer service opportunities with location markers
- **World Map**: Interactive territory visualization with club markers and service request pins
- **Leaderboards**: Global club rankings with territory mechanics
- **Club System**: Join or create clubs, manage members, track collective hours
- **Authentication**: Google sign-in via Firebase Authentication
- **Navigation**: Clean navigation between dashboard, hours, service requests, and map pages
- **Responsive Design**: Mobile-friendly UI with proper breakpoints

## Key Components

### Database Layer
- **Primary**: Firebase Firestore for ALL data (volunteer and admin features)
- **Collections**: clubs, memberships, submissions, serviceRequests, serviceRequestParticipants, settings, users, yearlyArchives
- **Legacy**: Drizzle ORM with PostgreSQL (no longer used for admin features)
- **Schema**: Firebase types in `client/src/lib/firebase.ts`, PostgreSQL in `shared/schema.ts`

### Security Considerations
- Service request participant management enforces creator-only access via authenticated user verification
- Note: For production, Firestore security rules should be configured in Firebase Console to enforce server-side authorization
- Hours awarding and participant removal require matching authenticated user email with request creator

### Authentication System
- **Provider**: Firebase Authentication
- **Methods**: Google OAuth with redirect flow
- **State Management**: React hooks for auth state tracking
- **Error Handling**: Toast notifications for auth errors

### UI System
- **Design System**: shadcn/ui with "new-york" style variant
- **Components**: Comprehensive set of accessible components
- **Theming**: CSS variables with light/dark mode support
- **Icons**: Lucide React icon library
- **Responsive**: Mobile-first design with responsive breakpoints

### API Layer
- **Pattern**: RESTful API with Express
- **Validation**: Zod schemas for request/response validation
- **Error Handling**: Centralized error middleware
- **Logging**: Custom request logging with timing
- **CORS**: Configured for cross-origin requests

## Recent Changes

### January 25, 2026 - Admin Pages Firebase Migration
- **Complete Migration**: All admin pages now use Firebase Firestore instead of PostgreSQL API calls
- **Admin Dashboard**: Uses getAllSubmissions and getAllUserProfiles from Firebase
- **Admin Students**: Uses Firebase for member management and submission review
- **Admin Approval**: Uses getAdminAssignment with skip functionality for rotating through pending submissions
- **Admin Management**: Uses getAdminProfiles, promoteToAdmin, removeAdminRole for admin user management
- **Admin Database**: Uses archiveYearData, wipeDatabase, removeDemoData with date restrictions (May 1st - August 1st)
- **New Firebase Functions**:
  - getAllSubmissions() - retrieve all submissions
  - getAllUserProfiles() - retrieve all user profiles
  - getAdminProfiles() - retrieve users with admin role (userRole === 1)
  - promoteToAdmin(email) - promote user to admin
  - removeAdminRole(email) - remove admin privileges
  - getAdminAssignment(email, skipEmails) - get next student with pending submissions
  - getPendingSubmissionsForUser(email) - get pending submissions for a user
  - archiveYearData(schoolYear) - archive year data to yearlyArchives collection
  - wipeDatabase() - delete all submissions
  - removeDemoData() - remove demo users and their data
- **Query Keys**: All admin queries now use 'firebase-' prefixed keys for consistent cache invalidation

### January 24, 2026 - Territory Game System & Map Upgrade
- **Map Library Upgrade**: Switched from react-simple-maps to react-map-gl with MapLibre GL for Google Maps-like rendering
- **Map Style**: Using CARTO Dark Matter (no labels) for clean territory visualization
- **Territory System**: Clubs now display as shaded circular regions that grow based on volunteer hours
  - Territory radius formula: sqrt(totalHours) * 30 + 50 km
  - Territories rendered as GeoJSON polygons with club color fill (35% opacity) and border
  - Overlapping territories create visual competition between clubs
- **Club Markers**: Center pin with Users icon, glow effect, hover tooltip showing name and hours
- **Service Requests**: White map pins for opportunities, green when joined

### January 24, 2026 - Major UI/UX Redesign
- **Landing Page Redesign**: Complete overhaul with:
  - 100vh sections with smooth scroll navigation
  - Black background with gradient accents and parallax effects
  - Scroll animations using IntersectionObserver
  - Animated hero section with gradient text
- **Club Selection Page Reorganization**:
  - Tabbed interface separating Clubs vs Service Requests
  - Dark theme with glassmorphism cards
  - Integrated service request browsing and joining
- **World Map Improvements**:
  - Enhanced territory visualization with glow effects and pulsing animations
  - Hover states and club tooltips
  - Dark theme with improved contrast
  - Fixed drag/click detection for better UX
- **My Requests Page**: New dedicated page for managing created service requests
  - Full CRUD for service requests
  - Participant management with stats (total, pending, completed)
  - Award hours and kick participants
  - Form validation for required fields
- **Territory Map Page**: Updated with stat cards and improved leaderboard styling
- **Navigation Updates**: Added "My Requests" link, renamed "Service Requests" to "Find Opportunities"

### January 21, 2026 - Service Requests Feature & Firebase Full Migration
- **Service Requests System**: Complete CRUD for volunteer service opportunities
  - Create requests with title, description, location, hours offered, contact info
  - Join requests as a volunteer participant
  - Manage participants (view joiners, kick, award hours) for request creators only
  - Location picker with interactive world map integration
- **World Map Enhancement**: Added service request markers with popup cards and join button
- **Admin Settings Migration**: Migrated from Express API to Firebase Firestore
- **Security**: Mandatory creator verification for participant management using authenticated user
- **AdminSettings Extended**: Added showGpa, decayRate, maxDecay, bonusMultiplier fields
- **Firebase Types**: Added ServiceRequest, ServiceRequestParticipant types and CRUD functions

### November 16, 2025 - 404 Page Redesign & Projects Portfolio Feature
- **404 Page Modernization**: Complete redesign with glassmorphism effects, animated floating elements, gradient backgrounds, and interactive hover states
- **Projects Portfolio System**: Added comprehensive project showcase feature to user profiles
- **Database Schema**: Added `projects` table with fields for project name, role, completion date, description, and image URL
- **Projects API**: Implemented full CRUD API routes for project management (GET, POST, PUT, DELETE) with Zod validation
- **Projects UI**: Created card-based projects section on profile page with:
  - Add/edit/delete project dialogs with form validation
  - Project cards displaying name, role, date, description, and optional images
  - Empty state with call-to-action for first project
  - Responsive grid layout for multiple projects
- **Type Safety**: Added proper TypeScript types for all project operations
- **Storage Layer**: Implemented project CRUD methods in storage interface following existing patterns

### July 19, 2025 - Year-End Database Management System
- **Year-End Database Management**: Implemented comprehensive admin database wipe page restricted to May 1st - August 1st operations
- **Historical Data Archiving**: Added yearly history tracking system that preserves student data before database wipes
- **Student History Dashboard**: Created student history page showing past years' submissions, monthly charts, and requirement status
- **Production Cleanup**: Removed all demo user functionality and demo buttons for production readiness
- **Database Schema**: Added `yearly_history` table for long-term data preservation with JSON storage for submissions and monthly data
- **API Infrastructure**: Built complete API system for archiving, wiping, and historical data retrieval
- **Date Restrictions**: Implemented May 1st - August 1st window restriction for all destructive database operations
- **Profile Update Fix**: Resolved profile update API error by removing deprecated profilePictureUrl field
- **Navigation Enhancement**: Added History tab to student navigation with comprehensive yearly data views

### July 17, 2025
- **Profile Completion System**: Implemented mandatory profile completion before accessing dashboard/hours
- **Profile Form Fix**: Fixed form submission issues with enhanced debugging and proper event handling
- **Profile Validation**: Added required field validation with asterisks and comprehensive error messaging
- **Route Protection**: Added ProfileCompletionGuard to dashboard and hours pages
- **Database Integration**: Successfully integrated profile data with PostgreSQL storage
- **UI Design Updates**: Changed backgrounds to white, removed shadows, removed sidebar borders for modern look
- **NAHS Branding**: Replaced star icon with paintbrush icon for National Art Honor Society theme
- **Requirements Tracking**: Added 15-hour March deadline tracking with progress bar and status indicators
- **Developer Credit**: Added "Made by Abhiram" credit with mailto link in sidebar
- **Interface Selection**: Redesigned interface selection page with modern card-based layout and better descriptions
- **User Role System**: Added user_role field to database (0=student, 1=admin) with automatic default assignment
- **Profile Completion UI**: Redesigned profile completion screen with modern gradient design and feature highlights

## Data Flow

1. **Client Requests**: React components use TanStack Query for data fetching
2. **API Gateway**: Express router handles `/api/*` routes
3. **Data Access**: Storage interface abstracts database operations
4. **Database**: PostgreSQL with Drizzle ORM for type safety
5. **Response**: JSON responses with error handling

### Storage Pattern
The application implements a storage interface pattern:
- `IStorage` interface defines CRUD operations
- `MemStorage` provides in-memory implementation for development
- Database storage implementation can be added later
- Clean separation between business logic and data persistence

## External Dependencies

### Core Dependencies
- **React Ecosystem**: React, React DOM, React Router (Wouter)
- **Backend**: Express, Node.js runtime
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Authentication**: Firebase Auth
- **UI**: Radix UI primitives, Tailwind CSS
- **Build Tools**: Vite, TypeScript, ESBuild

### Development Dependencies
- **TypeScript**: Full type safety across the stack
- **Vite Plugins**: React, runtime error overlay, Replit integration
- **Code Quality**: ESLint, Prettier (implied)

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public/`
2. **Backend Build**: ESBuild bundles server code to `dist/`
3. **Static Assets**: Frontend served from Express in production

### Environment Configuration
- **Development**: Vite dev server with Express API proxy
- **Production**: Express serves static files and API routes
- **Database**: Environment variable for PostgreSQL connection
- **Firebase**: Environment variables for Firebase config

### Hosting Considerations
- **Platform**: Designed for Replit deployment
- **Database**: Neon serverless PostgreSQL for scalability
- **Assets**: Static files served by Express
- **Environment**: Node.js runtime with ES modules

### Security Features
- **Session Management**: Secure session storage in PostgreSQL
- **CORS**: Configured for appropriate origins
- **Input Validation**: Zod schemas for all data validation
- **Authentication**: Firebase Auth with secure token handling

The architecture prioritizes developer experience with hot reloading, type safety, and modern tooling while maintaining production readiness with proper error handling, logging, and security measures.