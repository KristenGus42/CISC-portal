# CISC Legal Clinic Portal

An enterprise-grade web application built for the **Chinese Information and Service Center (CISC)** to streamline free legal clinic operations, client case intake, attorney schedule management, personnel administration, and intelligent legal recommendations.

Hosted Live: [https://cisclegalclinic.org](https://cisclegalclinic.org)

---

## 🌟 Key Features

### 📋 1. Case Library & Management (`CaseLibrary.jsx`, `EditForm.jsx`, `CasePreview.jsx`)
- **Comprehensive Case Directory**: View, search, filter, and manage all client cases in a centralized grid.
- **Advanced Filter & Sort Panel**:
  - Filter by **Legal Category**, **Client Language**, and **Case Status** (*Waitlisted*, *Scheduled*, *Archived*).
  - Sort by **Alphabetical Order**, **Date Added (Newest/Oldest)**, or **Clinic Date**.
  - Active filter chips with one-click remove and bulk clear options.
- **Intake & Case Editor (`EditForm.jsx`)**:
  - Full client intake questionnaire covering demographics, language preferences, household income, legal urgency, case description, and notes.
- **Slide-Over Case Preview (`CasePreview.jsx`)**:
  - Quick drawer view to inspect case details, contact info, and notes without navigating away from the page.
- **Analytics Export**:
  - One-click export of case metrics and clinic history to formatted Excel spreadsheets (`downloadCaseAnalytics`).

---

### 📅 2. Interactive Schedule & Waitlist (`Schedule.jsx`)
- **Drag-and-Drop Case Assignment**: Drag waitlisted client cards directly onto available attorney time slots powered by `@dnd-kit`.
- **Attorney Schedule Columns**: Visual column layout per attorney with horizontal scroll protection and responsive grid mechanics.
- **Time Slot Action Suite**:
  - **Legal Student Assignment**: Assign legal students to time slots with dynamic dropdowns.
  - **Interpreter Assignment**: Assign interpreters (Attorneys, Legal Students, or CISC Staff).
  - **Virtual Meeting Link Generator**: Generate Google Meet links automatically via integrated Google Calendar Cloud Functions or manual video links.
  - **Client Contact Modal**: Quick access to client email, phone number, and communication shortcuts.
- **Auto-Scrolling Marquee Text**: Custom `MarqueeText` component using `ResizeObserver` to smoothly scroll long client names and assigned personnel names back and forth when text overflows.
- **Responsive Layout**: Time slot cards maintain fixed 180px height, auto-stacking controls at widths <= 1300px, and a 300px fixed-width Waitlist panel.

---

### 👥 3. Personnel Library (`PersonnelLibrary.jsx`, `IndividualPersonnel.jsx`)
- **Roster Management**: Manage volunteer attorneys and legal students.
- **Specialty & Language Tracking**: Track personnel categories, spoken languages, contact emails, and phone numbers.
- **Individual Personnel Profiles**: Detailed views for updating staff credentials and clinic availability.

---

### 🔒 4. Access Management & Admin Controls (`AccessManagement.jsx`)
- **Admin Control Panel**: Centralized user governance for CISC portal administrators.
- **Invite New Users**: Send invitation emails with custom roles (*Staff*, *Admin*, *Attorney*, *Legal Student*).
- **User Directory Table**: Displays user **Name**, **Role**, **Status** (*Active*, *Pending*, *Disabled*), and **Joined Date**.
- **Filter & Sort Panel**: Filter by role and status; sort alphabetically or by joined date.
- **Bulk Operations**: Perform multi-select bulk actions including **Bulk Password Reset**, **Bulk Disable Accounts**, and **Bulk Remove Users**.

---

### 👤 5. User Profile & Account Settings (`Profile.jsx`)
- **Self-Service Profile**: Update display name and custom avatar picture (with automatic Firebase Storage upload/cleanup).
- **Multi-Node Sync**: Updates are synced across Firebase Auth, RTDB `users/` records, and personnel rosters (`attorneys/` or `legalStudents/`).
- **Account Actions**: Request password reset emails (`requestOwnPasswordReset`) or delete own account (`deleteOwnAccount`).

---

### 🤖 6. ML Legal Recommendation Engine (`server/ml_scripts`)
- **Intelligent Resource Matching**: Python Flask ML service analyzing legal case descriptions against scraped Washington court rules and legal resources (`courts.wa.gov`, `washingtonlawhelp.org`, `uscis.gov`) to recommend relevant legal articles, forms, and guidance.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 18, Vite, Vanilla CSS, `@dnd-kit` (Drag & Drop), Lucide / Bootstrap Icons, ExcelJS |
| **Backend / Cloud** | Firebase Cloud Functions (v2, Node 24), Firebase Realtime Database, Firebase Storage, Firebase Auth |
| **ML Engine** | Python 3.12, Flask, `uv` package manager, scikit-learn |
| **Hosting & Infra** | Firebase Hosting (`https://cisc-portal.web.app`) |

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js** (v20+ LTS)
- **Python** (v3.12+) & **`uv`** package manager

---

### 1. Frontend Setup (React / Vite)

```bash
cd client

# Install dependencies
npm install

# Start local development server
npm run dev
```
The client dev server will run at **http://localhost:5173**.

---

### 2. Backend Setup (Python Flask ML Engine)

Open a **second terminal**:

```bash
cd server

# Install Python dependencies via uv
uv sync

# Start the Flask ML recommendation server
uv run app.py
```
The Flask ML server will run at **http://localhost:5000**.

---

### 3. Firebase Cloud Functions (Local & Deployment)

Cloud Functions are located in `server/functions/`.

**Deploying Functions:**
```bash
# Always use npx to guarantee compatibility with Node.js v25+
npx -y firebase-tools@latest deploy --only functions
```

**Deploying Hosting:**
```bash
# Build production bundle
cd client && npm run build && cd ..

# Deploy static bundle to Firebase Hosting
npx -y firebase-tools@latest deploy --only hosting
```

---

## 🔑 User Roles & Security

- **Admin**: Full access to Access Management, Case Library, Schedule, Personnel Library, and system settings.
- **Staff**: Access to Case Library, Intake, Schedule, and Personnel Library.
- **Attorney / Legal Student**: Access to assigned cases, schedule slot assignments, and personal profile.

All sensitive user account modifications are protected by server-side Firebase Cloud Functions using the **Firebase Admin SDK**.

---

## 📜 License & Ownership

Developed for **Chinese Information and Service Center (CISC)**. All rights reserved.