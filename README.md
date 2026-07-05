# Aegis: Digital Footprint Analyzer & Privacy Cleaner

Aegis is an ethical OSINT (Open Source Intelligence) auditing and privacy protection platform. It is designed to recursively map a user's exposed digital footprint (profiles, data leaks, geolocations, and metadata) and provide active remediation tools (erasure notices and data broker unlisting checklists) to clean and secure their digital identity.

---

## 🌟 Key Features

*   **Recursive OSINT Prober (BBOT-style)**: Input a username or email and map out connected social handles, email leaks, and geographical reviews in an interactive node-link graph.
*   **Metadata Analyzer & Stripper**: Drag-and-drop file uploader that audits binary headers for:
    *   **JPEG (EXIF)**: Extracts GPS capture logs and plots them on an interactive Leaflet Map, then sanitizes APP1 metadata blocks in-memory.
    *   **PDF & DOCX**: Audits company structures, author names, and revision history, offering clean metadata-stripped downloads.
*   **Legal Deletion Request Generator**: Automatically generates legally-binding data erasure drafts tailored for:
    *   **India Digital Personal Data Protection (DPDP) Act 2023 (Section 12)**
    *   **General Data Protection Regulation (GDPR Article 17 - Right to Erasure)**
    *   **California Consumer Privacy Act (CCPA)**
*   **Opt-Out Registry**: Step-by-step unlisting guides for directories (Truecaller unlisting, Justdial, Spokeo, Whitepages) linked to an interactive todo checklist.
*   **System Health Dashboard (Admin-only)**: Live RAM, CPU core loads, uptime statistics, security audit logs, and feedback logs monitor.

---

## 🛠️ Technology Stack

*   **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, Lucide Icons, Leaflet / React-Leaflet (OpenStreetMap).
*   **Backend**: Node.js Express, TypeScript, Zod validation, JWT security, Rate-limiting, Helmet.
*   **Database**: PostgreSQL, Prisma ORM.

---

## ⚙️ Quick Start Installation

Follow these steps to configure and run the full stack locally:

### 1. Boot PostgreSQL Database
Ensure you have Docker running, then start the container:
```bash
docker-compose up -d
```
*Note: The container maps to port `5436` to avoid system port collisions.*

### 2. Configure Environment Variables
Copy the template to activate config files:
```bash
cp .env.example .env
```
Confirm `DATABASE_URL` is set to:
`DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5436/privacy_db?schema=public"`

### 3. Setup Backend & Seed Database
Install dependencies, push schemas, and seed user records:
```bash
# Install packages
npm install --prefix backend

# Push database schema tables
# (Windows PowerShell syntax. On Linux/macOS, prepend normal ENV vars)
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5436/privacy_db?schema=public"
node backend/node_modules/prisma/build/index.js db push --schema backend/prisma/schema.prisma

# Seed users & breaches
npx ts-node backend/prisma/seed.ts
```

### 4. Setup Frontend
Install client dependencies:
```bash
npm install --prefix frontend
```

### 5. Launch Servers
Start the Express API:
```bash
npm run dev --prefix backend
# Server live at http://localhost:5000
```

Start the Next.js Client:
```bash
npm run dev --prefix frontend
# Client live at http://localhost:3000
```

---

## 🔑 Default Credentials

Login at `http://localhost:3000/login` using the pre-seeded accounts:

*   **Standard Test User**:
    *   **Email**: `user@privacy.org`
    *   **Password**: `UserSecurePass2026!`
*   **System Administrator**:
    *   **Email**: `admin@privacy.org`
    *   **Password**: `AdminSecurePass2026!`

---

## 📂 Documentation Directory

Detailed specifications and architectural graphs are available in the `/docs` directory:
*   [Software Requirements Specification (SRS)](file:///d:/cs/digital-footprint-analyzer/docs/srs.md)
*   [UML, ER & Flow Diagrams](file:///d:/cs/digital-footprint-analyzer/docs/diagrams.md)
*   [REST API Endpoints Guide](file:///d:/cs/digital-footprint-analyzer/docs/api_docs.md)
*   [Detailed User Manual](file:///d:/cs/digital-footprint-analyzer/docs/user_manual.md)
