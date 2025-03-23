"use client"

import { useState } from "react"
import NavigationPanel from "./navigation-panel"
import ChatPanel from "./chat-panel"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function Dashboard() {
  const [navOpen, setNavOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // On mobile, don't show both panels at once
  const handleNavToggle = () => {
    setNavOpen(!navOpen)
    if (isMobile && !navOpen) setChatOpen(false)
  }

  const handleChatToggle = () => {
    setChatOpen(!chatOpen)
    if (isMobile && !chatOpen) setNavOpen(false)
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 text-black dark:text-white">
      {/* Navigation Panel */}
      <NavigationPanel isOpen={navOpen} onToggle={handleNavToggle} />

      {/* Main Content */}
      <main
        className={`flex-1 p-6 transition-all duration-300 ${navOpen && !isMobile ? "ml-64" : "ml-0"} ${chatOpen && !isMobile ? "mr-80" : "mr-0"}`}
      >
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 h-full p-6">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome to your student dashboard. Here you can track your classes, deadlines, and progress.
          </p>

          {/* Placeholder for dashboard content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <h2 className="text-xl font-bold mb-4">Upcoming Deadlines</h2>
              <ul className="space-y-2">
                <li className="p-2 rounded bg-gray-100 dark:bg-gray-900">Math Assignment - Tomorrow</li>
                <li className="p-2 rounded bg-gray-100 dark:bg-gray-900">Physics Lab Report - 3 days</li>
                <li className="p-2 rounded bg-gray-100 dark:bg-gray-900">Literature Essay - 1 week</li>
              </ul>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <h2 className="text-xl font-bold mb-4">Class Schedule</h2>
              <ul className="space-y-2">
                <li className="p-2 rounded bg-gray-100 dark:bg-gray-900">Calculus - 9:00 AM</li>
                <li className="p-2 rounded bg-gray-100 dark:bg-gray-900">Computer Science - 11:00 AM</li>
                <li className="p-2 rounded bg-gray-100 dark:bg-gray-900">English Literature - 2:00 PM</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Chat Panel */}
      <ChatPanel isOpen={chatOpen} onToggle={handleChatToggle} />
    </div>
  )
}

