# UML, ER & Architecture Diagrams

This document contains Mermaid diagrams illustrating the database design, sequence flows, use cases, and software architecture of the Aegis platform.

---

## 1. Entity-Relationship (ER) Diagram

Describes the PostgreSQL tables and relations mapped by Prisma ORM:

```mermaid
erDiagram
    USER ||--o{ SCAN : triggers
    USER ||--o{ CLEANING_TASK : manages
    USER ||--o{ AUDIT_LOG : generates
    SCAN ||--o{ FINDING : contains

    USER {
        string id PK
        string email UNIQUE
        string passwordHash
        string name
        enum role
        datetime createdAt
        datetime updatedAt
    }

    SCAN {
        string id PK
        string userId FK
        string target
        enum type
        int riskScore
        datetime createdAt
      }

    FINDING {
        string id PK
        string scanId FK
        string category
        string severity
        string title
        string description
        string remediation
        string rawJson
        datetime createdAt
    }

    CLEANING_TASK {
        string id PK
        string userId FK
        string title
        string category
        string details
        string optOutUrl
        boolean isCompleted
        datetime sentDate
        datetime createdAt
    }

    AUDIT_LOG {
        string id PK
        string userId FK
        string action
        string details
        datetime createdAt
    }

    FEEDBACK {
        string id PK
        string name
        string email
        string message
        datetime createdAt
    }
```

---

## 2. System Architecture Diagram

Highlights the decoupled client-server structure and self-contained OSINT modules:

```mermaid
graph TD
    Client[Next.js App Client] <-->|HTTPS/JSON/JWT| AppServer[Node.js Express Server]
    
    subgraph Express Backend
        AppServer -->|Auth Middleware| Controller[API Controllers]
        Controller -->|Prisma Client| DB[(PostgreSQL Database)]
        
        Controller -->|Recursive Coordinator| Mapper[Recursive mapper]
        
        Mapper -->|Probe requests| Sherlock[Sherlock / Tookie prober]
        Mapper -->|Google OSINT| GHunt[GHunt Analyzer]
        Mapper -->|Check Leaks| LeakDB[Local Breach Resolver]
        Mapper -->|Face Search| FaceCheck[FaceCheck.ID API & SmartImage]
        
        Controller -->|Upload Parsers| Parsers[Binary Parsers & Strippers]
        Parsers -->|JPEG EXIF| EXIF[EXIF Buffer Parser]
        Parsers -->|DOCX ZIP| DOCX[XML docProps Parser]
        Parsers -->|PDF Trailer| PDF[PDF Catalog Parser]
    end
```

---

## 3. Scan & Pivot Sequence Diagram

Illustrates the recursive data flow when running an OSINT username check:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Next.js Dashboard
    participant Backend as Express Scan Controller
    participant Mapper as Recursive mapper
    participant Prober as Username Prober
    participant GHunt as GHunt Google OSINT
    participant Leaks as Local Leak DB
    participant DB as PostgreSQL

    User->>Frontend: Input Username & Click Scan
    Frontend->>Backend: POST /api/scan/recursive (JWT)
    Backend->>Mapper: runRecursiveScan(target)
    
    Mapper->>Prober: probeUsername(username)
    Prober-->>Mapper: Return found profiles (e.g. GitHub)
    
    Note over Mapper: Scraping Pivot:<br/>Extract email address from GitHub profile (e.g. user@gmail.com)
    
    Mapper->>Leaks: lookupBreaches(user@gmail.com)
    Leaks-->>Mapper: Return leaked credentials (Canva hack, etc.)
    
    Mapper->>GHunt: scanGoogleAccount(user@gmail.com)
    GHunt-->>Mapper: Return Gaia ID & Maps Review Coordinates
    
    Mapper->>Mapper: Calculate aggregated Risk Score (0-100)
    Mapper-->>Backend: Compiled Graph & Findings payload
    Backend->>DB: Save Scan & Finding records
    Backend-->>Frontend: Return Scan ID & Graph Data
    Frontend-->>User: Render Risk Meter, Node Graph, & Advice
```

---

## 4. UML Use Case Diagram

Defines user and administrator capabilities:

```mermaid
leftToRightDirection
actor User
actor Admin

rectangle Aegis Platform {
    User --> (Register / Login)
    User --> (Run Footprint Scan)
    User --> (Upload & Strip File Metadata)
    User --> (Generate GDPR/DPDP Opt-Out Letters)
    User --> (Track Cleaning checklist Tasks)
    User --> (Export Profile Data)
    User --> (Delete Account)
    
    Admin --> (View System Health Stats)
    Admin --> (Manage Registered Users)
    Admin --> (View Audit Security Logs)
    Admin --> (Clear Feedback Inbox)
}
```
