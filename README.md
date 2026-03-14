# Workout Tracker

A local-first, single-page workout tracking application built with React. Log sessions, track strength progression, and visualize trends — all stored privately in your browser with no backend or account required.

## Overview

Workout Tracker helps you plan and monitor resistance training. Build custom weekly programs, log exercises with live one-rep max (1RM) feedback, and watch your strength trend over time via projected charts.

## Key Features

### Dashboard
- Visual grid of 8 muscle groups with color-coded recency status
  - Green: trained within 4 days
  - Yellow: 5–7 days since last session
  - Red: 8+ days (overdue)
- Today's scheduled workout summary at a glance

### Program Builder
- Create and manage multiple workout programs
- 7-day weekly schedule grid — assign exercises to any day
- Configure target sets × reps per exercise

### Workout Logger
- Log sets in real-time during a session
- Live 1RM estimation as you input weight and reps (Epley formula)
- Body diagram highlighting muscles trained in the current session

### Progress Tracking
- Line chart of historical 1RM per exercise
- 8-week linear regression projection overlay
- Per-exercise history filterable by date range

### Settings
- Toggle between kg and lb
- Create custom exercises with muscle group mapping
- Deletion protection — prevents removing exercises used in active programs

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Storage | IndexedDB (`idb`) |
| Charts | Recharts |
| Styling | Plain CSS (dark theme) |
| Testing | Vitest + jsdom |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Running Tests

```bash
npm test
```

Unit tests cover core utilities: 1RM calculation, muscle status logic, and linear regression projection.
