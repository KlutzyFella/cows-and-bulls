"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "lucide-react"

export default function Home() {
  // useState hook for setting the lobby codes
  const [lobbyCode, setLobbyCode] = useState<string>("")
  // useRouter hook to navigate between pages
  const router = useRouter()

  // function to create lobby code and send user there
  const createLobby = () => {
    const generatedCode = Math.random().toString(36).substring(2, 6).toUpperCase()
    router.push(`/lobby/${generatedCode}`)
  }

  // function to join lobby based on code entered
  const joinLobby = () => {
    if (lobbyCode.trim()) {
      router.push(`/lobby/${lobbyCode.trim()}`)
    }
  }

  // Handle Enter key press in the input field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && lobbyCode.trim()) {
      joinLobby()
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-12 gap-20">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="font-fredoka text-5xl sm:text-7xl md:text-9xl mb-4 tracking-tight">COWS AND BULLS</h1>
        {/* <p className="max-w-md mx-auto text-muted-foreground">
          A classic code-breaking game where you try to guess your opponent's secret number using logic and deduction.
        </p> */}
      </div>

      {/* Game Card */}
      <Card className="w-full max-w-md bg-card">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Play Now</CardTitle>
          <CardDescription>Create a new game or join an existing one</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Create Game Button */}
          <div>
            <Button
              onClick={createLobby}
              className="w-full h-12 text-lg flex items-center justify-center gap-2"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              Create New Game
            </Button>
          </div>

          {/* Join Game Section */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Or join with a code</div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter Lobby Code"
                value={lobbyCode}
                onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="h-10 flex-1"
                maxLength={6}
              />
              <Button onClick={joinLobby} disabled={!lobbyCode.trim()} className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Join
              </Button>
            </div>
          </div>
        </CardContent>

        {/* <CardFooter className="flex justify-center border-t pt-4">
          <div className="flex items-center text-xs text-muted-foreground">
            <Info className="h-3 w-3 mr-1" />
            Enter a 4-digit number and guess your opponent's secret code
          </div>
        </CardFooter> */}
      </Card>

      {/* Game Rules
      <div className="mt-12 max-w-md text-center">
        <h2 className="text-lg font-medium mb-2">How to Play</h2>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>Set your secret 4-digit number</li>
          <li>Take turns guessing your opponent's number</li>
          <li>Green means correct digit in correct position</li>
          <li>Yellow means correct digit in wrong position</li>
          <li>First player to guess correctly wins!</li>
        </ul>
      </div> */}
    </div>
  )
}
