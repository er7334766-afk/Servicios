# Plan: ServiApp — Mobile Service Marketplace

## Context
Build a production-quality mobile-first service marketplace (iOS/Android feel) that connects clients with independent workers for home services (plumbing, electrical, cleaning, construction, etc.). The design mirrors Uber/TaskRabbit: clean, trustworthy, blue/white/gray palette, mobile shell (max-w-[390px]). The app is fully mock (no backend) but all interactions — chat, reviews, agenda, job posts — feel real.

---

## Architecture Overview

### Tech Stack (already installed)
- React 18 + TypeScript, Tailwind CSS 4
- `react-router` v7 — `createBrowserRouter` + `RouterProvider`
- `motion` from `"motion/react"` — page transitions and micro-animations
- `react-hook-form` v7.55.0 — Auth and Review forms
- `sonner` — toast notifications
- `lucide-react` — all icons
- Shadcn/ui components in `src/app/components/ui/` — Button, Input, Tabs, Card, Avatar, Badge, Sheet, Dialog, Switch, Slider, Calendar, ScrollArea, Separator, Skeleton

### Color Theme Override (in `src/styles/theme.css`)
```css
:root {
  --primary: oklch(0.45 0.2 262);       /* #1A56DB trust blue */
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.97 0.015 262);   /* #F0F4FF light blue bg */
  --background: oklch(0.98 0.008 262);  /* #F8FAFF */
  --card: oklch(1 0 0);
  --foreground: oklch(0.12 0.02 262);   /* #0F172A */
  --muted-foreground: oklch(0.52 0.03 262); /* #64748B */
  --border: oklch(0.92 0.02 262);
}
```

---

## File Structure (all files to create)

```
src/app/
├── App.tsx                          MODIFY — RouterProvider + AppProvider
├── routes.tsx                       CREATE — createBrowserRouter config
├── context/
│   └── AppContext.tsx               CREATE — global role/user/chat state
├── types/
│   └── index.ts                     CREATE — all TypeScript interfaces
├── data/
│   └── mockData.ts                  CREATE — 10 workers, reviews, chats, agenda
└── components/
    ├── layout/
    │   ├── MobileShell.tsx          CREATE — 390px frame + outlet + bottom nav
    │   ├── BottomNav.tsx            CREATE — role-aware 5-tab bar
    │   └── Header.tsx               CREATE — back button + title + right slot
    ├── shared/
    │   ├── WorkerCard.tsx           CREATE — compact & full variants
    │   ├── StarRating.tsx           CREATE — read-only + interactive
    │   ├── ServiceCategoryGrid.tsx  CREATE — 8-category icon grid
    │   └── ReviewCard.tsx           CREATE — single review row
    └── screens/
        ├── LandingScreen.tsx        CREATE
        ├── AuthScreen.tsx           CREATE
        ├── HomeClientScreen.tsx     CREATE
        ├── HomeWorkerScreen.tsx     CREATE
        ├── SearchScreen.tsx         CREATE
        ├── WorkerProfileScreen.tsx  CREATE
        ├── ClientProfileScreen.tsx  CREATE
        ├── ChatListScreen.tsx       CREATE
        ├── ChatScreen.tsx           CREATE
        ├── AgendaScreen.tsx         CREATE
        ├── ReviewScreen.tsx         CREATE
        ├── ReportScreen.tsx         CREATE
        └── NotificationsScreen.tsx  CREATE
```

---

## TypeScript Types (`src/app/types/index.ts`)

Key interfaces:
- `Role = 'client' | 'worker'`
- `ServiceCategory` — 8 values (plomeria, electricidad, limpieza, construccion, pintura, carpinteria, jardineria, electrodomesticos)
- `Worker extends User` — categories, rating, reviewCount, jobCount, bio, distanceKm, pricePerHour, isAvailable, galleryUrls, services[]
- `Client extends User` — serviceHistory: Booking[]
- `Booking` — workerId, clientId, category, status (pending | accepted | in_progress | completed | cancelled), date, price
- `JobPost` — client-posted job request that workers can accept
- `Review` — overall + punctuality + quality + communication ratings (1–5), comment
- `Conversation` + `ChatMessage` — chat with text/image, read status, online indicator
- `AgendaSlot` — date, startTime, endTime, available, bookingId?
- `Notification` — type, title, body, read
- `AppContextType` — role, currentUser, isAuthenticated, conversations, addMessage, notifications, workerAvailability, agendaSlots, selectedWorkerId

---

## Mock Data (`src/app/data/mockData.ts`)

**10 Worker profiles** with real Unsplash portrait URLs:
- Carlos Mendoza — plomería/construcción — `photo-1530983822321-fcac2d3c0f06` — 4.8★ 189 jobs
- Ana García — limpieza — `photo-1574320200624-96b6e093f695` — 4.9★ 312 jobs
- Roberto Herrera — electricidad — `photo-1649769069590-268b0b994462` — 4.7★ 156 jobs
- María López — limpieza/jardinería — `photo-1533642207954-50a3b9feafc1` — 4.6★ 98 jobs
- Jorge Soto — carpintería — `photo-1548778797-7d8cf3eefd24` — 4.8★ 203 jobs
- Luis Ramírez — pintura — `photo-1605018787514-72c0eff870bc` — 4.5★ 87 jobs
- Patricia Vega — electrodomésticos — `photo-1707897283701-40d6f55b8738` — 4.9★ 241 jobs
- Andrés Morales — construcción — `photo-1659353591742-9fa64d94738e` — 4.3★ 74 jobs
- Elena Castro — limpieza profunda — `photo-1608034802731-97a868788e11` — 4.7★ 167 jobs
- Miguel Torres — plomería/electricidad — `photo-1709863990963-30e6d4e9cacc` — 4.6★ 134 jobs

**Gallery images** (work photos): construction/plumbing Unsplash photos (`photo-1768321918210`, `photo-1768321915339`, `photo-1768321913976`, `photo-1768321910936`) and home interiors (`photo-1665249934445`, `photo-1613575831056`, `photo-1653972233229`)

**Service categories** (8): each with label (Spanish), lucide icon name, accent color

**Mock reviews** (15 total across workers), **3 conversations** with pre-seeded messages, **5 notifications**, **28 agenda slots** for current worker

**Mock clients** (2): current logged-in client + one additional for chat

---

## Routing (`src/app/routes.tsx`)

```
/                 → LandingScreen       (no shell)
/auth             → AuthScreen          (no shell)
/home             → MobileShell (layout)
  index           → HomeRouter          (renders Client or Worker home by role)
  search          → SearchScreen
  worker/:id      → WorkerProfileScreen
  profile         → ProfileRouter       (Client or Worker own profile)
  chat            → ChatListScreen
  chat/:id        → ChatScreen
  agenda          → AgendaScreen        (calendar for worker, history for client)
  review/:id      → ReviewScreen
  report          → ReportScreen
  notifications   → NotificationsScreen
*                 → redirect to /
```

`HomeRouter` and `ProfileRouter` are tiny inline components that branch by `role` from context.

---

## Screen Implementation Details

### LandingScreen
- Full-bleed gradient `from-[#1A56DB] to-[#0F3BA6]`, white text
- Logo + "ServiApp" title at top
- Hero image (Unsplash home interior, rounded-3xl with dark overlay)
- Two animated role cards: "Soy Cliente" (User icon) + "Soy Trabajador" (Briefcase icon)
- Clicking role card: sets `role` in context, navigates to `/auth`
- motion.div spring-in animation on cards (staggered 0.1s)

### AuthScreen
- Tabs: "Iniciar Sesión" | "Registrarse"
- react-hook-form validation (email, password required; confirm password match)
- Mock login always succeeds → sets `currentUser` → navigate `/home`
- Social login buttons (Google/Apple — decorative only)

### HomeClientScreen
- Greeting header + avatar + notification bell (unread dot)
- Search bar (tap → navigates to SearchScreen)
- `ServiceCategoryGrid` (horizontal scroll, 2 rows × 4)
- "Trabajadores Destacados" — horizontal scroll of 3 compact `WorkerCard` (top-rated)
- "Solicitudes Recientes" — 2 JobPost cards the user posted

### HomeWorkerScreen
- Header with name + availability `Switch` toggle (green when available)
- Stats row: earnings this week, jobs this month, average rating
- "Próximos trabajos" — 2–3 upcoming Booking cards with colored status badges
- "Nuevas solicitudes" — 2 JobPost cards with "Aceptar" button

### SearchScreen
- shadcn `Tabs`: "Explorar Servicios" | "Publicar Trabajo"
- **Tab A**: Filter chips (category), sort selector (distance/rating/price), `WorkerCard` list (full variant), each tappable
- **Tab B**: Form (category, title, description, budget Slider, date Calendar, address), "Publicar" CTA + suggested workers below

### WorkerProfileScreen
- `useParams` to get `:id` → lookup in MOCK_WORKERS
- Hero: full-width photo + overlapping avatar, back button overlay
- Name, location+distance, availability badge, stats row (rating, jobs, price/hr)
- Bio section, services chips, photo gallery (3-col grid)
- Reviews list (ReviewCard × 3)
- Sticky bottom: "Chat" outline button + "Contratar" primary button

### ChatListScreen
- Search bar
- Conversation list: avatar + online dot + name + last message + time + unread badge
- motion stagger on list items

### ChatScreen
- Header: back + name + online status indicator
- ScrollArea message list (auto-scroll bottom)
- Sent bubbles (right, primary blue) / received (left, gray-100)
- Input bar: text + image button + send — calls `addMessage` from context

### AgendaScreen
- Worker view: week/month toggle, weekly 7-col grid, monthly shadcn Calendar
- Booking list below with colored status badges (pending=amber, in_progress=blue, completed=green)
- "Gestionar disponibilidad" → shadcn Sheet with hourly slot toggles
- Client view: booking history grouped by Active / Upcoming / Past

### ReviewScreen
- Worker summary card
- Large interactive `StarRating` (overall)
- 3 sub-criteria rows with smaller star ratings: Puntualidad, Calidad, Comunicación
- Comment textarea
- Submit → sonner toast "Reseña enviada" → navigate back

### ReportScreen
- Category Select (5 options in Spanish)
- Description Textarea (min 50 chars, character counter)
- Photo upload zone (dashed border, shows preview)
- Submit → success toast

### NotificationsScreen
- Grouped "Hoy" / "Esta semana"
- Colored icon per type, unread dot, tap to mark read
- "Marcar todo leído" header button

---

## Shared Components

### MobileShell.tsx
```
outer: min-h-screen bg-slate-100 flex items-center justify-center
inner: w-full max-w-[390px] h-[844px] bg-background flex flex-col overflow-hidden relative shadow-2xl rounded-[40px]
content: flex-1 overflow-y-auto (scrollable)
bottom: fixed BottomNav (sticky within shell)
motion.div key={pathname} with x:20→0, opacity:0→1 slide transition
```

### BottomNav.tsx
- 5 tabs; icons + labels; active = `text-primary`, inactive = `text-muted-foreground`
- Client tabs: Inicio, Buscar, Chat (unread badge), Perfil, Historial
- Worker tabs: Inicio, Explorar, Chat (unread badge), Perfil, Agenda
- `whileTap={{ scale: 0.85 }}` via motion

### StarRating.tsx
- Props: `value`, `max=5`, `interactive?`, `onChange?`, `size='md'`
- Filled/empty Star icons from lucide-react; interactive: hover + click

### WorkerCard.tsx
- `compact`: 160px card (for horizontal scroll — avatar, name, badge, stars, distance)
- `full`: horizontal layout (for search list — same info + price/hr + "Ver perfil" button)

### ServiceCategoryGrid.tsx
- 8 items in `grid grid-cols-4 gap-3`; each: colored icon square + label

### ReviewCard.tsx
- Avatar + name + date + overall stars + comment text

---

## Animation Strategy
- Page transitions: `motion.div key={location.pathname}` in MobileShell outlet wrapper
- Landing cards: spring stagger (delay 0.1, 0.2)
- Chat list items: `staggerChildren: 0.04`
- BottomNav icons: `whileTap={{ scale: 0.85 }}`
- WorkerCard: `whileTap={{ scale: 0.97 }}`
- Stars (interactive): `whileHover={{ scale: 1.2 }}`

---

## Build Order
1. `types/index.ts` + `data/mockData.ts` + `context/AppContext.tsx` — foundation
2. `styles/theme.css` override + `App.tsx` + `routes.tsx` — wiring
3. `layout/MobileShell.tsx` + `BottomNav.tsx` + `Header.tsx` — shell
4. `shared/` components — reusables
5. `LandingScreen` + `AuthScreen` — entry flow
6. `HomeClientScreen` + `HomeWorkerScreen` + `SearchScreen` + `WorkerProfileScreen` — core
7. `ChatListScreen` + `ChatScreen` + `NotificationsScreen` — communication
8. `ClientProfileScreen` + `AgendaScreen` — profile & scheduling
9. `ReviewScreen` + `ReportScreen` — post-service flows

---

## Verification
1. App renders at `/` as LandingScreen with two role cards
2. Clicking "Soy Cliente" → `/auth` → login → `/home` shows client home with workers, search bar, categories
3. Clicking "Soy Trabajador" → same flow → worker home shows stats, toggle, job requests
4. SearchScreen Tab A: filter by category, sort, tap worker → WorkerProfile with gallery + reviews + chat/hire buttons
5. Chat: open conversation, send message, bubble appears right-aligned
6. Worker Agenda: week view shows colored bookings
7. Review flow: 5-star interactive input + sub-criteria + submit toast
8. Report flow: form submits with success toast
9. BottomNav badge shows unread count on Chat tab
10. Role switch: changing role updates BottomNav tabs and home screen content
