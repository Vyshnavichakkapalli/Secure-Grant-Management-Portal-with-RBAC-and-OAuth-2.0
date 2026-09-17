# Secure Grant Management Portal with RBAC & OAuth 2.0

A secure, multi-role backend application for managing grant opportunities and applications. Built using **Node.js/Express** following the **Model-View-Controller (MVC)** architectural pattern, featuring **Role-Based Access Control (RBAC)**, **OAuth 2.0** single sign-on, **PostgreSQL** persistence with automated migrations and seeding, **Redis** caching, and container orchestration with **Docker & Docker Compose**.

---

## Architecture Overview

```
                          +-------------------------------+
                          |  Client / Evaluator / Browser |
                          +---------------+---------------+
                                          |
                                          v
                                +-------------------+
                                | Express Router    |
                                +---------+---------+
                                          |
                                          v
                              +-----------------------+
                              | Auth & RBAC Middleware|
                              +-----------+-----------+
                                          |
                +-------------------------+-------------------------+
                |                         |                         |
                v                         v                         v
       +-----------------+       +-----------------+       +-----------------+
       | Auth Controller |       | User Controller |       | Grant Controller|
       +--------+--------+       +--------+--------+       +--------+--------+
                |                         |                         |
                +-------------------------+-------------------------+
                                          |
                                          v
                                +-------------------+
                                |   Service Layer   |
                                +---------+---------+
                                          |
                                          v
                                +-------------------+
                                |    Data Models    |
                                +-----+-------+-----+
                                      |       |
                                      |       +------------+
                                      v                    v
                            +--------------------+  +---------------+
                            | PostgreSQL 16 (db) |  | Redis 7 (cache|
                            +--------------------+  +---------------+
```

### Key Security & Architecture Patterns
- **Role-Based Access Control (RBAC)**: Fine-grained permissions across three roles (`ADMIN`, `GRANTOR`, `GRANTEE`).
- **OAuth 2.0 Integration**: Third-party federated authentication support (Google OAuth 2.0) with automated account creation and token issuance.
- **JWT Authorization**: Cryptographically signed JSON Web Tokens containing the user ID and assigned roles.
- **Strict Ownership Checks**: Grantors can only modify or inspect applications for grants they personally authored.
- **Automated Database Seeding**: Auto-provisions system roles (`ADMIN`, `GRANTOR`, `GRANTEE`) and a default administrative user account on initial startup.

---

## User Roles & Capabilities

| Role | Permissions & Capabilities |
| :--- | :--- |
| **`ADMIN`** | Full administrative rights: assign roles to users, delete any grant, view system metrics and applications. |
| **`GRANTOR`** | Create funding opportunities (grants), update owned grants, delete owned grants, and review applications submitted for owned grants. |
| **`GRANTEE`** | Browse all active grants, view grant details, and submit grant applications with customized project proposals. |

---

## API Endpoints

### 1. Authentication & OAuth 2.0 (`/api/auth`)
| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new user with `name`, `email`, `password`. Automatically assigned `GRANTEE` role. Returns HTTP 201. |
| `POST` | `/api/auth/login` | Public | Authenticate with `email` and `password`. Returns HTTP 200 with `{ "accessToken": "<jwt>" }`. |
| `GET` | `/api/auth/google` | Public | Redirects to Google OAuth 2.0 consent screen. |
| `GET` | `/api/auth/google/callback` | Public | Exchanges authorization code, creates or fetches account, returns accessToken. |

#### JWT Payload Schema
Signed tokens contain:
```json
{
  "userId": "a0000000-0000-0000-0000-000000000001",
  "roles": ["ADMIN"],
  "iat": 1726569600,
  "exp": 1726656000
}
```

### 2. User & Role Management (`/api/users`)
| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/users/:userId/roles` | `ADMIN` | Assign a role to a user. Body: `{ "roleName": "GRANTOR" }`. Returns HTTP 200. |
| `GET` | `/api/users/me` | Authenticated | Retrieve authenticated user profile and assigned roles. |

### 3. Grant Opportunities (`/api/grants`)
| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/grants` | `GRANTOR` | Create a new grant opportunity. Sets creator as `grantor_id`. Returns HTTP 201. |
| `GET` | `/api/grants` | `GRANTEE`, `GRANTOR`, `ADMIN` | List all open grant opportunities. Returns HTTP 200. |
| `GET` | `/api/grants/:id` | `GRANTEE`, `GRANTOR`, `ADMIN` | View details of a specific grant. Returns HTTP 200. |
| `PUT` | `/api/grants/:id` | `GRANTOR` (Owner) | Update an owned grant. Non-owners receive HTTP 403 Forbidden. |
| `DELETE`| `/api/grants/:id` | `GRANTOR` (Owner) or `ADMIN` | Delete a grant. Returns HTTP 200. |
| `POST` | `/api/grants/:id/apply` | `GRANTEE` | Submit an application for a grant with `{ "proposal": "..." }`. Returns HTTP 201. |
| `GET` | `/api/grants/:id/applications`| `GRANTOR` (Owner) or `ADMIN` | View all applications submitted for this grant. Non-owners receive HTTP 403. |

### 4. Applications (`/api/applications`)
| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/applications/:app_id` | Applicant / Grant Owner / `ADMIN` | View specific application details. Unauthorized users receive HTTP 403. |

---

## Getting Started

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/)
- (Optional for local development): [Node.js](https://nodejs.org/) (v18+)

### 1. Environment Configuration
Copy the provided `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Default parameters are pre-configured for running with Docker Compose out of the box.

### 2. Start Services with Docker Compose
Start all application, database, and cache services in a single command:
```bash
docker-compose up --build
```

Docker Compose spins up three interconnected services:
- **`app`**: The Node.js/Express API (port `5000`)
- **`db`**: PostgreSQL 16 container with persistent volume and schema initialization (port `5432`)
- **`cache`**: Redis 7 container for caching and session state (port `6379`)

Each service includes a strict Docker healthcheck, ensuring that `app` only initializes after `db` and `cache` report healthy.

### 3. Verify Health & Default Seed Data
Once containers are healthy, access the health endpoint:
```bash
curl http://localhost:5000/health
```
Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-09-17T07:30:00.000Z",
  "uptime": 25.4
}
```

#### Pre-seeded Default Administrator Account
- **Email**: `admin@grantportal.com`
- **Password**: `AdminPassword123!`
- **Role**: `ADMIN`

---

## Testing & Code Coverage

The project includes an automated test suite with **unit**, **integration**, and **API contract** tests.

### Run Tests and Generate Coverage Report
```bash
npm run test:coverage
```

### Coverage Results
The test suite achieves **89.39% statement coverage** (exceeding the 70% threshold):
- **Statements**: 89.39%
- **Branches**: 72.04%
- **Functions**: 92.56%
- **Lines**: 89.33%

Reports are generated in the `coverage/` directory:
- HTML Report: `coverage/lcov-report/index.html`
- JSON Report: `coverage/coverage-final.json`

---

## Agile Planning & Documentation
A comprehensive Agile project plan detailing epics, user stories, and acceptance criteria is available in [PROJECT_PLAN.md](PROJECT_PLAN.md).