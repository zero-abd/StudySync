"use client"

import { useState } from "react"
import { useStudentData } from "@/hooks/use-student-data"
import { Button } from "@/components/ui/button"
import { Calendar, Grid3X3, ListFilter, ChevronLeft, ChevronRight } from "lucide-react"

type ViewType = 'detailed' | 'week' | 'month'

export default function SchedulePage() {
  const [viewType, setViewType] = useState<ViewType>('detailed')
  const { studentData, loading, error } = useStudentData()
  const [currentDateOffset, setCurrentDateOffset] = useState(0)

  // Navigation functions
  const goToPrevious = () => {
    setCurrentDateOffset(prev => prev - 1)
  }

  const goToNext = () => {
    setCurrentDateOffset(prev => prev + 1)
  }

  const resetDateOffset = () => {
    setCurrentDateOffset(0)
  }

  // Get next working day (skip weekend)
  const getNextWorkingDay = (offset = 0) => {
    const today = new Date()
    let daysToAdd = 1 + offset // Start with tomorrow + any offset
    
    // Clone the date object to avoid modifying the original
    const nextDay = new Date(today)
    nextDay.setDate(today.getDate() + daysToAdd)
    
    // If it's a weekend, move to Monday
    const dayOfWeek = nextDay.getDay()
    if (dayOfWeek === 0) { // Sunday
      nextDay.setDate(nextDay.getDate() + 1)
    } else if (dayOfWeek === 6) { // Saturday
      nextDay.setDate(nextDay.getDate() + 2)
    }
    
    return nextDay
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }

  if (error || !studentData) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 h-full p-6">
        <h1 className="text-2xl font-bold mb-6">Schedule</h1>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error || "Could not load student data. Please try again later."}
        </div>
      </div>
    )
  }

  const getSemesterCourses = () => {
    for (const key in studentData) {
      if (key.startsWith("semester_")) {
        return studentData[key].courses || []
      }
    }
    return []
  }

  const courses = getSemesterCourses()
  
  const getAllScheduleItems = () => {
    const scheduleItems: any[] = []
    
    courses.forEach((course: any) => {
      if (course.schedule) {
        course.schedule.forEach((item: any) => {
          scheduleItems.push({
            ...item,
            courseName: course.course_name,
            startTime: course.start_time,
            endTime: course.end_time
          })
        })
      }
    })
    
    return scheduleItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const scheduleItems = getAllScheduleItems()

  // Format date without year
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }
  
  const getTypeColor = (type: string) => {
    switch(type) {
      case 'assignment': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
      case 'quiz': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
      case 'exam': return 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
      case 'project': return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
      default: return 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400'
    }
  }

  // Get next working day with offset
  const scheduleDate = getNextWorkingDay(currentDateOffset)
  const formattedScheduleDate = formatDate(scheduleDate)
  
  // Group schedule items by month
  const groupByMonth = () => {
    const grouped: Record<string, any[]> = {}
    
    scheduleItems.forEach(item => {
      const date = new Date(item.date)
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = []
      }
      
      grouped[monthYear].push(item)
    })
    
    return grouped
  }
  
  // Group schedule items by week
  const groupByWeek = () => {
    const grouped: Record<string, any[]> = {}
    const oneDay = 24 * 60 * 60 * 1000 // milliseconds in one day
    
    // Get the earliest and latest dates
    if (scheduleItems.length === 0) return grouped
    
    const sortedItems = [...scheduleItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const earliestDate = new Date(sortedItems[0].date)
    const latestDate = new Date(sortedItems[sortedItems.length - 1].date)
    
    // Find the Sunday before or on the earliest date
    const startDate = new Date(earliestDate)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Move to Sunday
    
    // Find the Saturday after or on the latest date
    const endDate = new Date(latestDate)
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())) // Move to Saturday
    
    // Create week ranges
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const weekStart = new Date(currentDate)
      const weekEnd = new Date(currentDate)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      grouped[weekLabel] = []
      
      // Add items for this week
      scheduleItems.forEach(item => {
        const itemDate = new Date(item.date)
        if (itemDate >= weekStart && itemDate <= weekEnd) {
          grouped[weekLabel].push(item)
        }
      })
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7)
    }
    
    return grouped
  }
  
  // Group schedule items for month view (by date within each month)
  const groupByMonthDays = () => {
    const grouped: Record<string, Record<string, any[]>> = {}
    
    scheduleItems.forEach(item => {
      const date = new Date(item.date)
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      const day = date.getDate().toString()
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = {}
      }
      
      if (!grouped[monthYear][day]) {
        grouped[monthYear][day] = []
      }
      
      grouped[monthYear][day].push(item)
    })
    
    return grouped
  }
  
  const groupedDetailedSchedule = groupByMonth()
  const groupedWeekSchedule = groupByWeek()
  const groupedMonthSchedule = groupByMonthDays()

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 h-full p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToPrevious} 
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft size={18} />
          </Button>
          <h1 className="text-2xl font-bold">Schedule - {formattedScheduleDate}</h1>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToNext} 
            className="h-8 w-8 rounded-full"
          >
            <ChevronRight size={18} />
          </Button>
          {currentDateOffset !== 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetDateOffset} 
              className="text-sm"
            >
              Today
            </Button>
          )}
        </div>
        
        <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
          <Button 
            variant={viewType === 'detailed' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setViewType('detailed')}
            className="flex items-center gap-1 rounded-md"
          >
            <ListFilter size={16} />
            <span className="hidden sm:inline">Detailed</span>
          </Button>
          <Button 
            variant={viewType === 'week' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setViewType('week')}
            className="flex items-center gap-1 rounded-md"
          >
            <Grid3X3 size={16} />
            <span className="hidden sm:inline">Week</span>
          </Button>
          <Button 
            variant={viewType === 'month' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setViewType('month')}
            className="flex items-center gap-1 rounded-md"
          >
            <Calendar size={16} />
            <span className="hidden sm:inline">Month</span>
          </Button>
        </div>
      </div>
      
      {/* Detailed View */}
      {viewType === 'detailed' && (
        Object.keys(groupedDetailedSchedule).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedDetailedSchedule).map(([monthYear, items]) => (
              <div key={monthYear}>
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">
                  {monthYear.split(" ")[0]} {/* Only show month name, not year */}
                </h2>
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium">{item.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.courseName}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-sm font-medium capitalize ${getTypeColor(item.type)}`}>
                          {item.type}
                        </span>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm">{item.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(item.date)}</p>
                          {/* Display course start and end time */}
                          {item.startTime && item.endTime && (
                            <p className="text-sm font-medium">{item.startTime} - {item.endTime}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No schedule items found</p>
        )
      )}
      
      {/* Week View */}
      {viewType === 'week' && (
        Object.keys(groupedWeekSchedule).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedWeekSchedule).map(([weekRange, items]) => (
              <div key={weekRange}>
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">
                  {weekRange}
                </h2>
                
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium">{item.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.courseName}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-sm font-medium capitalize ${getTypeColor(item.type)}`}>
                          {item.type}
                        </span>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm">{item.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(item.date)}</p>
                          {/* Display course start and end time */}
                          {item.startTime && item.endTime && (
                            <p className="text-sm font-medium">{item.startTime} - {item.endTime}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No schedule items found</p>
        )
      )}
      
      {/* Month View */}
      {viewType === 'month' && (
        Object.keys(groupedMonthSchedule).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedMonthSchedule).map(([monthYear, daysData]) => {
              // Generate calendar for this month
              const [month, year] = monthYear.split(' ')
              const monthIndex = new Date(`${month} 1, ${year}`).getMonth()
              const yearNum = parseInt(year)
              
              // Get first day of month and total days
              const firstDay = new Date(yearNum, monthIndex, 1)
              const lastDay = new Date(yearNum, monthIndex + 1, 0)
              const totalDays = lastDay.getDate()
              const startOffset = firstDay.getDay() // 0 for Sunday, 1 for Monday, etc.
              
              // Create calendar grid
              const days = []
              // Add empty cells for previous month
              for (let i = 0; i < startOffset; i++) {
                days.push(null)
              }
              // Add days of current month
              for (let i = 1; i <= totalDays; i++) {
                days.push(i)
              }
              
              return (
                <div key={monthYear}>
                  <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">
                    {monthYear}
                  </h2>
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center font-medium text-sm py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {days.map((day, index) => {
                      if (day === null) {
                        return <div key={`empty-${index}`} className="h-24 bg-gray-50 dark:bg-gray-900/30 rounded-lg"></div>
                      }
                      
                      const dayStr = day.toString()
                      const hasEvents = daysData[dayStr] && daysData[dayStr].length > 0
                      
                      return (
                        <div 
                          key={`day-${day}`} 
                          className={`h-24 p-1 border border-gray-200 dark:border-gray-800 rounded-lg ${
                            hasEvents ? 'bg-gray-50 dark:bg-gray-900/30' : ''
                          }`}
                        >
                          <div className="text-right mb-1">
                            <span className="inline-block px-1.5 py-0.5 text-xs rounded-full">{day}</span>
                          </div>
                          <div className="overflow-y-auto max-h-16">
                            {hasEvents && daysData[dayStr].map((item, idx) => (
                              <div 
                                key={idx} 
                                className={`text-xs px-1 py-0.5 mb-1 rounded truncate ${getTypeColor(item.type)}`}
                              >
                                {item.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No schedule items found</p>
        )
      )}
    </div>
  )
} 