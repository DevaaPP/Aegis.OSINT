# Software Requirements Specification (SRS)
## Project: Digital Footprint Analyzer & Privacy Cleaner (Aegis)

---

## 1. Introduction
### 1.1 Purpose
This document specifies the software requirements for the **Digital Footprint Analyzer & Privacy Cleaner** (Aegis) system. It details the functional and non-functional requirements, data flows, and security policies governing the application.

### 1.2 System Scope
Aegis is an ethical OSINT (Open Source Intelligence) auditing and privacy cleaning platform. It recursively Maps a user's exposed digital footprint (profiles, breaches, search indices, metadata, and geolocations) and provides active tools (unlisting guides and legal erasure request letters) to mitigate these risks.

---

## 2. Functional Requirements

### 2.1 User Authentication & Profile Settings
* **Registration & Login**: Secure signup/signin using hashed passwords (bcrypt) and session authentication (JWT).
* **Data Portability (Export)**: Users can download their profile, scan histories, and checklist records in a single JSON file.
* **Right to be Forgotten (Deletion)**: Wipes all user credentials, scan findings, and cleanup todo checklist rows instantly.

### 2.2 OSINT Scanning Suite
* **Sherlock Platform Prober**: Concurrent HTTP status verification against 20+ networks to identify profile handles.
* **GHunt Google Account Scanner**: Resolves Google Gaia ID, active channels, calendar settings, and review histories from target Gmail addresses.
* **Data Breach Checker**: Query-optimized local database indexing 1,000+ realistic breach records to identify leaks.
* **BBOT-style Recursive Mapper**: Auto-pivots from usernames to emails, to breaches, to geolocations, building a relational node graph.

### 2.3 File Metadata & Stripper Suite
* **Binary JPEG Parser**: Carves APP1 segments to extract camera serials, edit timestamps, and GPS coordinates.
* **XML Document Parser**: Unzips DOCX folders and extracts templates, company structures, and modifier names.
* **PDF Parser**: Matches document trailers to identify PDF author attributes.
* **Sanitizer (Stripper)**: Sanitizes metadata from JPEG, PDF, and DOCX files in-memory and returns them for download.

### 2.4 Privacy Cleaner Hub
* **Opt-Out Request Writer**: Pre-populates templates for GDPR Article 17, CCPA Right to Delete, and Section 12 of India's DPDP Act 2023.
* **Directories Registry**: Curated directory of opt-out links for international entities (Spokeo, Whitepages) and local Indian portals (Truecaller unlisting, Justdial).
* **Todo checklist**: Tracks user cleanup progress.

---

## 3. Non-Functional & Security Requirements

### 3.1 Security Controls
* **JWT Expirations**: JWT tokens expire in 7 days and must be signed with secure SHA-256 strings.
* **Rate Limiting**: Protects authentication endpoints (10 attempts/15m) and OSINT probers (30 scans/hr).
* **Middlewares**: Helmet header configurations, CORS restriction to authorized origins, and SQL Injection prevention via Prisma ORM.

### 3.2 Compliance
* **GDPR Compliance**: Implements Article 17 deletion, Article 20 portability, and limits scans to user-consented targets.
* **India DPDP Act Compliance**: Enables consent withdrawal under Section 6 and correction/erasure under Section 12.
