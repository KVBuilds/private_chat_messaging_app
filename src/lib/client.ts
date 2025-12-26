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

// Create client dynamically on each access to ensure we always use current origin
// This is important for Vercel deployments where the origin changes
// The client is created fresh each time a property is accessed (in browser context)
export const client = new Proxy({} as ReturnType<typeof treaty<App>>['api'], {
  get(_target, prop) {
    // Always get fresh URL at runtime - this ensures window.location.origin is current
    const apiUrl = getApiUrl()
    const freshClient = treaty<App>(apiUrl).api
    const value = (freshClient as Record<string | symbol, unknown>)[prop]
    // If it's a function, bind it to maintain 'this' context
    if (typeof value === 'function') {
      return value.bind(freshClient)
    }
    return value
  }
})
