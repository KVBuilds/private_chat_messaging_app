# Private Chat Messaging App

A real-time, self-destructing chat application built with **Next.js 16**, **Elysia**, and **Upstash Redis/Realtime**. This project demonstrates modern full-stack architecture patterns, real-time messaging, and Next.js 14+ App Router best practices.

## 🚀 Features

- **Real-time messaging** with instant message delivery
- **Self-destructing rooms** with automatic expiration (10 minutes)
- **Private rooms** limited to 2 users maximum
- **Type-safe API** using Elysia with Eden Treaty
- **Server Components** by default with Client Components only when needed
- **Real-time subscriptions** using Upstash Realtime
- **Redis-backed persistence** with automatic cleanup
- **Modern UI** with Tailwind CSS 4

## 🏗️ Architecture Overview

### Messaging & Backend Connection Patterns

This application demonstrates several modern patterns for connecting frontend and backend:

#### 1. **API Route Pattern (Next.js App Router)**
```typescript
// src/app/api/[[...slugs]]/route.ts
export const GET = app.fetch
export const POST = app.fetch
export const DELETE = app.fetch
```
- Uses Next.js catch-all routes `[[...slugs]]` to handle all API endpoints
- Integrates Elysia framework directly into Next.js API routes
- Enables type-safe API calls from the frontend

#### 2. **Type-Safe Client Pattern (Eden Treaty)**
```typescript
// src/lib/client.ts
export const client = treaty<App>('localhost:3000').api
```
- **Eden Treaty** provides end-to-end type safety
- Frontend automatically knows all available API endpoints
- TypeScript infers request/response types from backend schema
- No manual API client code needed

#### 3. **Real-time Pub/Sub Pattern (Upstash Realtime)**
```typescript
// Server: Emit events
await realtime.channel(roomId).emit("chat.message", message)

// Client: Subscribe to events
useRealtime({
  channels: [roomId],
  events: ["chat.message", "chat.destroy"],
  onData: ({ event }) => { /* handle event */ }
})
```
- **Server-Sent Events (SSE)** for real-time updates
- Channel-based pub/sub architecture
- Automatic reconnection and state management
- Type-safe event schemas with Zod

#### 4. **Middleware Pattern (Next.js Middleware)**
```typescript
// src/proxy.ts - Route-level authentication
export const proxy = async (req: NextRequest) => {
  // Validates room access before page loads
  // Sets authentication cookies
  // Enforces room capacity limits
}
```
- Runs before page rendering
- Handles authentication at the edge
- Can redirect or modify requests

#### 5. **Server Component + Client Component Hybrid**
- **Server Components** (default): Handle data fetching, SEO, initial render
- **Client Components** (`"use client"`): Handle interactivity, real-time updates, state
- Optimal performance with minimal JavaScript sent to client

### Data Flow Architecture

```
┌─────────────────┐
│   Client (UI)   │
└────────┬────────┘
         │
         ├─► HTTP Requests (Eden Treaty)
         │   └─► POST /api/messages
         │       GET /api/messages
         │
         ├─► Real-time Subscriptions (SSE)
         │   └─► GET /api/realtime?channel=roomId
         │       └─► Receives: chat.message, chat.destroy
         │
         └─► Middleware (proxy.ts)
             └─► Validates access before page load
                 └─► Sets auth cookies

┌─────────────────┐
│  Next.js API    │
│  (Elysia)       │
└────────┬────────┘
         │
         ├─► Auth Middleware
         │   └─► Validates tokens
         │   └─► Checks room membership
         │
         ├─► Business Logic
         │   └─► Room creation
         │   └─► Message handling
         │   └─► Room destruction
         │
         └─► Real-time Events
             └─► Emits to channels

┌─────────────────┐
│  Upstash Redis  │
└────────┬────────┘
         │
         ├─► Room Metadata (Hash)
         │   └─► meta:roomId
         │       ├─► connected: [tokens]
         │       └─► createdAt: timestamp
         │
         ├─► Messages (List)
         │   └─► messages:roomId
         │       └─► [message1, message2, ...]
         │
         └─► TTL Management
             └─► Auto-expiration after 10 minutes
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 16.1.1** - React framework with App Router
- **React 19.2.3** - Latest React with Server Components
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **TanStack Query 5** - Server state management
- **date-fns** - Date formatting

### Backend
- **Elysia 1.4.19** - Fast, type-safe web framework
- **Eden Treaty 1.4.6** - End-to-end type safety
- **Zod 4.2.1** - Schema validation

### Real-time & Storage
- **Upstash Redis 1.36.0** - Serverless Redis database
- **Upstash Realtime 1.0.0** - Real-time pub/sub with SSE

### Utilities
- **nanoid 5.1.6** - Unique ID generation

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/KVBuilds/private_chat_messaging_app.git
cd private_chat_messaging_app

# Install dependencies
bun install
# or
npm install
```

## ⚙️ Environment Setup

Create a `.env.local` file in the root directory:

```env
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
UPSTASH_REALTIME_URL=your_realtime_url
UPSTASH_REALTIME_TOKEN=your_realtime_token
```

Get these values from your [Upstash Console](https://console.upstash.com/).

## 🚀 Development

```bash
# Start development server
bun run dev
# or
npm run dev

# Build for production
bun run build

# Start production server
bun run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Next.js 14+ Features Demonstrated

### 1. **App Router Architecture**
- File-based routing with `app/` directory
- Route groups and dynamic routes `[roomId]`
- Catch-all routes `[[...slugs]]` for API endpoints

### 2. **Server Components by Default**
```typescript
// Server Component (default)
export default async function Page() {
  const data = await fetchData() // Runs on server
  return <div>{data}</div>
}

// Client Component (when needed)
"use client"
export default function InteractiveComponent() {
  const [state, setState] = useState() // Runs on client
  return <button onClick={...}>Click</button>
}
```

### 3. **Suspense Boundaries**
```typescript
// Wrapping useSearchParams() in Suspense
<Suspense fallback={<Loading />}>
  <HomeContent />
</Suspense>
```
- Required for `useSearchParams()` in Next.js 16
- Enables proper streaming and error boundaries

### 4. **Middleware for Authentication**
```typescript
// src/proxy.ts - Runs on edge before page load
export const proxy = async (req: NextRequest) => {
  // Validates access, sets cookies, redirects
}
```

### 5. **Type-Safe API Routes**
- Elysia provides runtime validation with Zod
- Eden Treaty provides compile-time type safety
- No manual type definitions needed

## 🔄 Real-time Messaging Patterns

### Pattern 1: Server-Sent Events (SSE)
**Used in this project:**
- Upstash Realtime uses SSE for real-time updates
- Long-lived HTTP connections
- Server pushes events to clients
- Automatic reconnection handling

**When to use:**
- One-way communication (server → client)
- Real-time updates, notifications
- Simpler than WebSockets for unidirectional data

### Pattern 2: WebSockets
**Alternative approach:**
```typescript
// Example WebSocket pattern (not used here)
const ws = new WebSocket('ws://localhost:3000')
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  // Handle message
}
```

**When to use:**
- Bidirectional communication needed
- Lower latency requirements
- More control over connection lifecycle

### Pattern 3: Polling
**Simple alternative:**
```typescript
// Polling pattern (not used here)
useEffect(() => {
  const interval = setInterval(() => {
    refetchMessages()
  }, 1000)
  return () => clearInterval(interval)
}, [])
```

**When to use:**
- Simple use cases
- No real-time infrastructure available
- Less efficient but easier to implement

### Pattern 4: HTTP/2 Server Push
**Advanced pattern:**
- Server proactively sends data
- Requires HTTP/2 support
- More complex setup

## 📚 Key Concepts Explained

### 1. **Type-Safe API with Eden Treaty**

Eden Treaty creates a bridge between your Elysia backend and TypeScript frontend:

```typescript
// Backend defines the API
const app = new Elysia()
  .post("/messages", ({ body }) => { ... })

// Frontend automatically gets types
const res = await client.messages.post({ text: "Hello" })
// TypeScript knows: res.data, res.status, etc.
```

**Benefits:**
- Compile-time type checking
- Autocomplete in IDE
- Refactoring safety
- No manual API documentation needed

### 2. **Server vs Client Components**

**Server Components** (default):
- Run on server only
- Can directly access databases, APIs
- No JavaScript sent to client
- Great for SEO, initial load performance

**Client Components** (`"use client"`):
- Run in browser
- Can use hooks, event handlers
- Interactive features
- State management

**Best Practice:** Use Server Components by default, Client Components only when needed.

### 3. **Real-time Event Flow**

```
1. User sends message
   └─► POST /api/messages
       └─► Server stores in Redis
       └─► Server emits: realtime.channel(roomId).emit("chat.message", message)

2. Other clients receive update
   └─► SSE connection receives event
   └─► useRealtime hook triggers callback
   └─► React Query refetches messages
   └─► UI updates automatically
```

### 4. **Authentication Pattern**

This app uses a **cookie-based token system**:

1. **Middleware (proxy.ts)** validates room access
2. **Sets cookie** with unique token per user
3. **Auth middleware** validates token on API calls
4. **Token stored in Redis** as part of room's connected users

**Why this pattern?**
- Simple, no external auth service needed
- Works with SSR/SSG
- Secure (httpOnly cookies)
- Room-scoped authentication

## 🗂️ Project Structure

```
realtime_chat/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── [[...slugs]]/     # Catch-all API routes (Elysia)
│   │   │   │   ├── route.ts      # Main API handlers
│   │   │   │   └── auth.ts       # Authentication middleware
│   │   │   └── realtime/         # Realtime SSE endpoint
│   │   ├── room/
│   │   │   └── [roomId]/         # Dynamic room route
│   │   │       └── page.tsx      # Room page (Client Component)
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx               # Home page
│   │   └── globals.css            # Global styles
│   ├── components/
│   │   └── providers.tsx          # React Query & Realtime providers
│   ├── hooks/
│   │   └── use-username.ts       # Username management hook
│   ├── lib/
│   │   ├── client.ts              # Eden Treaty client
│   │   ├── redis.ts               # Redis client
│   │   ├── realtime.ts             # Realtime server setup
│   │   └── realtime-client.ts     # Realtime client hook
│   └── proxy.ts                   # Next.js middleware
├── public/                         # Static assets
├── package.json
└── README.md
```

## 🔐 Security Features

- **Room capacity limits** (max 2 users)
- **Token-based authentication** per room
- **HttpOnly cookies** for secure token storage
- **Room validation** before access
- **Automatic room expiration** (10 minutes)
- **Input validation** with Zod schemas

## 🎨 UI/UX Features

- **Dark theme** with zinc color palette
- **Responsive design** with Tailwind CSS
- **Real-time message updates**
- **Auto-scroll** to latest messages
- **Room destruction** with visual feedback
- **Error states** for room not found/full
- **Loading states** for better UX

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

### Other Platforms

The app can be deployed to any platform supporting Next.js:
- **Netlify** - Next.js runtime
- **Railway** - Full control
- **AWS Amplify** - AWS integration
- **Docker** - Container deployment

## 📖 Learning Resources

### Next.js 14+ Features
- [App Router Documentation](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Suspense Boundaries](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)

### Real-time Patterns
- [Server-Sent Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [WebSockets vs SSE](https://ably.com/topic/websockets-vs-sse)
- [Upstash Realtime Docs](https://docs.upstash.com/realtime)

### Type-Safe APIs
- [Elysia Documentation](https://elysiajs.com/)
- [Eden Treaty](https://elysiajs.com/eden/treaty/overview.html)
- [Zod Validation](https://zod.dev/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Backend powered by [Elysia](https://elysiajs.com/)
- Real-time infrastructure by [Upstash](https://upstash.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

---

**Built with ❤️ using Next.js 16, React 19, and modern web technologies**
