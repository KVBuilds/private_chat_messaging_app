import { treaty } from '@elysiajs/eden'
import type { App } from '../app/api/[[...slugs]]/route'

// Get the API base URL - works in both development and production (Vercel)
// Uses environment variable if set, otherwise detects current origin
const getApiUrl = (): string => {
  // Priority 1: Environment variable (for custom deployments)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // Priority 2: Current origin (works in browser - both localhost and Vercel)
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Priority 3: Fallback for server-side (shouldn't happen in client components)
  return 'http://localhost:3000'
}

// .api to enter /api prefix - typesafe to call front and backend
export const client = treaty<App>(getApiUrl()).api
