# Wylie NAHS Hours Tracking Application

## Overview

This is a comprehensive hours tracking application for Wylie NAHS (National Art Honor Society) participants built with React and TypeScript. Students can sign in with Google authentication, view their dashboard with service hours statistics, and submit/manage their service hours with proof of completion. The application features a clean, modern UI optimized for light mode display and includes comprehensive hours submission management. The application is structured with separate user interface and admin interface routes.

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
- **Authentication**: Google sign-in integration (mock for demo)
- **Navigation**: Clean navigation between dashboard and hours pages
- **Responsive Design**: Mobile-friendly UI with proper breakpoints

## Key Components

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: Neon Database serverless PostgreSQL
- **Migrations**: Managed through drizzle-kit
- **Schema**: Centralized in `shared/schema.ts` with Zod validation

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