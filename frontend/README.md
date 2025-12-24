# AI Receptionist Frontend

A modern, responsive frontend for the AI Receptionist SaaS platform built with React, TypeScript, and Tailwind CSS.

## Tech Stack

- **React 18** - UI Framework
- **TypeScript 5** - Type Safety
- **Vite 5** - Build Tool
- **Tailwind CSS 3** - Styling
- **TanStack Query 5** - Server State Management
- **Zustand 4** - Client State Management
- **React Hook Form 7** - Form Handling
- **Zod 3** - Validation
- **Framer Motion 10** - Animations
- **Recharts 2** - Charts
- **Radix UI** - Accessible Components
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone or copy the project files to your directory

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
```

The build output will be in the `dist` folder.

## Project Structure

```
src/
├── app/                    # App entry, routes, providers
├── assets/                 # Static assets (images, fonts)
├── components/
│   ├── ui/                # Base UI components (Button, Input, etc.)
│   ├── layout/            # Layout components (AppShell, Sidebar, Header)
│   ├── shared/            # Shared components (LoadingScreen, EmptyState)
│   ├── cards/             # Card components (StatsCard)
│   ├── ai/                # AI-specific components (AIStatusWidget)
│   └── forms/             # Form components
├── features/
│   └── auth/              # Authentication feature
├── lib/
│   ├── api/               # API client and helpers
│   ├── utils/             # Utility functions
│   └── hooks/             # Custom hooks
├── pages/                 # Page components
│   ├── auth/              # Login, Signup, Forgot Password
│   ├── dashboard/         # Dashboard
│   ├── appointments/      # Appointments calendar
│   ├── customers/         # Customer management
│   ├── staff/             # Staff management
│   ├── services/          # Services management
│   ├── calls/             # Call logs
│   ├── ai-config/         # AI configuration
│   ├── messaging/         # SMS/Email messaging
│   ├── settings/          # Settings pages
│   ├── onboarding/        # Onboarding flow
│   └── errors/            # Error pages
├── stores/                # Zustand stores
├── types/                 # TypeScript types
└── styles/                # Global styles
```

## Features

- 🔐 **Authentication** - Login, Signup, Password Reset
- 📊 **Dashboard** - Overview stats, charts, recent activity
- 📅 **Appointments** - Calendar view, booking, management
- 👥 **Customers** - Customer database, profiles, history
- 👨‍💼 **Staff** - Team management, availability, schedules
- 🛠️ **Services** - Service catalog management
- 📞 **Call Logs** - AI call history, transcripts
- 🤖 **AI Config** - AI roles, knowledge base, voice settings
- 💬 **Messaging** - SMS/Email templates and sending
- ⚙️ **Settings** - Business, billing, team, security settings
- 🌓 **Dark Mode** - Full dark theme support
- 📱 **Responsive** - Mobile-first design

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## API Integration

The frontend expects a REST API at the `VITE_API_URL`. Key endpoints:

- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/auth/me` - Get current user
- `GET /api/appointments` - List appointments
- `GET /api/customers` - List customers
- `GET /api/staff` - List staff
- `GET /api/calls` - List call logs
- etc.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
