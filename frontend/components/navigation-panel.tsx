"use client"

import { useState, useEffect } from "react"
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
import Link from "next/link"
import { useStudentData } from "@/hooks/use-student-data"

interface NavigationPanelProps {
  isOpen: boolean
  onToggle: () => void
  currentPath?: string
}

export default function NavigationPanel({ isOpen, onToggle, currentPath = "/" }: NavigationPanelProps) {
  const [mounted, setMounted] = useState(false)
  const { studentData } = useStudentData()

  useEffect(() => {
    setMounted(true)
  }, [])

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/dashboard" },
    { id: "schedule", label: "Schedule", icon: <Calendar size={20} />, path: "/dashboard/schedule" },
    { id: "courses", label: "Courses", icon: <BookOpen size={20} />, path: "/dashboard/courses" },
    { id: "tasks", label: "Tasks", icon: <CheckSquare size={20} />, path: "/dashboard/tasks" },
    { id: "progress", label: "Progress", icon: <BarChart size={20} />, path: "/dashboard/progress" },
    { id: "settings", label: "Settings", icon: <Settings size={20} />, path: "/dashboard/settings" },
  ]

  // Determine active item based on current path
  const getActiveItem = () => {
    if (currentPath === "/dashboard") return "dashboard"
    const activeItem = navItems.find(item => currentPath.startsWith(item.path))
    return activeItem ? activeItem.id : "dashboard"
  }
  
  // Get user initials for the avatar fallback
  const getUserInitials = () => {
    if (!studentData?.name) return "ST";
    
    const nameParts = studentData.name.split(" ");
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    
    return nameParts[0].substring(0, 2).toUpperCase();
  };

  if (!mounted) {
    return (
      <div
        className={`fixed top-0 left-0 h-full bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-10 ${
          isOpen ? "w-64" : "w-16"
        }`}
      />
    )
  }

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
            <AvatarFallback>{getUserInitials()}</AvatarFallback>
          </Avatar>
          {isOpen && (
            <div className="flex flex-col">
              <span className="font-bold text-sm">{studentData?.name || "Student"}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Computer Science</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = item.id === getActiveItem()
              
              return (
                <li key={item.id}>
                  <Link href={item.path}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`w-full justify-${isOpen ? "start" : "center"} rounded-lg`}
                    >
                      {item.icon}
                      {isOpen && <span className="ml-3">{item.label}</span>}
                    </Button>
                  </Link>
                </li>
              )
            })}
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

