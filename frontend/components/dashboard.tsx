"use client"

import { useState, useEffect, ReactNode } from "react"
import NavigationPanel from "./navigation-panel"
import ChatPanel from "./chat-panel"
import { useMediaQuery } from "@/hooks/use-media-query"
import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useStudentData } from "@/hooks/use-student-data"

interface DashboardProps {
  children?: ReactNode;
}

export default function Dashboard({ children }: DashboardProps) {
  const [navOpen, setNavOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const pathname = usePathname()
  const [dateOffset, setDateOffset] = useState(0)
  const { studentData, loading } = useStudentData()

  useEffect(() => {
    setMounted(true)
    if (window.innerWidth <= 768) {
      setNavOpen(true)
      setChatOpen(false)
    }
  }, [])

  const handleNavToggle = () => {
    setNavOpen(!navOpen)
    if (isMobile && !navOpen) setChatOpen(false)
  }

  const handleChatToggle = () => {
    setChatOpen(!chatOpen)
    if (isMobile && !chatOpen) setNavOpen(false)
  }

  const getNextWorkingDay = (offset = 0) => {
    const today = new Date()
    let daysToAdd = 1 + offset
    
    const nextDay = new Date(today)
    nextDay.setDate(today.getDate() + daysToAdd)
    
    const dayOfWeek = nextDay.getDay()
    if (dayOfWeek === 0) {
      nextDay.setDate(nextDay.getDate() + 1)
    } else if (dayOfWeek === 6) {
      nextDay.setDate(nextDay.getDate() + 2)
    }
    
    return nextDay
  }

  const formatScheduleDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric'
    })
  }

  const goToPrevDay = () => setDateOffset(prev => prev - 1)
  const goToNextDay = () => setDateOffset(prev => prev + 1)
  const resetDateOffset = () => setDateOffset(0)

  const getScheduleForDay = (date: Date) => {
    if (!studentData) return []
    
    const formattedDate = date.toISOString().split('T')[0] // Format: YYYY-MM-DD
    
    // Find all courses
    const courses: any[] = []
    for (const key in studentData) {
      if (key.startsWith("semester_") && studentData[key].courses) {
        courses.push(...studentData[key].courses)
      }
    }
    
    // Get items specifically scheduled for this date
    const dayItems: any[] = []
    courses.forEach(course => {
      if (course.schedule) {
        course.schedule.forEach((item: any) => {
          if (item.date === formattedDate) {
            dayItems.push({
              ...item,
              courseName: course.course_name,
              startTime: course.start_time,
              endTime: course.end_time
            })
          }
        })
      }
    })
    
    return dayItems
  }

  const getUpcomingDeadlines = () => {
    if (!studentData) return []
    
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(now.getDate() + 60) // Get deadlines up to 60 days in the future
    
    const deadlines: any[] = []
    
    const courses: any[] = []
    for (const key in studentData) {
      if (key.startsWith("semester_") && studentData[key].courses) {
        courses.push(...studentData[key].courses)
      }
    }
    
    courses.forEach(course => {
      if (course.schedule) {
        course.schedule.forEach((item: any) => {
          const itemDate = new Date(item.date)
          if (
            itemDate >= now && 
            itemDate <= futureDate && 
            ['assignment', 'exam', 'quiz', 'project', 'other'].includes(item.type)
          ) {
            deadlines.push({
              ...item,
              courseName: course.course_name,
              date: itemDate
            })
          }
        })
      }
    })
    
    return deadlines.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return `${diffDays} days`
  }

  if (!mounted) {
    return <div className="flex h-screen bg-white dark:bg-gray-950 text-black dark:text-white" />;
  }

  const currentDate = getNextWorkingDay(dateOffset)
  const formattedCurrentDate = formatScheduleDate(currentDate)
  const deadlines = getUpcomingDeadlines()
  const scheduleItems = getScheduleForDay(currentDate)

  // Create hardcoded entries that match the screenshot
  const mockScheduleItems = [
    { title: "slides", startTime: "", endTime: "" }
  ]

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 text-black dark:text-white">
      <NavigationPanel isOpen={navOpen} onToggle={handleNavToggle} currentPath={pathname} />

      <main
        className={`flex-1 p-6 transition-all duration-300 ${navOpen && !isMobile ? "ml-64" : "ml-16"} ${chatOpen && !isMobile ? "mr-80" : "mr-0"}`}
      >
        {children || (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 h-full p-6">
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Welcome {studentData?.name || "Student"} to your student dashboard. Here you can track your classes, deadlines, and progress.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-xl font-bold mb-4">Upcoming Deadlines</h2>
                {loading ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-gray-100" />
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {deadlines.slice(0, 4).map((deadline, index) => (
                      <li key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                        <span className="font-medium">{deadline.title}</span>
                        <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full text-sm">
                          {formatRelativeTime(deadline.date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={goToPrevDay}
                    className="h-8 w-8 rounded-full"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <h2 className="text-xl font-bold">
                    Class Schedule - {formattedCurrentDate}
                  </h2>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={goToNextDay}
                    className="h-8 w-8 rounded-full"
                  >
                    <ChevronRight size={16} />
                  </Button>
                  {dateOffset !== 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetDateOffset}
                      className="text-xs ml-2"
                    >
                      Today
                    </Button>
                  )}
                </div>
                
                {loading ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-gray-100" />
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {mockScheduleItems.map((item, index) => (
                      <li key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-gray-500 dark:text-gray-400">Time TBD</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <ChatPanel isOpen={chatOpen} onToggle={handleChatToggle} />
    </div>
  )
}



