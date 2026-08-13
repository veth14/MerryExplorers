<div align="center">

<img src="public/LOGO-noBG.png" alt="Merry Explorers Logo" width="160" />

# Merry Explorers

**Operations dashboard for Merry Explorers Playgroup and Learning Center**

Attendance · Payroll · Leaves · Announcements — one platform for admins and teaching staff

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com)
[![Status](https://img.shields.io/badge/status-private-lightgrey)]()

</div>

---

## Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

Merry Explorers is an internal operations platform built with Next.js, serving two role-based portals:

| Portal | Who it's for | What it does |
|---|---|---|
| 🛠️ **Admin Dashboard** | Admins, executive partners, developers | Attendance oversight, payroll, leave approvals, announcements, inquiries, teacher records, audit log, reports |
| 🍎 **Teacher Dashboard** | Teaching staff | Camera-based clock in/out, attendance history, leave requests, announcements, profile, support |

Routes are protected in middleware (`src/proxy.ts`), which reads a session cookie and role claim to keep admins and teachers in their respective areas of the app.

---

## Features

- 📷 **Camera-based attendance** — webcam clock-in/clock-out with motion/variance-based liveness detection (`teacher/clock`)
- ⚙️ **Attendance rules engine** — configurable rules for lateness, offsets, and auto-deductions (`src/lib/attendance-rules.ts`)
- 💰 **Payroll** — status tracking, summaries, and deduction management
- 📝 **Leave management** — request and approval workflow for teacher leaves
- 📢 **Announcements** — admin-authored announcements surfaced to teachers
- 📬 **Inquiries & support** — public inquiry form plus an in-app bug/contact form with automated email notifications
- 🔍 **Audit log** — tracks key administrative actions
- 📊 **Reports** — aggregate views for admins
- 🧹 **Scheduled cleanup** — weekly cron job (`/api/cron/cleanup-images`) prunes stored images

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Webpack build), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Data / Backend | Firebase, MongoDB, Supabase |
| Email | Nodemailer, Gmail API (`googleapis`) |
| Animation | Framer Motion |
| Image handling | `browser-image-compression` |
| Deployment | Vercel |

---

## Project Structure

```text
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

---

## Getting Started

### Prerequisites

- Node.js
- Credentials for Firebase, MongoDB, Supabase, and Google (Gmail API), depending on which features you're running

### Installation

```bash
npm install
```

### Environment Variables

This project connects to Firebase, MongoDB, Supabase, and the Gmail API. Create a `.env.local` file with credentials for each before running the app. The exact variables each client expects are defined in:

- `src/lib/firebase.ts`
- `src/lib/mongodb.ts`
- `src/lib/supabase.ts`
- `src/lib/gmail-client.ts`

### Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

---

## Deployment

Configured for [Vercel](https://vercel.com), including a scheduled weekly cron job for image cleanup (see `vercel.json`).

---

## License

Private project — not licensed for public use.

<div align="center">

Made for 🎈 **Merry Explorers Playgroup and Learning Center**

</div>