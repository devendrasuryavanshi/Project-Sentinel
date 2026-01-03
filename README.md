# Project Sentinel 🛡️

> **Advanced Identity Threat Detection & Session Management System**

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Security](https://img.shields.io/badge/Security-Paranoid%20Mode-red)
![Stack](https://img.shields.io/badge/Stack-MERN%20%2B%20Redis-blue)

**Sentinel** is not just a dashboard; it is a full-stack security engine designed to detect anomalies, prevent session hijacking, and manage user identity at scale. It implements "high-grade" security heuristics including **Impossible Travel Detection**, **Device Fingerprinting**, and **Stateful JWT Management**.

---

## Table of Contents
- [The Problem Space](#-the-problem-space)
- [The Solution Architecture](#-the-solution-architecture)
- [Key Security Features](#-key-security-features)
- [Tech Stack](#-tech-stack)
- [System Design & Decisions](#-system-design--decisions)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [API Overview](#-api-overview)

---

## The Problem Space

In modern web applications, standard JWT authentication is insufficient against sophisticated attacks.
1.  **Session Hijacking:** If a cookie is stolen, attackers can impersonate users indefinitely.
2.  **Concurrent Abuse:** Users sharing accounts or attackers opening hundreds of sessions.
3.  **Database Bottlenecks:** Tracking "Last Active" timestamps on every request kills database I/O at scale (millions of requests).
4.  **Implicit Trust:** Traditional systems trust the token regardless of context (IP, Device, Location).

---

## The Solution Architecture

Sentinel implements a **Hybrid Database Architecture** to solve these problems without compromising performance.

1.  **MongoDB (Source of Truth):** Stores permanent user data, session logs, and audit trails.
2.  **Upstash Redis (Speed Layer):** Handles high-velocity writes (Rate Limiting, Session Caching, OTPs) to offload the primary database.

### Core Workflows
*   **The Paranoid Guard:** Every request is cross-referenced against a cached session state. If the **Device Fingerprint** changes mid-session, access is instantly revoked.
*   **Velocity Checks:** The system calculates the physical speed required to move between two login IP locations. If > 800km/h, it triggers an **Impossible Travel** alert.
*   **Smart Retention:** We keep the last 5 active sessions per user. Older sessions are automatically pruned via a smart "Overflow" logic and MongoDB TTL indexes.

---

## Key Security Features

### 1. Device Fingerprinting & Hijack Prevention
We generate a cryptographic hash based on the client's `User-Agent`, `Screen Resolution`, `Timezone`, `Language`, and other headers.
*   **Logic:** `Hash(UA + IP + ClientFingerprint)`.
*   **Action:** If a valid JWT is presented from a device with a mismatched fingerprint, the session is immediately revoked and marked as **Suspicious**.

### 2. Impossible Travel Detection
*   **Mechanism:** Sentinel tracks the `GeoLocation` of the last known request.
*   **Math:** Calculates the Haversine distance between `IP_A` and `IP_B` divided by the time difference.
*   **Result:** If speed > 800 km/h, the account is flagged, and the user receives a critical security alert email.

### 3. Session Concurrency Control
*   **Limit:** Users are limited to **3 active devices**.
*   **Enforcement:** If a user tries to login on a 4th device, the system **blocks the login** and sends an email containing secure, time-limited links (2 mins) to revoke old sessions remotely. This prevents unauthorized device evictions.

### 4. Adaptive MFA (Risk-Based Auth)
Login is not binary. We calculate a **Risk Score** (0-100) for every attempt.
*   New Device: +30 Risk
*   New IP (Velocity Check): +80 Risk
*   Geo Jump: +50 Risk
*   **Threshold:** If Score > 40, the user enters a "Challenged" state and must verify via OTP sent to email.

### 5. Backward Compatibility (Legacy Migration)
*   **Scenario:** Implementing Sentinel on an existing user base.
*   **Solution:** The middleware detects legacy JWTs (missing session IDs). It performs a **Just-In-Time (JIT) Migration**, creating a tracked session object on the fly without logging the user out.

---

## Tech Stack

### Frontend (`/client`)
*   **Framework:** React 19 (Vite)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (Dark Mode UI)
*   **State Management:** Zustand (Persisted Store)
*   **HTTP Client:** Axios (with Interceptors)
*   **UI Components:** Lucide React, Sonner (Toasts)

### Backend (`/server`)
*   **Runtime:** Node.js + Express
*   **Language:** TypeScript
*   **Database:** MongoDB (Mongoose) + Redis (IOredis)
*   **Queues:** BullMQ (for email offloading)
*   **Security:** `bcryptjs`, `jsonwebtoken`, `express-rate-limit`
*   **Logging:** Pino (Structured Logging)

---

## System Design & Decisions

### Why Redis + Mongo?
Updating `lastActiveAt` in MongoDB on every API hit is expensive.
*   **Optimization:** We verify sessions against Redis (1ms latency).
*   **Write-Back:** We only write updates to MongoDB once every 15 minutes (Throttling) or if critical metadata (IP) changes.

### The "Super Admin" Role
The system includes a hardcoded `SUPER_ADMIN_EMAIL` in the environment variables.
*   This user cannot be deleted or demoted.
*   Only this user can promote others to Admin status.
*   Admins have a dashboard to view global user risks and revoke sessions.

---

## Installation & Setup

### Prerequisites
*   Node.js v18+
*   MongoDB Instance (Atlas or Local)
*   Redis Instance (Upstash or Local)

### 1. Clone the Repository
```bash
https://github.com/devendrasuryavanshi/Project-Sentinel
cd sentinel
```

### 2. Backend Setup
```bash
cd server
npm install

# Create .env file (see below)
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file in the `server` directory:

```env
# Server Config
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/Sentinel
REDIS_URL=rediss://default:<pass>@<host>:6379

# Security Secrets (Use strong random strings)
JWT_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
SALT=$2b$12$your_bcrypt_salt

# Email Service (Gmail or SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password

# URLs
CLIENT_URL=http://localhost:5173
API_URL=http://localhost:5000/api

# Permissions
SUPER_ADMIN_EMAIL=admin@sentinel.com
```

---

## API Overview

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/user/auth/login` | Login with risk evaluation. Returns cookie. |
| `POST` | `/api/user/auth/register` | Create account (requires email OTP verification). |
| `POST` | `/api/user/auth/logout` | Revokes current session (Redis + Mongo). |
| `GET` | `/api/user/auth/revoke-via-email` | Endpoint for email links to kill sessions. |

### User Profile
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/user/profile` | Get user info + list of active sessions. |
| `GET` | `/api/user/sessions/history` | Get historical/inactive sessions. |
| `DELETE` | `/api/user/sessions` | Revoke a specific session. |
| `DELETE` | `/api/user/sessions/others` | "Panic Button" - Sign out all other devices. |

### Admin (Protected)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/users` | List all users with pagination & risk scores. |
| `PATCH` | `/api/admin/users/:id/role` | Promote/Demote user (Super Admin only). |
| `DELETE` | `/api/admin/users/:id/sessions` | Force sign-out a user entirely. |

---

**Built with ❤️ by Devendra Suravanshi.**
