# PayFlow - Payment Processor Waterfall System

## Overview

PayFlow is a production-ready Node.js payment processing system that implements a waterfall routing architecture. The system automatically routes payments through multiple payment processors in priority order, implementing circuit breaker patterns to prevent cascading failures. It features mock payment processors (Stripe, PayPal, Square), real-time monitoring dashboard, and Algorand smart contract integration for processor priority management.

The application provides a comprehensive payment routing solution with health monitoring, rate limiting, structured logging, and a React-based dashboard for real-time system monitoring and management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Express.js RESTful API** - Core server framework with TypeScript for type safety
- **Waterfall Payment Processing** - Implements priority-based routing through multiple processors with automatic failover
- **Circuit Breaker Pattern** - Prevents cascading failures by temporarily disabling failing processors based on consecutive failures
- **Mock Payment Adapters** - Simulates real payment APIs (Stripe, PayPal, Square) with configurable success rates and response times
- **Health Monitoring System** - Tracks processor metrics, success rates, response times, and system health
- **Rate Limiting** - Implements different rate limits for API endpoints, payments, and health checks
- **Structured Logging** - Uses Winston-style logging with transaction tracking and multiple log levels

### Frontend Architecture  
- **React with TypeScript** - Component-based UI with type safety
- **Tailwind CSS + shadcn/ui** - Modern styling framework with pre-built component library
- **TanStack Query** - Data fetching, caching, and synchronization with automatic refetching
- **wouter** - Lightweight client-side routing
- **Real-time Dashboard** - Live monitoring interface with metrics, processor status, and transaction history

### Data Architecture
- **Drizzle ORM** - Type-safe database operations with PostgreSQL schema definitions
- **PostgreSQL Database** - Production database with comprehensive schema for processors, transactions, health metrics, and system logs
- **Memory Storage Fallback** - In-memory implementation for development/testing
- **Data Models**: Processors (config, status, priorities), Transactions (payment records, processing history), Health Metrics (performance tracking), System Logs (audit trail)

### Security & Reliability
- **Helmet.js** - Security headers and protection middleware
- **CORS Configuration** - Cross-origin resource sharing with environment-based origins
- **Input Validation** - Zod schemas for runtime type validation
- **Error Handling** - Comprehensive error catching with proper HTTP status codes
- **Circuit Breaker Implementation** - Automatic processor disabling after failure thresholds

### Smart Contract Integration
- **Algorand Integration** - Uses algosdk for blockchain connectivity
- **Processor Priority Management** - Smart contract-based configuration of payment processor priorities
- **Mock Mode Support** - Fallback to mock responses when contracts aren't deployed
- **Network Configuration** - Supports mainnet, testnet, and betanet environments

## External Dependencies

### Core Framework Dependencies
- **Express.js** - Web server framework
- **algosdk** - Algorand blockchain SDK for smart contract integration
- **helmet** - Security middleware for HTTP headers
- **cors** - Cross-origin resource sharing middleware
- **winston** - Logging framework for structured logging

### Database & ORM
- **Drizzle ORM** - Type-safe database toolkit
- **@neondatabase/serverless** - Serverless PostgreSQL driver
- **connect-pg-simple** - PostgreSQL session store

### Frontend Dependencies
- **React** - UI framework
- **Tailwind CSS** - Utility-first CSS framework
- **@radix-ui** - Headless UI components for accessibility
- **@tanstack/react-query** - Data synchronization library
- **wouter** - Lightweight routing solution
- **date-fns** - Date manipulation utilities
- **class-variance-authority** - Type-safe variant API for components

### Development & Build Tools
- **Vite** - Build tool and development server
- **TypeScript** - Type checking and compilation
- **tsx** - TypeScript execution engine
- **esbuild** - Fast bundler for production builds
- **@replit/vite-plugin-runtime-error-modal** - Development error overlay