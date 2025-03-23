"use client"

import { useStudentData } from "@/hooks/use-student-data"

export default function HomePage() {
  const { studentData, loading, error } = useStudentData()

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
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
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
  
  const getUpcomingDeadlines = () => {
    const today = new Date()
    const deadlines: any[] = []
    const relevantTypes = ['exam', 'assignment', 'project']
    
    courses.forEach((course: any) => {
      if (course.schedule) {
        course.schedule.forEach((item: any) => {
          const date = new Date(item.date)
          if (date >= today && relevantTypes.includes(item.type.toLowerCase())) {
            deadlines.push({
              ...item,
              courseName: course.name
            })
          }
        })
      }
    })
    
    return deadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5)
  }
  
  const getNextWorkingDayClasses = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    
    // Find the next working day (skip weekend)
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1)
    }
    
    const nextDay = {
      date: tomorrow,
      dayName: tomorrow.toLocaleDateString('en-US', { weekday: 'long' }),
      formattedDate: tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      classes: [] as any[]
    }
    
    // Get class schedule for all courses on that day
    courses.forEach((course: any) => {
      if (course.schedule) {
        course.schedule.forEach((item: any) => {
          const itemDate = new Date(item.date)
          if (itemDate.getDate() === nextDay.date.getDate() && 
              itemDate.getMonth() === nextDay.date.getMonth() && 
              itemDate.getFullYear() === nextDay.date.getFullYear()) {
            nextDay.classes.push({
              ...item,
              courseName: course.name
            })
          }
        })
      }
    })
    
    // Sort by time
    nextDay.classes.sort((a, b) => {
      const timeA = a.time ? new Date(`2000-01-01 ${a.time}`).getTime() : 0
      const timeB = b.time ? new Date(`2000-01-01 ${b.time}`).getTime() : 0
      return timeA - timeB
    })
    
    return nextDay
  }
  
  const getDaysRemaining = (dateString: string) => {
    const today = new Date()
    const itemDate = new Date(dateString)
    const diffTime = Math.abs(itemDate.getTime() - today.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Tomorrow"
    return `${diffDays} days`
  }

  const upcomingDeadlines = getUpcomingDeadlines()
  const nextWorkingDay = getNextWorkingDayClasses()

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 h-full p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Welcome {studentData.name} to your student dashboard. Here you can track your classes, deadlines, and progress.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-xl font-bold mb-4">Upcoming Deadlines</h2>
          {upcomingDeadlines.length > 0 ? (
            <ul className="space-y-2">
              {upcomingDeadlines.map((deadline, index) => (
                <li key={index} className="p-2 rounded bg-gray-100 dark:bg-gray-900 flex justify-between items-start">
                  <div>
                    <span className="font-medium">{deadline.title}</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{deadline.courseName}</p>
                  </div>
                  <span className="text-sm px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                    {getDaysRemaining(deadline.date)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No upcoming deadlines</p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-xl font-bold mb-4">
            Class Schedule - {nextWorkingDay.dayName}, {nextWorkingDay.formattedDate}
          </h2>
          {nextWorkingDay.classes.length > 0 ? (
            <ul className="space-y-2">
              {nextWorkingDay.classes.map((classItem, index) => (
                <li key={index} className="p-2 rounded bg-gray-100 dark:bg-gray-900">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{classItem.title}</span>
                    <span className="text-sm">{classItem.time || "Time TBD"}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{classItem.courseName}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No classes scheduled for the next working day</p>
          )}
        </div>
      </div>
    </div>
  )
} 