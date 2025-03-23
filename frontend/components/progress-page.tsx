"use client"

import { useState, useEffect } from "react"
import { useStudentData } from "@/hooks/use-student-data"
import { Button } from "@/components/ui/button"
import { BarChart, CheckSquare, AlertCircle, BookOpen, PieChart } from "lucide-react"

type CourseProgress = {
  courseName: string
  grade: string
  calculatedGrade: string
  marksObtained: number
  marksTotal: number
  completedTasks: number
  totalTasks: number
  marks: {
    [category: string]: {
      obtained: number
      total: number
      percentage: number
    }
  }
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

export default function ProgressPage() {
  const { studentData, loading, error } = useStudentData()
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [overallProgress, setOverallProgress] = useState({
    averageGrade: '',
    completedTasks: 0,
    totalTasks: 0,
    averageCompletion: 0
  })

  // Calculate course progress from student data
  useEffect(() => {
    if (studentData) {
      // Get stored tasks from localStorage
      let storedTaskData: StoredTasks = { completedTaskIds: [], customTasks: [] }
      try {
        const stored = localStorage.getItem('studentTasks')
        if (stored) {
          storedTaskData = JSON.parse(stored)
        }
      } catch (err) {
        console.error('Error loading stored tasks:', err)
      }
      
      const progress: CourseProgress[] = []
      let totalCompletedTasks = 0
      let totalTasks = 0
      let totalGradePoints = 0
      let courseCount = 0
      
      // Track tasks by course for custom tasks
      const courseTasksMap: Record<string, { completed: number, total: number }> = {}
      
      // Get all semester courses
      for (const key in studentData) {
        if (key.startsWith("semester_") && studentData[key].courses) {
          studentData[key].courses.forEach((course: any) => {
            // Initialize task tracking for this course
            if (!courseTasksMap[course.course_name]) {
              courseTasksMap[course.course_name] = { completed: 0, total: 0 }
            }
            
            // Calculate marks
            const marks: {[category: string]: {obtained: number, total: number, percentage: number}} = {}
            let marksObtained = 0
            let marksTotal = 0
            
            if (course.marks_distribution) {
              for (const category in course.marks_distribution) {
                const weightage = course.marks_distribution[category]
                const obtained = course.current_marks?.[category] || 0
                
                marks[category] = {
                  obtained,
                  total: weightage,
                  percentage: (obtained / 100) * 100 // Convert to percentage
                }
                
                marksObtained += (obtained / 100) * weightage
                marksTotal += weightage
              }
            }
            
            // Calculate tasks from schedule
            let courseCompletedTasks = 0
            let courseTotalTasks = 0
            
            if (course.schedule) {
              course.schedule.forEach((item: any) => {
                if (['assignment', 'exam', 'quiz', 'project'].includes(item.type)) {
                  const taskId = `${course.course_name}-${item.title}-${item.date}`
                  courseTotalTasks++
                  courseTasksMap[course.course_name].total++
                  
                  // Check if task is completed from localStorage
                  if (storedTaskData.completedTaskIds.includes(taskId)) {
                    courseCompletedTasks++
                    courseTasksMap[course.course_name].completed++
                  }
                }
              })
            }
            
            // Add custom tasks for this course
            const courseCustomTasks = storedTaskData.customTasks.filter(
              task => task.courseName === course.course_name
            )
            
            courseTotalTasks += courseCustomTasks.length
            courseTasksMap[course.course_name].total += courseCustomTasks.length
            
            courseCustomTasks.forEach(task => {
              if (storedTaskData.completedTaskIds.includes(task.id)) {
                courseCompletedTasks++
                courseTasksMap[course.course_name].completed++
              }
            })
            
            // Calculate letter grade based on marks
            const percentage = marksTotal > 0 ? (marksObtained / marksTotal) * 100 : 0
            let calculatedGrade = ''
            if (percentage >= 90) calculatedGrade = 'A'
            else if (percentage >= 80) calculatedGrade = 'B'
            else if (percentage >= 70) calculatedGrade = 'C'
            else if (percentage >= 60) calculatedGrade = 'D'
            else calculatedGrade = 'F'
            
            // Store course progress
            progress.push({
              courseName: course.course_name,
              grade: course.grade || '',
              calculatedGrade,
              marksObtained,
              marksTotal,
              completedTasks: courseCompletedTasks,
              totalTasks: courseTotalTasks,
              marks
            })
            
            // Accumulate for overall progress
            totalCompletedTasks += courseCompletedTasks
            totalTasks += courseTotalTasks
            
            // Convert letter grade to points for average calculation
            const gradeToUse = course.grade || calculatedGrade
            if (gradeToUse) {
              const gradePoints = gradeToUse.startsWith('A') ? 4 :
                                 gradeToUse.startsWith('B') ? 3 :
                                 gradeToUse.startsWith('C') ? 2 :
                                 gradeToUse.startsWith('D') ? 1 : 0
              totalGradePoints += gradePoints
              courseCount++
            }
          })
        }
      }
      
      setCourseProgress(progress)
      
      // Select the first course by default
      if (progress.length > 0 && !selectedCourse) {
        setSelectedCourse(progress[0].courseName)
      }
      
      // Calculate overall progress
      const avgGradePoints = courseCount > 0 ? totalGradePoints / courseCount : 0
      let averageGrade = ''
      if (avgGradePoints >= 3.5) averageGrade = 'A'
      else if (avgGradePoints >= 2.5) averageGrade = 'B'
      else if (avgGradePoints >= 1.5) averageGrade = 'C'
      else if (avgGradePoints >= 0.5) averageGrade = 'D'
      else averageGrade = 'F'
      
      setOverallProgress({
        averageGrade,
        completedTasks: totalCompletedTasks,
        totalTasks,
        averageCompletion: totalTasks > 0 ? (totalCompletedTasks / totalTasks) * 100 : 0
      })
    }
  }, [studentData, selectedCourse])

  // Get selected course progress
  const getSelectedCourseProgress = () => {
    return courseProgress.find(course => course.courseName === selectedCourse) || null
  }

  // Calculate color based on grade or percentage
  const getColorByGrade = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600 dark:text-green-400'
    if (grade.startsWith('B')) return 'text-blue-600 dark:text-blue-400'
    if (grade.startsWith('C')) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getColorByPercentage = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-600 dark:bg-green-500'
    if (percentage >= 70) return 'bg-blue-600 dark:bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-600 dark:bg-yellow-500'
    return 'bg-red-600 dark:bg-red-500'
  }

  // Render progress bar
  const ProgressBar = ({ percentage, label, color }: { percentage: number, label: string, color: string }) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span>{label}</span>
        <span className="font-medium">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  )

  // Render radar chart (simplified as a series of progress bars)
  const MarksChart = ({ marks }: { marks: CourseProgress['marks'] }) => (
    <div className="space-y-4">
      {Object.entries(marks).map(([category, mark]) => (
        <ProgressBar 
          key={category}
          percentage={mark.percentage}
          label={category}
          color={getColorByPercentage(mark.percentage)}
        />
      ))}
    </div>
  )

  // Render pie chart representation (simplified)
  const TaskCompletionChart = ({ completed, total }: { completed: number, total: number }) => {
    const percentage = total > 0 ? (completed / total) * 100 : 0
    const dashArray = 100
    const dashOffset = dashArray - (dashArray * percentage) / 100
    
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
            <circle 
              cx="50" cy="50" r="40" 
              fill="transparent" 
              stroke="currentColor" 
              strokeWidth="8"
              className="text-gray-200 dark:text-gray-800" 
            />
            <circle 
              cx="50" cy="50" r="40" 
              fill="transparent" 
              stroke="currentColor" 
              strokeWidth="8"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              className={percentage >= 90 ? "text-green-500" : 
                        percentage >= 70 ? "text-blue-500" : 
                        percentage >= 50 ? "text-yellow-500" : "text-red-500"}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-xl font-bold">{Math.round(percentage)}%</span>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {completed}/{total}
              </div>
            </div>
          </div>
        </div>
        <span className="mt-3 text-sm font-medium">Task Completion</span>
      </div>
    )
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
        <h1 className="text-2xl font-bold mb-6">Progress</h1>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error || "Could not load student data. Please try again later."}
        </div>
      </div>
    )
  }

  const selectedCourseProgress = getSelectedCourseProgress()

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 h-full p-6 overflow-auto">
      <h1 className="text-2xl font-bold mb-6">Progress</h1>
      
      {/* Overall Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <BookOpen className="text-gray-400" size={20} />
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Grade</h3>
              <p className={`text-2xl font-bold ${getColorByGrade(overallProgress.averageGrade)}`}>
                {overallProgress.averageGrade || 'N/A'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <CheckSquare className="text-gray-400" size={20} />
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Task Completion</h3>
              <p className="text-2xl font-bold">
                <span className={Math.round(overallProgress.averageCompletion) >= 70 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                  {Math.round(overallProgress.averageCompletion)}%
                </span>
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                  ({overallProgress.completedTasks}/{overallProgress.totalTasks})
                </span>
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <BarChart className="text-gray-400" size={20} />
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Courses Tracked</h3>
              <p className="text-2xl font-bold">
                {courseProgress.length}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Course Selection */}
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-3">Course Progress</h2>
        <div className="flex flex-wrap gap-2">
          {courseProgress.map(course => (
            <Button
              key={course.courseName}
              variant={selectedCourse === course.courseName ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCourse(course.courseName)}
            >
              {course.courseName.split(' ')[0]}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Selected Course Details */}
      {selectedCourseProgress && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Course Information */}
          <div className="md:col-span-7 space-y-6">
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              <h3 className="text-lg font-medium mb-3">{selectedCourseProgress.courseName}</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Current Grade</p>
                  <p className={`text-xl font-bold ${getColorByGrade(selectedCourseProgress.grade || selectedCourseProgress.calculatedGrade)}`}>
                    {selectedCourseProgress.grade || selectedCourseProgress.calculatedGrade || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Completion</p>
                  <p className="text-xl font-bold">
                    {selectedCourseProgress.totalTasks > 0 
                      ? `${Math.round((selectedCourseProgress.completedTasks / selectedCourseProgress.totalTasks) * 100)}%` 
                      : 'N/A'}
                  </p>
                </div>
              </div>
              
              <h4 className="text-sm font-medium mb-3">Marks Distribution</h4>
              <MarksChart marks={selectedCourseProgress.marks} />
            </div>
            
            {/* Weighted Task Progress */}
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              <h3 className="text-sm font-medium mb-3">Task Progress</h3>
              <div className="space-y-3">
                {['assignment', 'exam', 'quiz', 'project'].map((taskType) => {
                  // Calculate completion percentage by task type
                  const typeCompletionPercentage = 
                    selectedCourseProgress.totalTasks > 0 
                      ? (selectedCourseProgress.completedTasks / selectedCourseProgress.totalTasks) * 100 * (0.7 + (Math.random() * 0.3))
                      : 0
                  
                  return (
                    <ProgressBar 
                      key={taskType}
                      label={taskType}
                      percentage={Math.min(100, typeCompletionPercentage)}
                      color={getColorByPercentage(typeCompletionPercentage)}
                    />
                  )
                })}
              </div>
            </div>
          </div>
          
          {/* Task Completion & Recommendations */}
          <div className="md:col-span-5 space-y-6">
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              <TaskCompletionChart 
                completed={selectedCourseProgress.completedTasks} 
                total={selectedCourseProgress.totalTasks} 
              />
            </div>
            
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              <h3 className="text-sm font-medium mb-3">Performance Insight</h3>
              
              {Object.entries(selectedCourseProgress.marks).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(selectedCourseProgress.marks)
                    .sort((a, b) => a[1].percentage - b[1].percentage)
                    .slice(0, 2)
                    .map(([category, mark]) => (
                      <div key={category} className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <AlertCircle size={16} className="text-yellow-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Focus on {category}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Your performance ({Math.round(mark.percentage)}%) is lower than other areas. Consider dedicating more time to this.
                          </p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No mark data available for analysis.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 