"use client"

import { useStudentData } from "@/hooks/use-student-data"

export default function CoursesPage() {
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
      
      {/* Course List */}
      <div>
        <h2 className="text-xl font-semibold mb-2">My Courses</h2>
        {courses.length > 0 ? (
          <div className="space-y-4">
            {courses.map((course: any, index: number) => (
              <div key={index} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium">{course.name}</h3>
                  {course.grade && (
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      course.grade.startsWith('A') ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                      course.grade.startsWith('B') ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                      course.grade.startsWith('C') ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' :
                      'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    }`}>
                      {course.grade}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Instructor: {course.instructor_name}</p>
                
                {/* Course Details */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Marks Distribution */}
                  <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900">
                    <h4 className="text-sm font-medium mb-2">Marks Distribution</h4>
                    {course.marks_distribution && (
                      <div className="space-y-2">
                        {Object.entries(course.marks_distribution).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-sm capitalize">{key}</span>
                            <span className="text-sm font-medium">{value}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Current Marks */}
                  <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900">
                    <h4 className="text-sm font-medium mb-2">Current Marks</h4>
                    {course.current_marks && (
                      <div className="space-y-2">
                        {Object.entries(course.current_marks).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-sm capitalize">{key}</span>
                            <span className="text-sm font-medium">{value}/{course.marks_distribution[key]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Schedule */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Class Schedule</h4>
                  {course.schedule && course.schedule.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {course.schedule.map((item: any, idx: number) => (
                        <div key={idx} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-sm">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">{item.title}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800">
                              {formatDate(item.date)}
                            </span>
                          </div>
                          <div className="mt-1 flex justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">{item.description}</span>
                            <span className="capitalize px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800">
                              {item.type}
                            </span>
                          </div>
                        </div>
                      ))}
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