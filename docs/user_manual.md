# User Manual & Deployment Guide
## Platform: Digital Footprint Analyzer & Privacy Cleaner (Aegis)

---

## 1. Setup & Installation (Local Development)

### Prerequisites
* **Node.js** (v18.x or higher, v24.x fully supported)
* **Docker Desktop**
* **Git**

### Step 1: Boot PostgreSQL Database
Spin up the database container inside the project root:
```bash
docker-compose up -d
```
*Note: The database container listens on mapped host port `5436` to prevent collisions.*

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` is set to:
`DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5436/privacy_db?schema=public"`

### Step 3: Install Backend Dependencies & Seed DB
Navigate to `/backend` or run commands with prefixes:
```bash
npm install --prefix backend
```
Generate Prisma Client:
```bash
node backend/node_modules/prisma/build/index.js generate --schema backend/prisma/schema.prisma
```
Synchronize the PostgreSQL tables:
```bash
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5436/privacy_db?schema=public"
node backend/node_modules/prisma/build/index.js db push --schema backend/prisma/schema.prisma
```
Seed admin credentials:
```bash
npx ts-node backend/prisma/seed.ts
```

### Step 4: Install Frontend Dependencies
```bash
npm install --prefix frontend
```

### Step 5: Start Servers
Start the backend Express server:
```bash
npm run dev --prefix backend
# Runs on http://localhost:5000
```
Start the frontend Next.js server:
```bash
npm run dev --prefix frontend
# Runs on http://localhost:3000
```

---

## 2. Product Features Walkthrough

### 2.1 Onboarding & Risk Quiz
* Open `http://localhost:3000`.
* Participate in the 5-question digital footprint estimator quiz on the landing page to gauge initial credentials reuse and photo metadata leakage risk.

### 2.2 Running Footprint OSINT scans
* Authenticate at `/login` using default test credentials:
  - **Email**: `user@privacy.org`
  - **Password**: `UserSecurePass2026!`
* Go to **OSINT Scanner** page.
* Input a Gmail address or Username and trigger the scan.
* Inspect results on the **Dashboard** including the interactive, dynamic **Bi-directional Footprint Node Graph**.

### 2.3 Sanitizing JPEG coordinates (EXIF)
* Go to the **Metadata Stripper** tab inside **OSINT Scanner**.
* Drag and drop a JPEG file. If coordinates are found, they plot on the OpenStreetMap visual map.
* Click **Strip Metadata & Download** to receive a cleaned JPEG copy in-memory.

### 2.4 Generating India DPDP Deletion Letters
* Go to the **Cleaning Hub** page.
* Under **Legal Request Writer**, select the **India DPDP** button.
* Input your name, Gmail, and target Indian company (e.g. Truecaller Grievance Officer).
* Click **Generate** and click **Copy Draft** to get your formal erasure request.
