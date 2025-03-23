"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, Send } from "lucide-react"
import { useChat } from "ai/react"

interface ChatPanelProps {
  isOpen: boolean
  onToggle: () => void
}

export default function ChatPanel({ isOpen, onToggle }: ChatPanelProps) {
  const { messages, input, handleInputChange, handleSubmit } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (!mounted) {
    return (
      <div
        className={`fixed top-0 right-0 h-full bg-gray-100 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-all duration-300 z-10 ${
          isOpen ? "w-80" : "w-16"
        }`}
      />
    )
  }

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-gray-100 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-all duration-300 z-10 ${
        isOpen ? "w-80" : "w-16"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Toggle button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -left-3 top-4 h-6 w-6 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
          onClick={onToggle}
        >
          {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Button>

        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-center">
          {isOpen ? (
            <h2 className="font-bold">AI Assistant</h2>
          ) : (
            <div className="rotate-90 whitespace-nowrap text-xs">AI Assistant</div>
          )}
        </div>

        {isOpen && (
          <>
            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                  <p>Ask me anything about your studies!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-black text-white dark:bg-white dark:text-black"
                            : "bg-gray-200 text-black dark:bg-gray-800 dark:text-white"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 bg-white dark:bg-gray-950"
                />
                <Button type="submit" size="icon" className="rounded-lg">
                  <Send size={18} />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

