"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { io, type Socket } from "socket.io-client"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw } from "lucide-react"

type UserAttempt = {
    input: string
    statuses: ("correct" | "present" | "absent")[]
}

export default function Lobby() {
    const params = useParams()
    const router = useRouter()
    const lobbyId = params?.lobbyId as string

    // state to store the socket connection
    const [socket, setSocket] = useState<Socket | null>(null)
    // state to store the number of users in the lobby
    const [userCount, setUserCount] = useState(0)
    // state to store the input value
    const [inputValue, setInputValue] = useState("")
    // state to store the previous input values
    const [previousAttempts, setPreviousAttempts] = useState<UserAttempt[]>([])
    // state to store the other users' inputs
    const [otherUsersInputs, setOtherUsersInputs] = useState<Map<string, string>>(new Map())
    // state to store if user can go ahead with next attempt
    const [canEnterNextAttempt, setCanEnterNextAttempt] = useState(true)

    const [secretNumber, setSecretNumber] = useState<string | null>(null)
    const [secretInput, setSecretInput] = useState("")

    const [gameStarted, setGameStarted] = useState(false)
    const [gameOverMessage, setGameOverMessage] = useState<string | null>(null)

    const [gamesPlayed, setGamesPlayed] = useState(0);
    const [gamesWon, setGamesWon] = useState(0);

    useEffect(() => {
        const p = parseInt(localStorage.getItem("gamesPlayed") || "0", 10);
        const w = parseInt(localStorage.getItem("gamesWon") || "0", 10);
        setGamesPlayed(p);
        setGamesWon(w);
    }, []);

    useEffect(() => {
        localStorage.setItem("gamesPlayed", gamesPlayed.toString());
    }, [gamesPlayed]);

    useEffect(() => {
        localStorage.setItem("gamesWon", gamesWon.toString());
    }, [gamesWon]);


    useEffect(() => {
        const newSocket = io("http://localhost:4000")
        setSocket(newSocket)

        // Player joins the lobby
        newSocket.emit("joinLobby", lobbyId)
        // Update user count when a new user joins or leaves
        newSocket.on("updateUserCount", setUserCount)

        // Redirect to home if the lobby is full
        newSocket.on("redirectToHome", () => {
            console.log("Redirecting to home")
            router.push("/")
        })
        // On new user input, update the other users' inputs state
        newSocket.on("newUserInput", ({ userId, input }: { userId: string; input: string }) => {
            setOtherUsersInputs((prev) => {
                const updatedMap = new Map(prev)
                updatedMap.set(userId, input)
                return updatedMap
            })
        })

        newSocket.on("lobbyState", (lobbyData: { userId: string; input: string | null }[]) => {
            const newMap = new Map()
            lobbyData.forEach(({ userId, input }) => {
                if (input !== null) {
                    newMap.set(userId, input)
                }
            })
            setOtherUsersInputs(newMap)
        })

        // Enable next round only when both players submit their input
        newSocket.on("nextRound", () => {
            console.log("nextRound event received")
            setCanEnterNextAttempt(true)
            setInputValue("")
        })

        newSocket.on("startGame", () => {
            console.log("Game started! Now you can guess.")
            setGameStarted(true)
            setCanEnterNextAttempt(true)
        })

        newSocket.on("guessResult", ({ statuses }: { statuses: ("correct" | "present" | "absent")[] }) => {
            console.log("🔔 [client] guessResult statuses:", statuses)
            setPreviousAttempts((prev) => {
                // update the last-attempt entry to carry real statuses
                return prev.map((att, idx) => (idx === prev.length - 1 ? { ...att, statuses } : att))
            })
        })

        // after your existing newSocket.on("nextRound", …) and on("startGame", …)
        newSocket.on("gameOver", ({ winner }: { winner: string }) => {
            console.log("🔔 [client] gameOver, winner is", winner)
            setGamesPlayed(p => p + 1);
            setCanEnterNextAttempt(false)
            if (winner === newSocket.id) {
                setGamesWon(w => w + 1);
                setGameOverMessage("You Won!")
            } else {
                setGameOverMessage("You Lost")
            }
        })

        // when the game is restarted, reset the game state
        newSocket.on("gameRestarted", () => {
            console.log("[client] gameRestarted event fired");
            // clear everything back to “pre‐secret”:
            setSecretNumber(null);
            setSecretInput("");
            setGameStarted(false);
            setGameOverMessage(null);
            setPreviousAttempts([]);
            setOtherUsersInputs(new Map());
            setCanEnterNextAttempt(false);
        });

        return () => {
            newSocket.emit("leaveLobby", lobbyId)
            newSocket.disconnect()
        }
    }, [lobbyId, router])

    const handleSubmit = () => {
        if (!canEnterNextAttempt) return

        // Check if input value is a 4 digit numeric value
        if (/^\d{4}$/.test(inputValue) && socket) {
            socket.emit("userInput", { lobbyId, input: inputValue })

            // Save previous attempt and lock it
            setPreviousAttempts((prev) => [
                ...prev,
                { input: inputValue, statuses: ["absent", "absent", "absent", "absent"] },
            ])

            // Update own input in local state
            setOtherUsersInputs((prev) => {
                const updatedMap = new Map(prev)
                updatedMap.set(socket.id as string, inputValue)
                return updatedMap
            })

            setInputValue("")
            setCanEnterNextAttempt(false)
        } else {
            alert("Please enter a 4-digit number!")
        }
    }

    const handleSetSecret = () => {
        if (/^\d{4}$/.test(secretInput) && socket) {
            socket.emit("setSecret", { lobbyId, secret: secretInput })
            setSecretNumber(secretInput)
        } else {
            alert("Please enter a valid 4-digit number for your secret!")
        }
    }

    const getStatusMessage = () => {
        if (userCount < 2) {
            return {
                text: "Waiting for players to join...",
                color: "text-amber-500",
                icon: <Clock className="h-4 w-4 mr-1" />,
            }
        } else if (!gameStarted) {
            if (!secretNumber) {
                return {
                    text: "Enter your secret number!",
                    color: "text-emerald-500",
                    icon: <AlertCircle className="h-4 w-4 mr-1" />,
                }
            } else {
                return {
                    text: "Waiting for opponent to set their secret number...",
                    color: "text-sky-500",
                    icon: <Clock className="h-4 w-4 mr-1" />,
                }
            }
        } else if (canEnterNextAttempt) {
            return {
                text: "Your turn! Guess the number!",
                color: "text-emerald-500",
                icon: <CheckCircle2 className="h-4 w-4 mr-1" />,
            }
        } else {
            return {
                text: "Waiting for opponent's guess...",
                color: "text-sky-500",
                icon: <Clock className="h-4 w-4 mr-1" />,
            }
        }
    }

    const statusMessage = getStatusMessage()

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <Card className="mb-6 shadow-sm bg-card">
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="font-fredoka text-3xl font-medium">COWS AND BULLS</CardTitle>
                                <CardDescription>Lobby: {lobbyId}</CardDescription>
                                <CardDescription>Games played: {gamesPlayed}</CardDescription>
                                <CardDescription>Wins: {gamesWon}</CardDescription>
                            </div>
                            <Badge variant="outline" className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {userCount}/2
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardFooter className="pt-0">
                        <div className={`flex items-center text-sm font-medium ${statusMessage.color}`}>
                            {statusMessage.icon}
                            {statusMessage.text}
                        </div>
                    </CardFooter>
                </Card>

                {/* Main Content */}
                <Card className="shadow-sm bg-card">
                    <CardContent className="pt-6">
                        {/* Game Over State */}
                        {gameOverMessage ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div
                                    className={`text-4xl font-bold mb-6 ${gameOverMessage.includes("Won") ? "text-emerald-500" : "text-rose-500"}`}
                                >
                                    {gameOverMessage}
                                </div>
                                <Button onClick={() => router.push("/")} className="mb-4 flex items-center gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Home
                                </Button>
                                <Button
                                    onClick={() => {
                                        console.log("🔄 Restart clicked, socket is:", socket)
                                        socket?.emit("restartGame", { lobbyId })
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Restart Game
                                </Button>
                            </div>
                        ) : secretNumber === null ? (
                            /* Secret Number Input State */
                            <div className="flex flex-col items-center py-8">
                                <h2 className="text-xl font-medium mb-6">Set your Secret 4-Digit Number</h2>
                                <div className="mb-6">
                                    <InputOTP
                                        maxLength={4}
                                        value={secretInput}
                                        onChange={setSecretInput}
                                        className="gap-2"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                handleSetSecret()
                                            }
                                        }}
                                    >
                                        <InputOTPGroup>
                                            <InputOTPSlot index={0} className="w-14 h-14 text-2xl border-gray-300" />
                                            <InputOTPSlot index={1} className="w-14 h-14 text-2xl border-gray-300" />
                                            <InputOTPSlot index={2} className="w-14 h-14 text-2xl border-gray-300" />
                                            <InputOTPSlot index={3} className="w-14 h-14 text-2xl border-gray-300" />
                                        </InputOTPGroup>
                                    </InputOTP>
                                </div>
                            </div>
                        ) : !gameStarted ? (
                            /* Waiting for Game to Start State */
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="animate-pulse flex flex-col items-center">
                                    <div className="text-lg text-gray-500 mb-2">Game starting soon</div>
                                    <div className="flex space-x-2">
                                        <div
                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                            style={{ animationDelay: "0ms" }}
                                        ></div>
                                        <div
                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                            style={{ animationDelay: "150ms" }}
                                        ></div>
                                        <div
                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                            style={{ animationDelay: "300ms" }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Game Active State */
                            <div className="flex flex-col items-center justify-center py-6">
                                <h2 className="text-xl font-medium mb-6">Guess their number!</h2>

                                {/* Previous Attempts */}
                                <div className="space-y-3 w-full max-w-xs flex flex-col justify-center items-center">
                                    {previousAttempts.map((attempt, i) => (
                                        <div key={i} className="flex flex-col">
                                            <div className="text-xs text-gray-500">Attempt {i + 1}</div>
                                            <InputOTP maxLength={4} value={attempt.input} disabled>
                                                <InputOTPGroup className="  ">
                                                    {[...attempt.input].map((digit, j) => {
                                                        const status = attempt.statuses[j]
                                                        let bgClass = "bg-background border-white-300 text-white-700"
                                                        if (status === "correct") bgClass = "bg-emerald-100 border-emerald-300 text-emerald-700"
                                                        else if (status === "present") bgClass = "bg-yellow-500 border-yellow-600 text-yellow-900"

                                                        return (
                                                            <InputOTPSlot key={j} index={j} className={`w-12 h-12 text-xl ${bgClass}`}>
                                                                {digit}
                                                            </InputOTPSlot>
                                                        )
                                                    })}
                                                </InputOTPGroup>
                                            </InputOTP>
                                        </div>
                                    ))}
                                </div>

                                {/* Current Input */}
                                <div className="w-full max-w-xs flex justify-center items-center">
                                    {canEnterNextAttempt ? (
                                        <div className="space-y-4">
                                            <InputOTP
                                                maxLength={4}
                                                value={inputValue}
                                                onChange={setInputValue}
                                                className=""
                                                disabled={!canEnterNextAttempt}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        handleSubmit()
                                                    }
                                                }}
                                            >
                                                <InputOTPGroup>
                                                    <InputOTPSlot index={0} className="w-12 h-12 text-xl border-gray-300" />
                                                    <InputOTPSlot index={1} className="w-12 h-12 text-xl border-gray-300" />
                                                    <InputOTPSlot index={2} className="w-12 h-12 text-xl border-gray-300" />
                                                    <InputOTPSlot index={3} className="w-12 h-12 text-xl border-gray-300" />
                                                </InputOTPGroup>
                                            </InputOTP>
                                        </div>
                                    ) : (
                                        <div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
