# Agile Project Plan: Secure Grant Management Portal with RBAC & OAuth 2.0

## Overview
This document outlines the Agile development plan for the Secure Grant Management Portal. The portal enables grantors to offer funding opportunities and grantees to apply for grants, governed by a strict Role-Based Access Control (RBAC) authorization framework, OAuth 2.0 third-party authentication, and an MVC backend architecture.

---

## Epic 1: User Authentication & Identity Management

### User Story 1.1: Local User Registration & Login
**As a** prospective user (grantee or grantor),  
**I want to** register an account using my email and password and log in,  
**So that** I can securely access portal features tailored to my role.

**Acceptance Criteria:**
1. Given valid registration credentials (`name`, `email`, `password`), sending `POST /api/auth/register` creates a new user account, assigns the default `GRANTEE` role, and returns HTTP 201 with the user profile excluding `password_hash`.
2. Given valid login credentials, sending `POST /api/auth/login` returns HTTP 200 with an `accessToken` containing a signed JWT with `userId` and `roles` array.
3. Invalid credentials or duplicate email registrations return appropriate HTTP 400/409 error responses without leaking sensitive system details.

---

### User Story 1.2: OAuth 2.0 Third-Party Authentication
**As a** user who prefers federated single sign-on,  
**I want to** log in using my Google OAuth 2.0 account,  
**So that** I do not need to manage a separate password for this portal.

**Acceptance Criteria:**
1. Navigating to `GET /api/auth/google` redirects the client to the provider's authorization consent screen with requested scopes (`profile`, `email`).
2. When the provider redirects back to `GET /api/auth/google/callback?code=...`, the backend exchanges the authorization code for an access token, fetches the user profile, creates a user account if not existing, assigns the `GRANTEE` role, and returns an `accessToken` JWT.

---

## Epic 2: Role-Based Access Control (RBAC) & Administration

### User Story 2.1: Granular Role Enforcement Middleware
**As a** system security engineer,  
**I want** all sensitive endpoints protected by RBAC middleware,  
**So that** unauthenticated or unauthorized users are strictly prevented from executing actions beyond their permitted scope.

**Acceptance Criteria:**
1. Requests lacking a valid Bearer token in the `Authorization` header receive an immediate HTTP 401 Unauthorized response.
2. Requests carrying a valid JWT with insufficient role privileges (e.g., `GRANTEE` accessing `POST /api/grants`) receive an immediate HTTP 403 Forbidden response.

---

### User Story 2.2: Administrative Role Assignment
**As an** `ADMIN` user,  
**I want to** assign roles (e.g., `GRANTOR`, `ADMIN`) to existing registered users,  
**So that** qualified users can create grants and oversee grant lifecycles.

**Acceptance Criteria:**
1. An endpoint `POST /api/users/:userId/roles` accepts `{ "roleName": "GRANTOR" }` and requires the caller to hold the `ADMIN` role.
2. The user's role mapping is updated in the database, and non-admin callers attempting to assign roles receive HTTP 403 Forbidden.

---

## Epic 3: Grant Opportunity Lifecycle Management

### User Story 3.1: Grant Creation & Management by Grantors
**As a** `GRANTOR`,  
**I want to** create, update, and delete grant opportunities,  
**So that** I can publish funding initiatives to prospective applicants while retaining ownership over my listings.

**Acceptance Criteria:**
1. A `GRANTOR` can submit `POST /api/grants` with grant details (`title`, `description`, `amount`) to create a grant, automatically associating their user ID as `grantor_id` (HTTP 201).
2. A `GRANTOR` can update (`PUT /api/grants/:id`) only the grants they created. Attempts by other grantors to modify the grant return HTTP 403 Forbidden.
3. Only the owning `GRANTOR` or an `ADMIN` can delete a grant via `DELETE /api/grants/:id`.

---

### User Story 3.2: Grant Exploration by Grantees
**As a** `GRANTEE`,  
**I want to** view a list of available grants and view specific grant details,  
**So that** I can identify relevant funding opportunities to apply for.

**Acceptance Criteria:**
1. Authenticated users (`GRANTEE`, `GRANTOR`, `ADMIN`) can call `GET /api/grants` and receive an array of active grants (HTTP 200).
2. Authenticated users can call `GET /api/grants/:id` and receive full grant details including funding amount and grantor info (HTTP 200).

---

## Epic 4: Application Submission & Review

### User Story 4.1: Grant Application Submission
**As a** `GRANTEE`,  
**I want to** submit a project proposal for an open grant,  
**So that** my proposal can be evaluated for funding.

**Acceptance Criteria:**
1. A `GRANTEE` can send `POST /api/grants/:grantId/apply` with a request payload `{ "proposal": "..." }`, returning HTTP 201 with the created application record in `submitted` status.
2. Non-grantees (e.g., pure `GRANTOR` without `GRANTEE` role) or unauthenticated users receive HTTP 403/401 when attempting to apply.

---

### User Story 4.2: Application Review by Grant Owners
**As a** `GRANTOR`,  
**I want to** view all applications submitted to the grants I created,  
**So that** I can review proposals and make funding decisions.

**Acceptance Criteria:**
1. A `GRANTOR` can retrieve submissions for their grant via `GET /api/grants/:grantId/applications`, returning an array of applications (HTTP 200).
2. A `GRANTOR` attempting to view submissions for a grant they do not own receives HTTP 403 Forbidden.
3. An applicant can view their specific application via `GET /api/applications/:appId`, but cannot view applications submitted by other applicants.

---

## Technical & Delivery Milestones

| Sprint / Phase | Deliverables | Success Criteria |
| :--- | :--- | :--- |
| **Phase 1: Architecture & Setup** | Project structure, Dockerfile, docker-compose.yml, PostgreSQL schema & Redis config | All 3 services start with health checks, database auto-seeds roles & admin |
| **Phase 2: Authentication & RBAC** | Local auth, OAuth 2.0 flow, JWT generation (`userId`, `roles`), RBAC middleware | Full token lifecycle, 401/403 verification, role assignment |
| **Phase 3: Grants & Applications API** | Grant CRUD with ownership checks, Application submission and grantor reviews | Complete MVC pattern, controllers, models, and route protection |
| **Phase 4: Testing & Documentation** | Unit, integration, and contract tests with Jest; README & API specs | Code coverage >= 70% statement coverage (`npm run test:coverage`) |
