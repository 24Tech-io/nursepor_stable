# Admin Dashboard - LMS Platform

Separate admin application running on port 3001.

## Setup

1. Install dependencies:
```bash
cd admin-app
npm install
```

2. Copy environment variables:
```bash
cp ../.env.local .env.local
```

3. Run the admin app:
```bash
npm run dev
```

The admin dashboard will be available at http://localhost:3001

## Features

- Admin-only login (port 3001)
- Course management
- Q-Bank creation with 10 NGN question formats
- Registration form management
- No authentication barriers - direct access after login

## Question Formats Supported

1. Matrix Multiple Response
2. Multiple Response: Select N
3. Multiple Response: SATA
4. Extended Multiple Response
5. Extended Drag-and-Drop
6. Cloze/Drop-Down
7. Bow-Tie
8. Trend Item
9. Ranking Items
10. Case Study (6-step CJMM)

## Port Configuration

- Student App: Port 3000 (student-only)
- Admin App: Port 3001 (admin-only)

