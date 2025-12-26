"use client"

import { useUsername } from "@/hooks/use-username"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { useRef, useState, useEffect } from "react"
import { client } from "@/lib/client"
import { format } from "date-fns"
import { useRealtime } from "@/lib/realtime-client"
import type { Message } from "@/lib/realtime"

function formatTimeRemaining(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
}

const Page = () => {
    const params = useParams()
    const roomId = params.roomId as string
    const router = useRouter()
    const {username} = useUsername()

    const [input, setInput] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [copyStatus, setCopyStatus] = useState("COPY")
    
    const {data: ttlData} = useQuery({
        queryKey:["ttl", roomId], 
        queryFn: async () => {
            const res = await client.room.ttl.get({query: {roomId}})
            return res.data
        },
    })

    // Initialize timeRemaining from ttlData using lazy initializer
    const [timeRemaining, setTimeRemaining] = useState<number | null>(() => {
        return ttlData?.ttl !== undefined ? (ttlData.ttl > 0 ? ttlData.ttl : 0) : null
    })

    // Sync timeRemaining when ttlData updates
    // This is necessary to sync external query data to state for countdown timer
    useEffect(() => {
        if (ttlData?.ttl !== undefined) {
            const newTtl = ttlData.ttl > 0 ? ttlData.ttl : 0
            // Only update if it's significantly different to avoid resetting countdown
            setTimeRemaining((prev) => {
                if (prev === null || Math.abs(prev - newTtl) > 5) {
                    return newTtl
                }
                return prev
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ttlData?.ttl])

    const queryClient = useQueryClient()

    const { data: messages, error: messagesError, isLoading, refetch } = useQuery({
        queryKey: ["messages", roomId],
        queryFn: async () => {
            const res = await client.messages.get({ query: { roomId } })
            const data = res.data
            if (data && typeof data === "object" && "messages" in data) {
                return data as { messages: Message[] }
            } else if (Array.isArray(data)) {
                return { messages: data as Message[] }
            }
            return data || { messages: [] }
        },
    })

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Countdown timer
    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0) {
            if (timeRemaining === 0) {
                router.push("/?destroyed=true")
            }
            return
        }

        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev === null || prev <= 1) {
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [timeRemaining, router])

    const { mutate: sendMessage, isPending } = useMutation({
        mutationFn: async ({ text }: { text: string }) => {
            return await client.messages.post({ sender: username, text }, { query: { roomId } })
        },
        onSuccess: () => {
            setInput("")
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ["messages", roomId] })
                queryClient.refetchQueries({ queryKey: ["messages", roomId] })
            }, 100)
            setInput("")
        },
        onError: (error) => {
            console.error("Failed to send message:", error)
        }
    })

    useRealtime({
        channels: [roomId],
        events: ["chat.message", "chat.destroy"],
        onData: ({ event }) => {
            if (event === "chat.message") {
                refetch();
            }

            if (event === "chat.destroy") {
                router.push("/?destroyed=true");
            }
        },
    });

    const {mutate: destroyRoom} = useMutation({
        mutationFn: async() => {
            await client.room.delete(null, {query: {roomId}})
        },
    })

    const copyLink = () => {
        const url = window.location.href
        navigator.clipboard.writeText(url)
        setCopyStatus("COPIED!")
        setTimeout(() => setCopyStatus("COPY"), 2000)
    }

    return (
        <main className="flex flex-col h-screen max-h-screen overflow-hidden">
            <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500 uppercase">RoomID</span>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-green-500">{roomId}</span>
                            <button onClick={copyLink} className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors">
                                {copyStatus}
                            </button>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-zinc-800" />
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500 uppercase">Self-Destruct</span>
                        <span className={`text-sm font-bold flex items-center gap-2 ${timeRemaining !== null && timeRemaining < 60 ? "text-red-500" : "text-amber-500"}`}>
                            {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
                        </span>
                    </div>
                </div>

                <button onClick={() => destroyRoom()} className="text-xs bg-zinc-800 hover:bg-red-600 px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50">
                    <span className="group-hover:animate-pulse">💥</span>DESTROY ROOM
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full min-h-[400px]">
                        <p className="text-zinc-600 text-sm font-mono">Loading messages...</p>
                    </div>
                ) : messagesError ? (
                    <div className="flex items-center justify-center h-full min-h-[400px]">
                        <p className="text-red-500 text-sm font-mono">Error loading messages: {String(messagesError)}</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {messages?.messages && messages.messages.length > 0 ? (
                            <div className="space-y-4">
                                {messages.messages.map((msg: Message) => (
                                    <div key={msg.id} className="flex flex-col items-start">
                                        <div className="max-w-[80%]">
                                            <div className="flex items-baseline gap-3 mb-1">
                                                <span className={`text-sm font-bold ${msg.sender === username ? "text-green-500" : "text-blue-500"}`}>
                                                    {msg.sender === username ? "You" : msg.sender}
                                                </span>
                                                <span className="text-[10px] text-zinc-600">
                                                    {msg.timestamp 
                                                        ? format(new Date(typeof msg.timestamp === "number" ? msg.timestamp : parseInt(msg.timestamp)), "HH:mm")
                                                        : ""}
                                                </span>
                                            </div>
                                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2">
                                                {/* Ensure we always have string for text */}
                                                <span className="text-zinc-100 text-sm leading-relaxed break-all">{String(msg.text)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center flex-1 min-h-[400px]">
                                <p className="text-zinc-600 text-sm font-mono">No Messages Yet. Please send a message to start the conversation.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
                <div className="flex gap-4">
                    <div className="flex-1 relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">{">"}</span>
                        <input
                            autoFocus
                            ref={inputRef}
                            type="text"
                            value={input}
                            onKeyDown={(e) => {
                                if (
                                    e.key === "Enter" &&
                                    input.trim() &&
                                    !isPending
                                ) {
                                    sendMessage({ text: input })
                                    inputRef.current?.focus()
                                }
                            }}
                            placeholder="Type message . . . "
                            onChange={(e) => setInput(e.target.value)}
                            className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm"
                        />
                    </div>
                    <button
                        onClick={() => {
                            if(input.trim() && !isPending) {
                                sendMessage({ text: input })
                                inputRef.current?.focus()
                            }
                        }}
                        disabled={!input.trim() || isPending}
                        className="bg-zinc-800 text-zinc-400 px-6 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        SEND
                    </button>
                </div>
            </div>
        </main>
    )
}

export default Page