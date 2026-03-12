# ReachMyD Project Report

## Overview

This workspace contains two applications:

1. `reachmyd-backend`
   NestJS + TypeORM backend connected to MySQL.
2. `reachmyd-frontend`
   Next.js frontend for the map experience, clinic dashboard, and admin login flow.

Current local development port split:

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`

This split is intentional so both applications can run at the same time without a port conflict.

## Work Completed Until Now

### Backend completed

The backend is already structured into production-style modules and exposes working REST endpoints for the current frontend.

Implemented modules:

- `MapModule`
- `DoctorModule`
- `AdminModule`

Implemented backend capabilities:

- City-based map markers API
- City-based localities API
- City-based place-types API
- Doctor clinic listing API with filters
- Doctor clinic create, update, and delete APIs
- Clinic profile listing API
- Register request listing API
- Support request listing, create, update, and delete APIs
- Dashboard metrics API
- Onboarding listing, create, update, and delete APIs
- Rx template fetch, upsert, list, and delete APIs
- Follow-up listing API
- Doctor users listing API
- Admin login API

Backend routes currently visible from the application startup logs and source:

- `GET /map/:city/markers`
- `GET /map/:city/localities`
- `GET /map/:city/place-types`
- `GET /doctor/clinics`
- `GET /doctor/clinics/:id`
- `POST /doctor/clinics`
- `PUT /doctor/clinics/:id`
- `DELETE /doctor/clinics/:id`
- `GET /doctor/clinic-profiles`
- `GET /doctor/register-requests`
- `GET /doctor/support-requests`
- `POST /doctor/support-requests`
- `PUT /doctor/support-requests/:id`
- `DELETE /doctor/support-requests/:id`
- `GET /doctor/dashboard-metrics`
- `GET /doctor/onboarding`
- `POST /doctor/onboarding`
- `PUT /doctor/onboarding/:mdId`
- `DELETE /doctor/onboarding/:mdId`
- `GET /doctor/rx-template/:mdId`
- `GET /doctor/rx-templates`
- `POST /doctor/rx-template`
- `DELETE /doctor/rx-template/:mdId`
- `GET /doctor/followups`
- `GET /doctor/users`
- `POST /admin/login`

Database integration already present:

- MySQL connection through `@nestjs/typeorm`
- Environment-based DB configuration
- SQL schema file available at `reachmyd-backend/doctor-db/doctor_schema.sql`

### Frontend completed

The frontend already includes the main user-facing flows required for the current phase.

Implemented frontend pages:

- `/`
  Interactive clinic and hospital map
- `/clinics`
  Doctor clinic operations dashboard
- `/doctor`
  Redirects to `/clinics`
- `/new_admin/pages/main_page`
  Admin sign-in page
- `/new_admin/pages/dashboard`
  Admin dashboard entry route

Implemented frontend capabilities:

- Dynamic map rendering with `react-leaflet`
- City selection
- Locality search and filtering
- Place-type filtering
- User geolocation support
- Nearby place fetch using latitude, longitude, and radius
- Marker clustering
- Searchable hospital/clinic list beside the map
- Click-to-focus behavior between list and map
- Clinic operations dashboard with:
  - live metrics
  - trend chart
  - status distribution
  - operations pulse cards
  - clinic registration form
  - record explorer
  - CSV export
  - print/PDF export
- Admin login form connected to backend

### Recent local-dev fix completed

To resolve a port collision, the frontend scripts were updated so the frontend now runs on `3001` by default while the backend stays on `3000`.

## Tech Stack

### Backend

- Node.js
- NestJS
- TypeScript
- TypeORM
- MySQL
- ESLint
- Prettier
- Jest

### Frontend

- Node.js
- Next.js
- React
- TypeScript
- Tailwind CSS
- React Leaflet
- Leaflet
- ESLint

## What Needs To Be Downloaded

Install these on your machine before running the project:

### Required software

- Node.js 20+ or newer
  The repo currently runs on a newer Node version locally, but Node 20 LTS or later is the safe recommendation.
- npm
  Comes with Node.js.
- MySQL Server 8.x
- Visual Studio Code

### Recommended VS Code extensions

- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- JavaScript and TypeScript Nightly
- DotENV

### Project dependencies

The dependency folders are already present locally right now, but on a new machine you should install them with:

```powershell
cd d:\backend\reachmyd-backend
npm install
cd d:\backend\reachmyd-frontend
npm install
```

## Environment Setup

The backend requires a `.env` file inside `reachmyd-backend`.

Use this structure:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=reachmyd_mapdata
DOCTOR_ADMIN_KEY=your_internal_key
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
```

Do not commit real credentials to Git.

## Database Setup

The backend expects a MySQL database. A schema file is already included:

- `reachmyd-backend/doctor-db/doctor_schema.sql`

Create the database and import the schema:

```sql
CREATE DATABASE reachmyd_mapdata;
```

Then import the SQL file using either MySQL Workbench or command line.

Example command line import:

```powershell
mysql -u your_mysql_username -p reachmyd_mapdata < d:\backend\reachmyd-backend\doctor-db\doctor_schema.sql
```

## How To Run In VS Code

### 1. Open the workspace

Open VS Code and choose:

- `File`
- `Open Folder...`
- Select `d:\backend`

You should see:

- `reachmyd-backend`
- `reachmyd-frontend`

### 2. Open two terminals in VS Code

In VS Code:

- Open `Terminal`
- Click `New Terminal`
- Create one terminal for backend
- Create another terminal for frontend

### 3. Start the backend

In terminal 1:

```powershell
cd d:\backend\reachmyd-backend
npm run start:dev
```

Expected result:

- NestJS starts successfully
- Backend listens on `http://localhost:3000`

### 4. Start the frontend

In terminal 2:

```powershell
cd d:\backend\reachmyd-frontend
npm run dev
```

Expected result:

- Next.js starts successfully
- Frontend opens on `http://localhost:3001`

### 5. Open the application

Use these URLs in the browser:

- Frontend map: `http://localhost:3001`
- Clinics dashboard: `http://localhost:3001/clinics`
- Admin login: `http://localhost:3001/new_admin/pages/main_page`
- Backend API base: `http://localhost:3000`

## Run Commands Summary

### Backend

```powershell
cd d:\backend\reachmyd-backend
npm install
npm run start:dev
```

Other useful backend commands:

```powershell
npm run build
npm run lint
npm run test
```

### Frontend

```powershell
cd d:\backend\reachmyd-frontend
npm install
npm run dev
```

Other useful frontend commands:

```powershell
npm run build
npm run lint
npm run start
```

## Current Project Structure

```text
d:\backend
|-- reachmyd-backend
|   |-- doctor-db
|   |   `-- doctor_schema.sql
|   |-- src
|   |   |-- admin
|   |   |-- doctor
|   |   |-- map
|   |   |-- map-bengaluru
|   |   |-- map-city
|   |   |-- appointments
|   |   `-- users
|   `-- .env
`-- reachmyd-frontend
    |-- src
    |   |-- app
    |   |-- components
    |   `-- lib
    `-- public
```

## Current Observations And Constraints

- The frontend currently calls backend APIs using hardcoded `http://localhost:3000` URLs in multiple files.
- The frontend and backend are intended for local development on the same machine.
- The root workspace did not previously have a top-level README, so this document is acting as the main project report.
- The backend expects an existing MySQL schema and data source; it does not auto-sync entities because `synchronize` is disabled.
- There are additional backend folders like `appointments`, `users`, `map-city`, and `map-bengaluru`, but not all of them are currently wired into the active `AppModule`.

## Suggested Next Improvements

- Move frontend API base URLs into environment variables instead of hardcoding `localhost:3000`
- Add a root `.env.example` and backend `.env.example`
- Add seed/sample data instructions for MySQL
- Add route protection for admin pages
- Add authentication/session handling beyond simple login response checks
- Add backend validation DTOs for request bodies
- Add integration tests for major APIs
- Add deployment instructions for staging and production

## Verification Status

This README was written from the current checked-out codebase and recent local run behavior.

Not verified as part of this documentation update:

- Full backend database contents
- End-to-end UI testing in browser after the README change
- Production deployment flow
