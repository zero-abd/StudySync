"use client"

import { useStudentData } from "@/hooks/use-student-data"
import { useState, useEffect } from "react"

// Define a type for the course object and marks distribution
type MarksDistribution = {[key: string]: number}
type Course = {
  course_name: string
  instructor_name: string
  grade: string
  marks_distribution: MarksDistribution
  current_marks?: {[key: string]: number}
  schedule?: Array<{
    date: string
    description: string
    title: string
    type: string
  }>
}

type ScheduleItem = {
  date: string
  description: string
  title: string
  type: string
}

type StoredTasks = {
  completedTaskIds: string[]
  customTasks: Array<{
    id: string
    courseName: string
    title: string
    description: string
    type: string
    date: string
    priority: 'high' | 'medium' | 'low'
    isCustom: boolean
  }>
}

export default function CoursesPage() {
  const { studentData, loading, error } = useStudentData()
  const [userMarks, setUserMarks] = useState<{[courseIndex: number]: {[key: string]: number}}>({})
  const [calculatedGrades, setCalculatedGrades] = useState<{[courseIndex: number]: string}>({})
  const [activePopup, setActivePopup] = useState<number | null>(null)
  const [taskCompletionByType, setTaskCompletionByType] = useState<{[key: string]: {completed: number, total: number}}>({})
  const [taskProgress, setTaskProgress] = useState<{[courseName: string]: {completed: number, total: number}}>({})

  // Load tasks from localStorage
  useEffect(() => {
    if (studentData) {
      // Get stored tasks
      let storedTaskData: StoredTasks = { completedTaskIds: [], customTasks: [] }
      try {
        const stored = localStorage.getItem('studentTasks')
        if (stored) {
          storedTaskData = JSON.parse(stored)
        }
      } catch (err) {
        console.error('Error loading stored tasks:', err)
      }

      // Calculate task completion by course and type
      const courseProgress: {[courseName: string]: {completed: number, total: number}} = {}
      const typeProgress: {[type: string]: {completed: number, total: number}} = {}
      
      // Initialize common task types
      const taskTypes = ['assignment', 'exam', 'quiz', 'project']
      taskTypes.forEach((type: string) => {
        typeProgress[type] = { completed: 0, total: 0 }
      })

      // Process courses and tasks
      for (const key in studentData) {
        if (key.startsWith("semester_") && studentData[key].courses) {
          studentData[key].courses.forEach((course: Course) => {
            // Initialize course progress
            courseProgress[course.course_name] = { completed: 0, total: 0 }
            
            if (course.schedule) {
              course.schedule.forEach((item: ScheduleItem) => {
                if (taskTypes.includes(item.type)) {
                  const taskId = `${course.course_name}-${item.title}-${item.date}`
                  
                  // Increment totals
                  courseProgress[course.course_name].total++
                  if (!typeProgress[item.type]) {
                    typeProgress[item.type] = { completed: 0, total: 0 }
                  }
                  typeProgress[item.type].total++
                  
                  // Check completion
                  if (storedTaskData.completedTaskIds.includes(taskId)) {
                    courseProgress[course.course_name].completed++
                    typeProgress[item.type].completed++
                  }
                }
              })
            }
          })
        }
      }
      
      // Process custom tasks
      storedTaskData.customTasks.forEach(task => {
        if (courseProgress[task.courseName]) {
          courseProgress[task.courseName].total++
          if (!typeProgress[task.type]) {
            typeProgress[task.type] = { completed: 0, total: 0 }
          }
          typeProgress[task.type].total++
          
          if (storedTaskData.completedTaskIds.includes(task.id)) {
            courseProgress[task.courseName].completed++
            typeProgress[task.type].completed++
          }
        }
      })
      
      setTaskProgress(courseProgress)
      setTaskCompletionByType(typeProgress)
    }
  }, [studentData])

  // Handle input change for marks
  const handleMarkChange = (courseIndex: number, category: string, value: string) => {
    const numValue = value === "" ? 0 : Number(value)
    
    setUserMarks(prev => {
      const courseMarks = prev[courseIndex] || {}
      return {
        ...prev,
        [courseIndex]: {
          ...courseMarks,
          [category]: numValue
        }
      }
    })
  }

  // Calculate grade based on user input and marks distribution
  const calculateGrade = (courseIndex: number, course: Course) => {
    const marks = userMarks[courseIndex] || {}
    const distribution = course.marks_distribution
    
    let totalPercentage = 0
    let achievedPercentage = 0
    
    for (const category in distribution) {
      if (marks[category] !== undefined) {
        const categoryPercentage = distribution[category]
        totalPercentage += categoryPercentage
        achievedPercentage += (marks[category] / 100) * categoryPercentage
      }
    }
    
    // Only calculate if we have some marks
    if (totalPercentage === 0) return ""
    
    // Scale the achieved percentage to account for missing categories
    const scaledPercentage = totalPercentage > 0 ? (achievedPercentage / totalPercentage) * 100 : 0
    
    // Assign letter grade based on percentage
    let grade = ""
    if (scaledPercentage >= 90) grade = "A"
    else if (scaledPercentage >= 80) grade = "B"
    else if (scaledPercentage >= 70) grade = "C"
    else if (scaledPercentage >= 60) grade = "D"
    else grade = "F"
    
    setCalculatedGrades(prev => ({
      ...prev,
      [courseIndex]: grade
    }))
    
    // Close the popup after calculation
    setActivePopup(null)
    
    return grade
  }

  // Toggle the marks input popup
  const toggleMarksPopup = (index: number | null) => {
    setActivePopup(activePopup === index ? null : index)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-opacity-50" style={{ animationDuration: '2s' }} />
      </div>
    )
  }

  if (error || !studentData) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 h-full p-6">
        <h1 className="text-2xl font-bold mb-6">Courses</h1>
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 h-full p-6 overflow-auto">
      <h1 className="text-2xl font-bold mb-6">Courses</h1>
      
      {/* Student Info */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Student Information</h2>
        <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-900">
          <p><span className="font-medium">Name:</span> {studentData.name}</p>
          <p><span className="font-medium">Email:</span> {studentData.email}</p>
        </div>
      </div>
      
      {/* Task Completion Summary */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Task Completion</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(taskCompletionByType).map(([type, status]) => (
            <div key={type} className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900">
              <h4 className="text-sm font-medium mb-1 capitalize">{type}</h4>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{status.completed}/{status.total}</span>
                <span className="text-sm font-medium">
                  {status.total > 0 ? `${Math.round((status.completed / status.total) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${status.completed > 0 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                  style={{ width: `${status.total > 0 ? (status.completed / status.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Course List */}
      <div>
        <h2 className="text-xl font-semibold mb-2">My Courses</h2>
        {courses.length > 0 ? (
          <div className="space-y-4">
            {courses.map((course: Course, index: number) => (
              <div key={index} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium">{course.course_name}</h3>
                  {(course.grade || calculatedGrades[index]) && (
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      (course.grade || calculatedGrades[index]).startsWith('A') ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                      (course.grade || calculatedGrades[index]).startsWith('B') ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                      (course.grade || calculatedGrades[index]).startsWith('C') ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' :
                      'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    }`}>
                      {calculatedGrades[index] ? `Calculated: ${calculatedGrades[index]}` : course.grade}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Instructor: {course.instructor_name}</p>
                
                {/* Task Completion for this course */}
                {taskProgress[course.course_name] && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Tasks:</span>
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full bg-blue-500`}
                        style={{ width: `${taskProgress[course.course_name].total > 0 ? 
                          (taskProgress[course.course_name].completed / taskProgress[course.course_name].total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">
                      {taskProgress[course.course_name].completed}/{taskProgress[course.course_name].total}
                    </span>
                  </div>
                )}
                
                {/* Course Details */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Marks Distribution */}
                  <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900">
                    <h4 className="text-sm font-medium mb-2">Marks Distribution</h4>
                    {course.marks_distribution && (
                      <div className="space-y-2">
                        {Object.entries(course.marks_distribution).map(([key, value]: [string, number]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-sm capitalize">{key}</span>
                            <span className="text-sm font-medium">{value}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Current Marks - Minimalistic */}
                  <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">Current Marks</h4>
                      <button 
                        className="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => toggleMarksPopup(index)}
                      >
                        Input Marks
                      </button>
                    </div>
                    {calculatedGrades[index] && (
                      <div className="mt-2 p-2 rounded-md bg-gray-200 dark:bg-gray-800">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Calculated Grade:</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            calculatedGrades[index].startsWith('A') ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            calculatedGrades[index].startsWith('B') ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            calculatedGrades[index].startsWith('C') ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {calculatedGrades[index]}
                          </span>
                        </div>
                      </div>
                    )}
                    {Object.keys(userMarks[index] || {}).length > 0 && !calculatedGrades[index] && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        You have input marks. Click &ldquo;Input Marks&rdquo; to calculate your grade.
                      </div>
                    )}
                    {Object.keys(userMarks[index] || {}).length === 0 && !calculatedGrades[index] && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        No marks inputted yet
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Marks Input Popup */}
                {activePopup === index && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md overflow-hidden shadow-xl">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                        <h3 className="text-lg font-medium">Input Your Marks</h3>
                        <button 
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          onClick={() => toggleMarksPopup(null)}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="p-4 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-4">
                          {course.marks_distribution && Object.entries(course.marks_distribution).map(([key, percentage]) => (
                            <div key={key} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label htmlFor={`mark-${index}-${key}`} className="text-sm font-medium capitalize">
                                  {key} ({percentage}%)
                                </label>
                                <span className="text-sm text-gray-500">
                                  {userMarks[index]?.[key] !== undefined ? userMarks[index][key] : '0'}/100
                                </span>
                              </div>
                              <input
                                id={`mark-${index}-${key}`}
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-300 dark:bg-gray-700"
                                value={userMarks[index]?.[key] || 0}
                                onChange={(e) => handleMarkChange(index, key, e.target.value)}
                              />
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>0</span>
                                <span>50</span>
                                <span>100</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end space-x-2">
                        <button
                          className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-sm"
                          onClick={() => toggleMarksPopup(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-md bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium"
                          onClick={() => calculateGrade(index, course)}
                        >
                          Calculate Grade
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Schedule */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Class Schedule</h4>
                  {course.schedule && course.schedule.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {course.schedule.map((item: ScheduleItem, idx: number) => {
                        const taskId = `${course.course_name}-${item.title}-${item.date}`
                        let isCompleted = false
                        
                        try {
                          const storedData = localStorage.getItem('studentTasks')
                          if (storedData) {
                            const parsedData = JSON.parse(storedData)
                            isCompleted = parsedData.completedTaskIds?.includes(taskId) || false
                          }
                        } catch (err) {
                          console.error('Error checking task completion:', err)
                        }
                        
                        return (
                          <div 
                            key={idx} 
                            className={`p-2 rounded-lg ${isCompleted ? 
                              'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30' : 
                              'bg-gray-100 dark:bg-gray-900'} text-sm`}
                          >
                            <div className="flex justify-between items-start">
                              <span className={`font-medium ${isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                                {item.title}
                              </span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800">
                                {formatDate(item.date)}
                              </span>
                            </div>
                            <div className="mt-1 flex justify-between text-xs">
                              <span className={`text-gray-600 dark:text-gray-400 ${isCompleted ? 'line-through' : ''}`}>
                                {item.description}
                              </span>
                              <span className="capitalize px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800">
                                {item.type}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No schedule information available</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No courses found</p>
        )}
      </div>
    </div>
  )
} 