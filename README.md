# PayFlow - Payment Processor Waterfall System

A production-ready Node.js payment processor system with waterfall routing, circuit breaker patterns, and Algorand smart contract integration.

Loom Video Explaining How it Works! : https://www.loom.com/share/2c20236ac70a4d48a1ce0794dd579d85?sid=e744ac71-dec4-4962-94e3-fc759880171c

Deploy from here: <img width="546" height="350" alt="image" src="https://github.com/user-attachments/assets/851f9f20-24c8-4d4b-b423-4199bc5d2497" />

Demo and system management as well as surge simiulaitno in the top right here: <img width="790" height="130" alt="image" src="https://github.com/user-attachments/assets/b3ef156a-789b-4f59-abfe-6004edfd5e34" />



## Features

- **Payment Processor Waterfall**: Automatically routes payments through multiple processors in priority order
- **Circuit Breaker Pattern**: Prevents cascading failures by temporarily disabling failing processors
- **Mock Payment Processors**: Stripe, PayPal, and Square simulators with configurable success rates
- **Real-time Monitoring**: Live dashboard with metrics, health status, and transaction monitoring
- **Smart Contract Integration**: Algorand blockchain integration for processor priority management
- **Comprehensive Logging**: Structured logging with transaction tracking and error reporting
- **Rate Limiting**: Protection against abuse with configurable rate limits
- **Security**: Helmet.js for security headers, CORS support, and input validation

## Technology Stack

### Backend
- **Express.js** - RESTful API server
- **TypeScript** - Type-safe development
- **Zod** - Runtime type validation
- **algosdk** - Algorand blockchain integration
- **helmet** - Security middleware
- **cors** - Cross-origin resource sharing
- **winston** - Structured logging

### Frontend
- **React** - User interface
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **TanStack Query** - Data fetching and caching
- **wouter** - Client-side routing

### Database
- **Replit Database** - Data persistence (or PostgreSQL with Drizzle ORM)

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
