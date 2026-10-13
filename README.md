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

The API Gateway currently implements an IP-based rate limiter.

The current implementation tracks:

```text
IP Address
Request Count
Window Start Time
```

The purpose is to prevent a client from sending an excessive number of requests within a short period.

The current implementation uses an in-memory JavaScript object.

A future version will replace this with **Redis** to support shared rate-limiting state across multiple Gateway instances.

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

Sensitive configuration is stored in `.env` files and is not committed to Git.

Example:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Do not commit real credentials or secrets to GitHub.

## ▶️ Running the Project

### 1. Install dependencies

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
