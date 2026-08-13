# Merry Explorers

A Next.js dashboard for managing teacher attendance, payroll, leaves, and school communications — built for administrators and teaching staff on separate role-based dashboards.

## Overview

Merry Explorers is an internal operations platform with two main portals:

- **Admin dashboard** — attendance oversight, payroll, leave approvals, announcements, inquiries, teacher records, audit log, and reports
- **Teacher dashboard** — camera-based clock in/out, attendance history, leave requests, announcements, profile, and contact/support

Access is role-gated (`admin`, `teacher`, `executive partner`, `developer`) via session cookies checked in middleware, with admins and teachers routed to separate areas of the app.

## Features

- **Camera-based attendance** — webcam clock-in/clock-out flow with motion/variance-based liveness detection (`teacher/clock`)
- **Attendance rules engine** — configurable rules for lateness, offsets, and auto-deductions (`src/lib/attendance-rules.ts`)
- **Payroll** — payroll status, summaries, and deduction tracking
- **Leave management** — request and approval workflow for teacher leaves
- **Announcements** — admin-authored announcements surfaced to teachers
- **Inquiries & contact/support** — public inquiry form and an in-app bug/contact form with automated email notifications
- **Audit log** — tracks key administrative actions
- **Reports** — aggregate views for admins
- **Scheduled cleanup** — a weekly cron job (`/api/cron/cleanup-images`) prunes stored images

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router, Webpack build), React 19
- **Styling:** Tailwind CSS 4
- **Data/backend:** Firebase, MongoDB, Supabase (mixed usage across features — see `src/lib`)
- **Email:** Nodemailer, Gmail API (`googleapis`)
- **Animation:** Framer Motion
- **Image handling:** `browser-image-compression`
- **Deployment:** Vercel (with a configured cron job in `vercel.json`)

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── admin/         # Admin dashboard routes (attendance, payroll, leaves, etc.)
│   │   ├── teacher/       # Teacher dashboard routes (clock, history, leaves, etc.)
│   │   ├── login/
│   │   ├── forgot-password/
│   │   └── support/
│   ├── api/                # Route handlers (attendance, payroll, leaves, notifications, cron, etc.)
│   ├── contact/            # Public contact page
│   ├── inquire/            # Public inquiry page
│   └── location/           # Public location page
├── components/              # Shared UI components
├── data/                    # Static/seed data
├── lib/                     # Firebase, MongoDB, Supabase clients, auth, attendance rules, etc.
└── proxy.ts                 # Role-based route protection (Next.js middleware)
```

## Getting Started

### Prerequisites

- Node.js
- Accounts/credentials for Firebase, MongoDB, Supabase, and Google (Gmail API), depending on which features you're running

### Installation

```bash
npm install
```

### Environment Variables

This project connects to Firebase, MongoDB, Supabase, and the Gmail API. You'll need to create a `.env.local` file with the relevant credentials for each service before running the app — check `src/lib/firebase.ts`, `src/lib/mongodb.ts`, `src/lib/supabase.ts`, and `src/lib/gmail-client.ts` for the exact variables each client expects.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Other Scripts

```bash
npm run build     # Production build
npm run start     # Start production server
npm run lint       # Run ESLint
npm run format     # Format with Prettier
```

## Deployment

Configured for [Vercel](https://vercel.com), including a scheduled weekly cron job for image cleanup (`vercel.json`).

## License

Private project — not licensed for public use.