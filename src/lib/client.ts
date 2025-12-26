import { treaty } from '@elysiajs/eden'
import type { App } from '../app/api/[[...slugs]]/route'

// Get the API base URL - works in both development and production (Vercel)
// Uses environment variable if set, otherwise detects current origin
// This function MUST be called at runtime in the browser, not at module load time
const getApiUrl = (): string => {
  // Priority 1: Environment variable (for custom deployments)
  // NEXT_PUBLIC_* vars are available at runtime in the browser
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // Priority 2: Current origin (works in browser - both localhost and Vercel)
  // This is the key - window.location.origin will be the Vercel URL in production
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Priority 3: Fallback for server-side (shouldn't happen in client components)
  // This should never be used in client components, but needed for type safety
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
}

// Cache the client instance but create it lazily at runtime
// This ensures window.location.origin is available when the client is first accessed
let clientInstance: ReturnType<typeof treaty<App>>['api'] | null = null

const getClient = (): ReturnType<typeof treaty<App>>['api'] => {
  if (!clientInstance) {
    // Create client at runtime - this will use window.location.origin in browser
    // Only runs when first accessed (not at module load time)
    const apiUrl = getApiUrl()
    clientInstance = treaty<App>(apiUrl).api
  }
  return clientInstance
}

// Use a Proxy to ensure client is created lazily on first property access
// This maintains Eden Treaty's route structure while ensuring runtime URL resolution
export const client = new Proxy({} as ReturnType<typeof treaty<App>>['api'], {
  get(_target, prop) {
    const client = getClient()
    return (client as Record<string | symbol, unknown>)[prop]
  }
})
