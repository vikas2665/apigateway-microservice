# API Gateway & Microservices Backend

A backend project built with **Node.js and Express.js** that demonstrates an API Gateway and microservice architecture with authentication, authorization, rate limiting, request logging, and a User Service backed by MongoDB.

The project is being developed incrementally to understand how real-world backend systems are structured and how an API Gateway manages communication between clients and backend services.

## 🚀 Features

### API Gateway

* Reverse proxy using `http-proxy-middleware`
* Routes client requests to backend services
* JWT authentication
* Role-based authorization
* IP-based rate limiting
* Request logging
* Response status-code logging
* Request duration monitoring
* Centralized error handling

### User Service

* User registration
* User login
* MongoDB database integration
* Mongoose ODM
* Password hashing using bcrypt
* JWT generation
* Request validation using `express-validator`
* User roles: `user` and `admin`

### Authentication & Authorization

The project uses **JWT (JSON Web Tokens)** for authentication.

During login, the User Service generates a JWT containing the user's ID and role.

The API Gateway verifies the JWT before allowing access to protected routes.

Role-based authorization is implemented for admin-only routes.

## 🏗️ Architecture

```text
                         Client / Postman
                                │
                                │ HTTP Request
                                ▼
                     ┌─────────────────────┐
                     │    API Gateway      │
                     │      :5000          │
                     └──────────┬──────────┘
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
        Rate Limiter       JWT Auth          Request Logger
                                │
                                ▼
                         Role Authorization
                                │
                                ▼
                     ┌─────────────────────┐
                     │    User Service     │
                     │       :5001         │
                     └──────────┬──────────┘
                                │
                                ▼
                         ┌─────────────┐
                         │   MongoDB   │
                         └─────────────┘
```

## 🔄 Request Flow

### Public Request

For registration and login, the client communicates with the API Gateway:

```text
POST /api/users/register
        │
        ▼
API Gateway
        │
        ▼
User Service
        │
        ▼
MongoDB
```

```text
POST /api/users/login
        │
        ▼
API Gateway
        │
        ▼
User Service
        │
        ▼
JWT generated
        │
        ▼
Client
```

### Protected Request

For protected endpoints:

```text
GET /api/users/profile
        │
        ▼
API Gateway
        │
        ▼
Rate Limiter
        │
        ▼
JWT Authentication
        │
        ▼
Role Authorization (when required)
        │
        ▼
Proxy
        │
        ▼
User Service
```

If the JWT is missing or invalid, the Gateway rejects the request.

If the user is authenticated but does not have the required role, the Gateway returns:

```text
403 Forbidden
```

## 🔐 JWT Authentication

During login, the User Service creates a JWT containing information such as:

```json
{
  "id": "user_id",
  "role": "user"
}
```

The token is signed using a secret stored in an environment variable.

The client then sends the token with protected requests:

```http
Authorization: Bearer <JWT>
```

The API Gateway verifies the token before forwarding the request to the User Service.

## 👤 Role-Based Authorization

Users can have one of two roles:

```text
user
admin
```

For example:

```text
user
 ↓
GET /api/users/admin
 ↓
403 Forbidden
```

while:

```text
admin
 ↓
GET /api/users/admin
 ↓
User Service
 ↓
Access granted
```

The role is extracted from the verified JWT.

## ⏱️ Rate Limiting

The API Gateway implements a distributed, Redis-backed rate limiter using an **atomic Lua script**:

* **Atomic Counter & Expiry:** Combines `INCR`, conditional `EXPIRE`, and `TTL` check into a single Lua script execution via `eval`. This prevents race conditions and crashes from leaving keys without a TTL.
* **Route Coverage:**
  * **Global Limit:** Applied to all `/api` routes (default: `100` requests per `60` seconds) before authentication and proxying.
  * **Stricter Auth Limit:** Applied to `/api/users/login` and `/api/users/register` (default: `5` requests per `60` seconds) to mitigate brute-force and credential stuffing attacks.
* **Accurate IP Resolution (`trust proxy`):** Configurable `TRUST_PROXY` setting ensures `req.ip` reflects the actual client IP when deployed behind reverse proxies or load balancers.
* **429 Response Format:**
  ```json
  {
    "error": "Too many requests",
    "retryAfter": 58
  }
  ```
* **Rate Limit Headers:**
  * `Retry-After`: Remaining time in seconds before retry is allowed (matching Redis TTL).
  * `X-RateLimit-Limit`: Maximum requests permitted within the window.
  * `X-RateLimit-Remaining`: Number of requests remaining in current window (`0` when exceeded).
  * `X-RateLimit-Reset`: Remaining window duration in seconds (matching Redis TTL).
* **Configurable Redis-Down Behavior (`RATE_LIMIT_FAIL_OPEN`):**
  * **Default: `true` (Fail-Open)**: If Redis is unreachable or encounters an error, the error is logged and the request is permitted to proceed, preventing a Redis outage from taking down the API.
  * Set to `false` (Fail-Closed) if you prefer rejecting requests with a `500` error during Redis downtime.

## 📋 Request Logging

The Gateway logs information about completed requests, including:

```text
HTTP Method
Request URL
HTTP Status Code
Response Time
```

Example:

```text
GET /api/users/profile | Status: 200 | Time: 12ms
```

The logger uses the response `finish` event so that the response time is measured until the response has actually finished.

## 🗂️ Project Structure

```text
API-GATEWAY-RATELIMITTER/
│
├── api-gateway/
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   ├── errorHandler.js
│   │   │   ├── isAdmin.js
│   │   │   ├── proxy.js
│   │   │   ├── rateLimiter.js
│   │   │   └── requestLogging.js
│   │   │
│   │   └── app.js
│   │
│   ├── package.json
│   └── package-lock.json
│
├── user-service/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── loginController.js
│   │   │   └── registerController.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── authLogin.js
│   │   │   ├── isAdmin.js
│   │   │   ├── validateLogin.js
│   │   │   └── validateRegister.js
│   │   │
│   │   ├── models/
│   │   │   └── user.js
│   │   │
│   │   ├── routes/
│   │   │   └── userRoutes.js
│   │   │
│   │   └── app.js
│   │
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
├── package.json
└── package-lock.json
```

## 🛠️ Tech Stack

| Technology            | Purpose              |
| --------------------- | -------------------- |
| Node.js               | Backend runtime      |
| Express.js            | Web framework        |
| MongoDB               | Database             |
| Mongoose              | MongoDB ODM          |
| JWT                   | Authentication       |
| bcrypt                | Password hashing     |
| express-validator     | Request validation   |
| http-proxy-middleware | API Gateway proxying |

## ⚙️ Environment Variables

Sensitive configuration is stored in `.env` files (see `.env.example` in each service) and is not committed to Git.

### API Gateway (`api-gateway/.env`)

```env
PORT=5000
USER_SERVICE_URL=http://localhost:5001
JWT_SECRET=your_jwt_secret
REDIS_URL=redis://localhost:6379
TRUST_PROXY=false

# Global Rate Limiting (all /api routes)
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60

# Auth Route Rate Limiting (/api/users/login, /api/users/register)
AUTH_RATE_LIMIT_MAX=5
AUTH_RATE_LIMIT_WINDOW=60

# Redis-down behavior: true = fail-open (allow requests), false = fail-closed (return 500)
# Default: true
RATE_LIMIT_FAIL_OPEN=true
```

### User Service (`user-service/.env`)

```env
PORT=5001
JWT_SECRET=your_jwt_secret
MONGO_URI=mongodb://127.0.0.1:27017/gateway_project
```

## ▶️ Running the Project

### Option A: Run with Docker Compose (Recommended)

From a fresh clone, run the entire stack with zero manual configuration:

```bash
docker compose up --build
```

This will automatically:
1. Start **MongoDB** and wait for its healthcheck (`mongosh ping`) to pass.
2. Start **Redis** and wait for its healthcheck (`redis-cli ping`) to pass.
3. Build and launch **User Service**, waiting for its healthcheck to pass.
4. Build and launch **API Gateway**, connecting to Redis and User Service.
5. **Port Isolation:** Only port `5000` (API Gateway) is published to the host. MongoDB, Redis, and User Service are fully protected inside the private container bridge network (`app_network`).

To stop all containers:
```bash
docker compose down
```

### Option B: Run Locally Without Docker

#### 1. Install dependencies

Install dependencies for the API Gateway and User Service:

```bash
cd api-gateway
npm install

cd ../user-service
npm install
```

### 2. Configure environment variables

Create the required `.env` files and add your MongoDB connection string and JWT secret.

### 3. Start the User Service

```bash
cd user-service
node src/app.js
```

The User Service runs on:

```text
http://localhost:5001
```

### 4. Start the API Gateway

In another terminal:

```bash
cd api-gateway
node src/app.js
```

The API Gateway runs on:

```text
http://localhost:5000
```

## 🧪 Example API Endpoints

### Register

```http
POST http://localhost:5000/api/users/register
```

Example body:

```json
{
  "name": "John",
  "email": "john@example.com",
  "password": "password123"
}
```

### Login

```http
POST http://localhost:5000/api/users/login
```

The response contains a JWT.

### Protected Profile

```http
GET http://localhost:5000/api/users/profile
```

Requires:

```http
Authorization: Bearer <JWT>
```

### Admin Route

```http
GET http://localhost:5000/api/users/admin
```

Requires a valid JWT with:

```json
{
  "role": "admin"
}
```

## 🎯 Learning Goals

This project is being built to understand practical backend and microservice concepts, including:

* API Gateway architecture
* Microservice communication
* Reverse proxying
* Authentication vs authorization
* JWT-based authentication
* Role-based access control
* Rate limiting
* Request monitoring and logging
* MongoDB integration
* Secure password storage
* Middleware composition
* Error handling

## 🔮 Future Improvements

Planned improvements include:

* Redis-based distributed rate limiting
* Redis caching
* Additional microservices
* Improved security
* Service-to-service authentication
* Load balancing
* Production-ready configuration
* Containerization with Docker

## 👨‍💻 Project Status

The current version successfully demonstrates:

* API Gateway → User Service communication
* User registration and login
* JWT generation and verification
* Protected routes
* Role-based authorization
* Rate limiting
* Request logging
* MongoDB integration

More features will be added incrementally as the project evolves.
