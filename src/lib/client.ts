import { treaty } from '@elysiajs/eden'
import type { App } from '../app/api/[[...slugs]]/route'

// .api to enter /api prefix - typesafe to call front and backend
export const client = treaty<App>('localhost:3000').api
