# Production-Ready API Gateway & Microservices Backend

[![Node.js](https://img.shields.io/badge/Node.js-20.x%20LTS-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-blue.svg)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248.svg)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Cache%20%26%20Limiter-Redis-DC382D.svg)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-grade, distributed microservices architecture built with **Node.js, Express 5, Redis, and MongoDB**. This repository features a centralized **API Gateway** managing traffic to downstream microservices (**User Service** and **Product Service**) with distributed rate limiting, JWT authentication, role-based access control, downstream identity propagation, internal service key verification, proxy resilience, and full containerization with Docker Compose.

---

## 📑 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [System Features](#-system-features)
  - [API Gateway](#1-api-gateway-port-5000)
  - [User Service](#2-user-service-port-5001)
  - [Product Service](#3-product-service-port-5002)
- [Project Directory Structure](#-project-directory-structure)
- [Security & Network Isolation](#-security--network-isolation)
- [Request Lifecycle & Flows](#-request-lifecycle--flows)
- [Configuration & Environment Variables](#-configuration--environment-variables)
- [Getting Started](#-getting-started)
  - [Option A: Running with Docker Compose (Recommended)](#option-a-running-with-docker-compose-recommended)
  - [Option B: Running Locally (Node.js)](#option-b-running-locally-nodejs)
- [Comprehensive API Reference](#-comprehensive-api-reference)
  - [Health & Observability](#health--observability)
  - [Authentication & User Endpoints](#authentication--user-endpoints)
  - [Product Endpoints](#product-endpoints)
- [Automated Testing](#-automated-testing)
- [License](#-license)

---

## 🏗️ Architecture Overview

```text
                                 Client / Mobile / SPA
                                           │
                                           │ HTTPS / HTTP
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │               API Gateway               │
                      │          (Public Host Port: 5000)       │
                      └────────────────────┬────────────────────┘
                                           │
               ┌───────────────────────────┼───────────────────────────┐
               ▼                           ▼                           ▼
      Atomic Redis Limiter          JWT Auth & RBAC          Request ID & Helmet
               │                           │                           │
               └───────────────────────────┼───────────────────────────┘
                                           │
                                Routing Table Proxy
                 (Injects: X-Request-Id, X-User-Id, X-User-Role, X-Internal-Key)
                                           │
                 ┌─────────────────────────┴─────────────────────────┐
                 │                                                   │
                 ▼                                                   ▼
     ┌───────────────────────┐                           ┌───────────────────────┐
     │     User Service      │                           │    Product Service    │
     │ (Internal Port: 5001) │                           │ (Internal Port: 5002) │
     └───────────┬───────────┘                           └───────────┬───────────┘
                 │                                                   │
                 ▼                                                   ▼
       ┌───────────────────┐                               ┌───────────────────┐
       │   MongoDB: users  │                               │  MongoDB: products│
       └───────────────────┘                               └───────────────────┘
```

### Private Container Network

When running via Docker Compose, only the **API Gateway** exposes port `5000` to the host machine. All other services (`user-service`, `product-service`, `mongo`, `redis`) reside entirely on the private internal bridge network (`app_network`). Direct external access to downstream services and databases is blocked.

---

## 🚀 System Features

### 1. API Gateway (Port 5000)

- **Dynamic Routing Table (`src/config/routes.js`)**: Replaces hardcoded proxy configurations with a flexible, modular routing table defining target URLs, path rewrites, authentication requirements, and role checks.
- **Atomic Redis Rate Limiting**:
  - Implements an atomic Lua script (`eval`) executing `INCR`, conditional `EXPIRE`, and `TTL` in a single Redis round-trip.
  - Eliminates race conditions and avoids orphan keys without TTL in crash scenarios.
  - **Global Route Rate Limiting**: Defaults to 100 requests per 60 seconds across all `/api` endpoints.
  - **Stricter Auth Rate Limiting**: Defaults to 5 requests per 60 seconds on `/api/users/login` and `/api/users/register` to block brute-force attacks.
  - **Fail-Open Architecture**: Configurable via `RATE_LIMIT_FAIL_OPEN=true` so that transient Redis outages do not bring down client traffic.
  - **RFC-Compliant Headers**: Emits `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` (matching remaining TTL).
- **JWT Verification & Role-Based Access Control (RBAC)**:
  - Centralized authentication at the edge. Downstream microservices do not need to duplicate JWT verification logic.
  - Granular role guards (e.g. `role: admin`) protecting administrative operations.
- **Identity & Context Propagation**:
  - Automatically generates and propagates a unique `X-Request-Id` (UUID v4) for end-to-end distributed tracing.
  - Injects decoded caller identity into downstream headers: `X-User-Id` and `X-User-Role`.
  - Injects secret `X-Internal-Key` to verify that requests originate strictly from the API Gateway.
- **Proxy Resilience & Timeouts**:
  - Proxies upstream requests using `http-proxy-middleware`.
  - Configurable timeouts (`PROXY_TIMEOUT_MS=5000`).
  - Standardized error handling returning clean JSON:
    - `502 Bad Gateway` if downstream service is down or unreachable.
    - `504 Gateway Timeout` if downstream service exceeds connection/response deadlines.
- **Observability & Security**:
  - `GET /health`: Comprehensive health check validating API Gateway uptime and Redis connectivity.
  - `helmet`: Sets HTTP security headers (X-Frame-Options, XSS protection, HSTS, etc.).
  - `cors`: Configurable allowed origins via `CORS_ORIGIN`.
  - Detailed request logging displaying method, URL, status code, latency (ms), and request ID.

---

### 2. User Service (Port 5001)

- **Authentication Endpoints**:
  - `POST /api/users/register`: Validates name, email, password; hashes passwords using `bcrypt` (10 salt rounds); persists user to MongoDB.
  - `POST /api/users/login`: Validates credentials; returns signed JWT containing `id` and `role`.
- **User & Admin Resources**:
  - `GET /api/users/profile`: Protected profile endpoint.
  - `GET /api/users/admin`: Admin-only dashboard endpoint.
- **Internal Security Handshake**:
  - Protected by `verifyInternalKey` middleware. Requests lacking the matching `X-Internal-Key` header are immediately rejected with `403 Forbidden`.
- **Validation**:
  - Robust request validation with `express-validator` returning uniform error responses.

---

### 3. Product Service (Port 5002)

- **Product Catalog Endpoints**:
  - `GET /api/products`: Retrieve all products from MongoDB.
  - `GET /api/products/:id`: Retrieve single product by ID.
  - `POST /api/products`: Create a new product (**Admin only**).
  - `PUT /api/products/:id`: Update existing product details (**Admin only**).
  - `DELETE /api/products/:id`: Remove product (**Admin only**).
- **Data Model**:
  - Mongoose `Product` schema enforcing fields: `name`, `description`, `price` (minimum 0), `category`, `stock` (minimum 0), and timestamps.
- **Internal Security**:
  - Enforces `X-Internal-Key` check on every incoming route.

---

## 🗂️ Project Directory Structure

```text
apigateway-microservice/
├── .env.example                     # Environment template for Docker Compose
├── docker-compose.yml               # Multi-service container orchestration
├── README.md                        # Project documentation
│
├── api-gateway/                     # API Gateway (Port 5000)
│   ├── Dockerfile                   # Multi-stage production Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   ├── package.json
│   ├── src/
│   │   ├── app.js                   # Gateway Express initialization & routes
│   │   ├── config/
│   │   │   ├── env.js               # Startup environment validation
│   │   │   ├── redis.js             # Redis client with retry backoff & timeout
│   │   │   └── routes.js            # Dynamic upstream routing table
│   │   └── middleware/
│   │       ├── authMiddleware.js    # JWT verification
│   │       ├── errorHandler.js      # Centralized JSON error response
│   │       ├── isAdmin.js           # Role-based admin authorization
│   │       ├── proxy.js             # Resilient upstream proxy factory
│   │       ├── ratelimitter.js      # Distributed atomic Lua rate limiter
│   │       ├── requestId.js         # Distributed tracing UUID generator
│   │       └── requestLogging.js    # Latency & request tracking logger
│   └── test/
│       ├── gateway.test.js          # Gateway integration test suite
│       └── ratelimitter.test.js     # Rate limiter unit test suite
│
├── user-service/                    # User Microservice (Port 5001)
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   ├── package.json
│   ├── src/
│   │   ├── app.js                   # User service Express app
│   │   ├── config/
│   │   │   ├── db.js                # MongoDB connection
│   │   │   └── env.js               # Environment validation
│   │   ├── controllers/
│   │   │   ├── loginController.js   # Login & JWT creation
│   │   │   └── registerController.js# Registration & password hashing
│   │   ├── middleware/
│   │   │   ├── authLogin.js         # Identity middleware
│   │   │   ├── isAdmin.js           # Admin check
│   │   │   ├── validateLogin.js     # Validation rules
│   │   │   ├── validateRegister.js  # Validation rules
│   │   │   └── verifyInternalKey.js # X-Internal-Key authorization
│   │   ├── models/
│   │   │   └── user.js              # User Mongoose model
│   │   └── routes/
│   │       └── userRoutes.js        # User service routes
│   └── test/
│       └── user.test.js             # User service unit & security tests
│
└── product-service/                 # Product Microservice (Port 5002)
    ├── Dockerfile
    ├── .dockerignore
    ├── .env.example
    ├── package.json
    ├── src/
    │   ├── app.js                   # Product service Express app
    │   ├── config/
    │   │   ├── db.js                # MongoDB connection
    │   │   └── env.js               # Environment validation
    │   ├── controllers/
    │   │   └── productController.js # CRUD handlers
    │   ├── middleware/
    │   │   └── verifyInternalKey.js # X-Internal-Key authorization
    │   ├── models/
    │   │   └── product.js           # Product Mongoose model
    │   └── routes/
    │       └── productRoutes.js     # Product service routes
    └── test/
        └── product.test.js          # Product service CRUD & security tests
```

---

## 🔒 Security & Network Isolation

1. **Edge Authentication**: The client never communicates with backend microservices directly. JWT verification happens at the API Gateway.
2. **Internal Key Authentication (`X-Internal-Key`)**: Even if a bad actor gains access to the private network, direct requests to `user-service` or `product-service` without the shared `INTERNAL_SERVICE_KEY` fail with:
   ```json
   {
     "error": "Forbidden",
     "message": "Invalid or missing internal service key"
   }
   ```
3. **No Database Ports Exposed**: In Docker Compose, MongoDB (`27017`) and Redis (`6379`) do NOT expose host ports. Only internal services inside `app_network` can communicate with them.
4. **Non-Root Containers**: Every Dockerfile builds on Alpine Linux, drops privileges, and runs as non-root user `USER node`.
5. **Fail-Open Resilience**: Redis downtime does not crash the gateway or prevent authenticating users when configured in fail-open mode.

---

## 🔄 Request Lifecycle & Flows

### 1. Public Request (User Registration / Login)
```text
Client ──> Gateway:5000 [Rate Limiter (5 req/min)]
             │
             ├──> Forward to User Service:5001 (adds X-Internal-Key, X-Request-Id)
             │      └──> Validate & Save / Generate JWT
             │
Client <─────┴── Returns 200 OK + JWT Token
```

### 2. Protected User Request
```text
Client ──> Gateway:5000 [Rate Limiter (100 req/min)]
             │
             ├──> JWT Auth Middleware (Verify Bearer Token)
             ├──> Inject Headers (X-User-Id, X-User-Role, X-Internal-Key, X-Request-Id)
             ├──> Forward to Target Service
             │
Client <─────┴── Returns 200 OK with resource data
```

### 3. Admin-Restricted Request (e.g. POST /api/products)
```text
Client ──> Gateway:5000 [Rate Limiter] ──> JWT Auth (Valid Token)
                                             │
                                             ├──> Role Check (role === "admin" ?)
                                             │      ├── No  ──> 403 Forbidden
                                             │      └── Yes ──> Proxy to Product Service:5002
                                             │
Client <─────────────────────────────────────┴── Returns 201 Created
```

---

## ⚙️ Configuration & Environment Variables

### Root Compose (`.env` in root)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `GATEWAY_PORT` | `5000` | Host port exposed for API Gateway |
| `JWT_SECRET` | `super_secret_jwt_key_change_in_production` | Secret key for signing/verifying JWTs |
| `INTERNAL_SERVICE_KEY` | `super_internal_service_handshake_key_change_me` | Shared key between Gateway and downstream services |
| `TRUST_PROXY` | `false` | Enable if behind reverse proxy/load balancer |
| `RATE_LIMIT_MAX` | `100` | Global requests per window for `/api` routes |
| `RATE_LIMIT_WINDOW` | `60` | Global rate limit window in seconds |
| `AUTH_RATE_LIMIT_MAX` | `5` | Strict requests per window for auth routes |
| `AUTH_RATE_LIMIT_WINDOW` | `60` | Strict rate limit window in seconds |
| `RATE_LIMIT_FAIL_OPEN` | `true` | If Redis is down: `true` allows requests, `false` returns 500 |
| `CORS_ORIGIN` | `*` | Allowed CORS origin(s) |
| `PROXY_TIMEOUT_MS` | `5000` | Upstream proxy timeout in milliseconds |

---

## ▶️ Getting Started

### Option A: Running with Docker Compose (Recommended)

From a fresh clone, run the entire stack with zero manual dependencies:

```bash
# 1. Clone repository
git clone https://github.com/vikas2665/apigateway-microservice.git
cd apigateway-microservice

# 2. (Optional) Create .env from template
cp .env.example .env

# 3. Build and start all services
docker compose up --build
```

Docker Compose will automatically:
1. Initialize **MongoDB** and wait for `mongosh ping` health check to pass.
2. Initialize **Redis** and wait for `redis-cli ping` health check to pass.
3. Build and launch **User Service** (port 5001 internally) and wait for health check.
4. Build and launch **Product Service** (port 5002 internally) and wait for health check.
5. Build and launch **API Gateway** on host port `5000`.

To stop the containers:
```bash
docker compose down
```

---

### Option B: Running Locally (Node.js)

#### 1. Prerequisites
- **Node.js** (v18 or v20 LTS recommended)
- **MongoDB** running locally on `localhost:27017`
- **Redis** running locally on `localhost:6379`

#### 2. Install Dependencies
```bash
cd api-gateway && npm install
cd ../user-service && npm install
cd ../product-service && npm install
cd ..
```

#### 3. Configure Local Environment Files
Copy each `.env.example` to `.env`:
```bash
cp api-gateway/.env.example api-gateway/.env
cp user-service/.env.example user-service/.env
cp product-service/.env.example product-service/.env
```

#### 4. Start Microservices (Separate Terminals)

**Terminal 1 — User Service**:
```bash
cd user-service
npm start
# Runs on http://localhost:5001
```

**Terminal 2 — Product Service**:
```bash
cd product-service
npm start
# Runs on http://localhost:5002
```

**Terminal 3 — API Gateway**:
```bash
cd api-gateway
npm start
# Runs on http://localhost:5000
```

---

## 🧪 Comprehensive API Reference

All requests go to the API Gateway at `http://localhost:5000`.

### Health & Observability

#### `GET /health`
Probes API Gateway status and Redis cache connectivity.
```bash
curl -X GET http://localhost:5000/health
```
**Response (200 OK)**:
```json
{
  "status": "healthy",
  "services": {
    "redis": "connected"
  },
  "timestamp": "2026-10-14T15:30:00.000Z"
}
```

---

### Authentication & User Endpoints

#### 1. Register User
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Developer",
    "email": "alice@example.com",
    "password": "Password123!"
  }'
```
**Response (201 Created)**:
```json
{
  "message": "User registered successfully"
}
```

#### 2. Login User
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "Password123!"
  }'
```
**Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 3. Access User Profile (JWT Protected)
```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```
**Response (200 OK)**:
```json
{
  "message": "Protected route accessed",
  "userId": "670c5e7b8...",
  "role": "user"
}
```

#### 4. Access Admin Dashboard (Admin Role Only)
```bash
curl -X GET http://localhost:5000/api/users/admin \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
If caller has `role: "user"`, the API Gateway returns:
```json
{
  "error": "Forbidden",
  "message": "Access denied: Admins only"
}
```

---

### Product Endpoints

#### 1. List Products (JWT Protected)
```bash
curl -X GET http://localhost:5000/api/products \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```
**Response (200 OK)**:
```json
[
  {
    "_id": "670d8a9f...",
    "name": "Wireless Mechanical Keyboard",
    "description": "Hot-swappable RGB mechanical keyboard",
    "price": 99.99,
    "stock": 45,
    "category": "Electronics",
    "createdAt": "2026-10-14T15:35:00.000Z"
  }
]
```

#### 2. Get Product by ID (JWT Protected)
```bash
curl -X GET http://localhost:5000/api/products/670d8a9f... \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

#### 3. Create Product (Admin Only)
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "name": "4K Ultra-HD Monitor",
    "description": "27-inch IPS display with USB-C hub",
    "price": 349.99,
    "stock": 20,
    "category": "Electronics"
  }'
```
**Response (201 Created)**:
```json
{
  "message": "Product created successfully",
  "product": {
    "_id": "670d8c12...",
    "name": "4K Ultra-HD Monitor",
    "price": 349.99,
    "stock": 20
  }
}
```

#### 4. Update Product (Admin Only)
```bash
curl -X PUT http://localhost:5000/api/products/670d8c12... \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "price": 319.99,
    "stock": 18
  }'
```

#### 5. Delete Product (Admin Only)
```bash
curl -X DELETE http://localhost:5000/api/products/670d8c12... \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
**Response (200 OK)**:
```json
{
  "message": "Product deleted successfully"
}
```

---

## 🚦 Error Handling & Rate Limiting Responses

### Rate Limit Exceeded (429 Too Many Requests)
```json
{
  "error": "Too many requests",
  "retryAfter": 48
}
```
**Response Headers**:
- `Retry-After: 48`
- `X-RateLimit-Limit: 5`
- `X-RateLimit-Remaining: 0`
- `X-RateLimit-Reset: 48`

### Upstream Service Down (502 Bad Gateway)
If `user-service` or `product-service` is unreachable or crashes:
```json
{
  "error": "Bad Gateway",
  "message": "Failed to connect to upstream service",
  "service": "product-service",
  "requestId": "d290f1ee-6c54-4b01-90e6-d701748f0851"
}
```

---

## 🧪 Automated Testing

The repository includes comprehensive automated test suites using the native Node.js test runner (`node --test`).

### Run All Tests
```bash
# Test API Gateway (20 tests: rate limiting, proxy, auth, admin, health, headers)
npm test --prefix api-gateway

# Test User Service (4 tests: internal key verification, identity forwarding)
npm test --prefix user-service

# Test Product Service (4 tests: internal key rejection, CRUD validation)
npm test --prefix product-service
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
