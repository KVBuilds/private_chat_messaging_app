import { redis } from "@/lib/redis"
import Elysia from "elysia"

class AuthError extends Error { 
    constructor(message:string) {
        super(message)
        this.name = "AuthError"
    }
}

export const authMiddleware = new Elysia({
    name: "auth"})
    .error({AuthError})
    .onError(({code, set}) => {
        if (code === "AuthError") {
            set.status = 401
            return {error: "Unauthorized"}
        }
    })
    .derive({as:"scoped"}, async ({query, cookie}) => {
        const roomId = query.roomId
        const token = cookie["x-auth-token"].value as string | undefined

        if(!roomId || !token) {
            throw new AuthError("Unauthorized")
        }

        //Check against metadata of the room - 
        const connectedRaw = await redis.hget(`meta:${roomId}`, "connected")
        // Parse connected array - Redis may return it as a JSON string
        let connected: string[] = []
        try {
            if (Array.isArray(connectedRaw)) {
                connected = connectedRaw
            } else if (connectedRaw) {
                // Try to parse as JSON string
                const parsed = typeof connectedRaw === 'string' 
                    ? JSON.parse(connectedRaw) 
                    : connectedRaw
                connected = Array.isArray(parsed) ? parsed : []
            }
        } catch (parseError) {
            console.error("Error parsing connected array:", parseError)
            connected = []
        }

        if(!Array.isArray(connected) || !connected.includes(token)){
            throw new AuthError("Invalid token")
        }
        return {auth: {roomId, token, connected}}
    })