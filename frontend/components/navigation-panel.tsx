"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Calendar,
  BookOpen,
  CheckSquare,
  BarChart,
  Settings,
  LogOut,
} from "lucide-react"

interface NavigationPanelProps {
  isOpen: boolean
  onToggle: () => void
}

export default function NavigationPanel({ isOpen, onToggle }: NavigationPanelProps) {
  const [activeItem, setActiveItem] = useState("dashboard")

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "schedule", label: "Schedule", icon: <Calendar size={20} /> },
    { id: "courses", label: "Courses", icon: <BookOpen size={20} /> },
    { id: "tasks", label: "Tasks", icon: <CheckSquare size={20} /> },
    { id: "progress", label: "Progress", icon: <BarChart size={20} /> },
    { id: "settings", label: "Settings", icon: <Settings size={20} /> },
  ]

  return (
    <div
      className={`fixed top-0 left-0 h-full bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-10 ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Toggle button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-4 h-6 w-6 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
          onClick={onToggle}
        >
          {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </Button>

        {/* Profile */}
        <div
          className={`p-4 flex ${isOpen ? "flex-row" : "flex-col"} items-center gap-3 border-b border-gray-200 dark:border-gray-800`}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src="/placeholder.svg" alt="Profile" />
            <AvatarFallback>ST</AvatarFallback>
          </Avatar>
          {isOpen && (
            <div className="flex flex-col">
              <span className="font-bold text-sm">Student Name</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Computer Science</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <Button
                  variant={activeItem === item.id ? "secondary" : "ghost"}
                  className={`w-full justify-${isOpen ? "start" : "center"} rounded-lg`}
                  onClick={() => setActiveItem(item.id)}
                >
                  {item.icon}
                  {isOpen && <span className="ml-3">{item.label}</span>}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            variant="ghost"
            className={`w-full justify-${isOpen ? "start" : "center"} rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20`}
          >
            <LogOut size={20} />
            {isOpen && <span className="ml-3">Sign Out</span>}
          </Button>
        </div>
      </div>
    </div>
  )
}

