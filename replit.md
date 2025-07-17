# Google Sign-In Demo Application

## Overview

This is a simple Google Sign-In demo application built with React and TypeScript. The application demonstrates a clean authentication flow with a beautiful UI, displaying the user's email address after successful sign-in. It uses a simplified mock authentication system for demonstration purposes without requiring external API keys.

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
- **Styling**: Tailwind CSS with CSS variables for theming
- **Authentication**: Custom mock authentication system for demo purposes
- **State Management**: Simple React state with localStorage persistence

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