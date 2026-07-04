# REST API Endpoints Reference

All request and response bodies use JSON format. JWT Bearer authorization tokens must be sent via `Authorization: Bearer <token>` header for protected endpoints.

---

## 1. Authentication Service (`/api/auth`)

### 1.1 Register Account
* **URL**: `POST /api/auth/register`
* **Auth**: Public
* **Request Body**:
```json
{
  "email": "user@privacy.org",
  "password": "UserSecurePass2026!",
  "name": "John Doe"
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Account registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "u-uuid-string",
    "email": "user@privacy.org",
    "name": "John Doe",
    "role": "USER"
  }
}
```

### 1.2 Log In Account
* **URL**: `POST /api/auth/login`
* **Auth**: Public
* **Request Body**:
```json
{
  "email": "user@privacy.org",
  "password": "UserSecurePass2026!"
}
```
* **Response (200 OK)**: Returns JWT token and User parameters.

### 1.3 Export User Portfolio (GDPR Article 20)
* **URL**: `GET /api/auth/export`
* **Auth**: JWT Protected
* **Response (200 OK)**: Downloadable file attachment `privacy_dump_<uuid>.json` containing full user scans, findings, and checklist tasks history.

### 1.4 Delete Account (GDPR Article 17)
* **URL**: `DELETE /api/auth/delete`
* **Auth**: JWT Protected
* **Response (200 OK)**: Wipes all user database rows instantly.

---

## 2. Footprint OSINT Scanner (`/api/scan`)

### 2.1 Trigger Recursive Footprint Scan
* **URL**: `POST /api/scan/recursive`
* **Auth**: JWT Protected (Rate-limited: Max 30 scans/hr)
* **Request Body**:
```json
{
  "target": "johndoe_code",
  "type": "USERNAME"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "scanId": "scan-uuid",
  "riskScore": 45,
  "findings": [
    {
      "category": "Username Found",
      "severity": "LOW",
      "title": "Account active on GitHub",
      "description": "Public profile found using target username at URL: https://github.com/johndoe_code",
      "remediation": "Delete account if unused or restrict settings."
    }
  ],
  "graph": {
    "nodes": [
      { "id": "root", "label": "johndoe_code", "type": "ROOT", "severity": "INFO" }
    ],
    "links": []
  }
}
```

### 2.2 Analyze File Metadata
* **URL**: `POST /api/scan/metadata/analyze`
* **Auth**: JWT Protected
* **Request Body**:
```json
{
  "fileName": "avatar.jpg",
  "fileBase64": "/9j/4AAQSkZJRgABAQEASABIAAD..."
}
```
* **Response (200 OK)**: Returns extracted EXIF, GPS, camera model parameters and exposes risk ratings.

### 2.3 Strip File Metadata
* **URL**: `POST /api/scan/metadata/clean`
* **Auth**: JWT Protected
* **Request Body**:
```json
{
  "fileName": "avatar.jpg",
  "fileBase64": "/9j/4AAQSkZJRgABAQEASABIAAD..."
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Metadata stripped successfully",
  "fileName": "clean_avatar.jpg",
  "fileBase64": "/9j/4AAQSkZJRgABAQEASABIAAD..." // Wiped in-memory APP1 segment base64
}
```

---

## 3. Cleaning & Mitigation (`/api/clean`)

### 3.1 Generate Legal Opt-Out Request Letter
* **URL**: `POST /api/clean/letter`
* **Auth**: JWT Protected
* **Request Body**:
```json
{
  "jurisdiction": "DPDP",
  "userName": "John Doe",
  "userEmail": "johndoe@email.com",
  "userPhone": "+91 99999 88888",
  "targetCompany": "Truecaller Grievance Officer"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "letter": "Subject: Request for Erasure of Personal Data under Section 12...\n\nSincerely,\nJohn Doe"
}
```

### 3.2 Update Cleaning Task Status
* **URL**: `PUT /api/clean/tasks/:id`
* **Auth**: JWT Protected
* **Request Body**:
```json
{
  "isCompleted": true
}
```
* **Response (200 OK)**: Updates task completeness.
