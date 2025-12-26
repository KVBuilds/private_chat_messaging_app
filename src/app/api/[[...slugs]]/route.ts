import { redis } from '@/lib/redis'
import { Elysia } from 'elysia'
import { nanoid } from 'nanoid'
import { authMiddleware } from './auth'
import { z} from "zod"
import { Message, realtime } from '@/lib/realtime'

const ROOM_TTL_SECONDS = 60 * 10

const rooms = new Elysia({ prefix: '/room' }).post("/create", async () => {
    const roomId = nanoid()
    await redis.hset(`meta:${roomId}`, {
        connected: JSON.stringify([]), // Store as JSON string for consistency
        createdAt: Date.now().toString(),

    })
    //auto deletion part 
    await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS)
    return {
        roomId,
    }
}).use(authMiddleware).get("/ttl", async ({auth}) => {
    const ttl = await redis.ttl(`meta:${auth.roomId}`)
    return {ttl: ttl > 0 ? ttl : 0}
},
   { query: z.object({ roomId: z.string()})
})
.delete("/", async ({auth}) => {
    // Emit destroy event first so clients are notified before deletion
    await realtime.channel(auth.roomId).emit("chat.destroy", {isDestroyed: true})
    
    // Then delete from Redis
    await Promise.all([
     redis.del(auth.roomId),
     redis.del(`meta:${auth.roomId}`),
     redis.del(`messages:${auth.roomId}`),
    ])
}, {query: z.object({roomId: z.string()})})

const messages = new Elysia({prefix: "/messages"}).use(authMiddleware).post("/", async ({body, auth}) => {
    const {sender, text} = body
    const {roomId} = auth

    const roomExists = await redis.exists(`meta:${roomId}`)
    if(!roomExists) {
        throw new Error("Room not found")
    } 
    const message: Message = {
        id: nanoid(),
        sender, 
        text,
        timestamp: Date.now(),
        roomId,
        token: auth.token,
    }

    //Add messages to history 
    const redisKey = `messages:${roomId}`
    await redis.rpush(redisKey, JSON.stringify(message))
    await realtime.channel(roomId).emit("chat.message", message)

    const remaining = await redis.ttl(`meta:${roomId}`)

    await Promise.all([
        redis.expire(`messages:${roomId}`, remaining),
        redis.expire(`history:${roomId}`, remaining),
        redis.expire(roomId, remaining)
    ])
    
    // Return the created message
    return { message }
},{
    query: z.object({roomId: z.string()}),
    body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
    }),
}).get("/", async ({ auth, query }) => {
    try {
        const roomId = auth.roomId || query.roomId
        const redisKey = `messages:${roomId}`
        const messagesRaw = await redis.lrange(redisKey, 0, -1)
        
        // Parse and mask token in each message appropriately
        const messages = messagesRaw
            .filter((raw) => raw != null)
            .map((raw) => {
                try {
                    let parsed: Message
                    
                    // Handle both string (JSON) and already-parsed object cases
                    if (typeof raw === 'string') {
                        parsed = JSON.parse(raw) as Message
                    } else if (typeof raw === 'object' && raw !== null) {
                        parsed = raw as Message
                    } else {
                        return null
                    }
                    
                    return {
                        ...parsed,
                        token: parsed.token === auth.token ? auth.token : undefined,
                    } as Message
                } catch (parseError) {
                    console.error("Error parsing message:", parseError)
                    return null
                }
            })
            .filter((msg): msg is NonNullable<typeof msg> => msg !== null)
        
        return { messages }
    } catch (error) {
        console.error("Error fetching messages:", error)
        throw error
    }
}, { query: z.object({ roomId: z.string() }) })

const app = new Elysia({prefix: "/api"}).use(rooms).use(messages)



export const GET = app.fetch 
export const POST = app.fetch 
export const DELETE = app.fetch 

export type App = typeof app