import { NextRequest, NextResponse } from "next/server"
import { redis } from "./lib/redis"
import { nanoid } from "nanoid"

export const proxy = async (req: NextRequest) => {
const pathname = req.nextUrl.pathname

    const roomMatch= pathname.match(/^\/room\/([^/]+)$/)
    if (!roomMatch) return NextResponse.redirect(new URL("/", req.url))

        const roomId = roomMatch[1]

        const meta = await redis.hgetall<{connected: string, createdAt: string}>(`meta:${roomId}`)
        if (!meta) {
            return NextResponse.redirect(new URL("/?error=room-not-found", req.url))
        }
        
        // Parse connected array from JSON string or handle raw string values
        let connected: string[] = []
        try {
            if (!meta.connected) {
                connected = []
            } else if (typeof meta.connected === 'string') {
                // Try to parse as JSON array first
                try {
                    const parsed = JSON.parse(meta.connected)
                    connected = Array.isArray(parsed) ? parsed : []
                } catch {
                    // If not valid JSON, treat as a single token string
                    // This handles legacy data or incorrectly stored values
                    connected = [meta.connected]
                }
            } else if (Array.isArray(meta.connected)) {
                connected = meta.connected
            }
        } catch (e) {
            console.error("Error parsing connected array in proxy:", e)
            connected = []
        }
        
        const existingToken = req.cookies.get("x-auth-token")?.value
        if (existingToken && connected.includes(existingToken)) {
            return NextResponse.next()
        }

        //If ID is not in the existing values
        if(connected.length >= 2) {
            return NextResponse.redirect(new URL("/?error=room-full", req.url))
        }

        const response = NextResponse.next()

        const token = nanoid()
        response.cookies.set("x-auth-token", token, {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        })

        const updatedConnected = [...connected, token]
        await redis.hset(`meta:${roomId}`, {
            connected: JSON.stringify(updatedConnected), // Store as JSON string
        })
        return response
}

export const config = {
    matcher: "/room/:path*",

}