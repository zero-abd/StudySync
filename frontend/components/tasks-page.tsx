"use client"

import { useState, useEffect } from "react"
import { useStudentData } from "@/hooks/use-student-data"
import { Button } from "@/components/ui/button"
import { Calendar, CheckSquare, Clock, AlertCircle, ArrowUp, ArrowDown, Filter, Plus, X } from "lucide-react"

type Task = {
  id: string
  courseName: string
  title: string
  description: string
  type: string
  date: Date
  completed: boolean
  priority: 'high' | 'medium' | 'low'
  isCustom?: boolean
}

type FilterOptions = {
  course: string | null
  type: string | null
  priority: string | null
  completed: boolean | null
}

type StoredTasks = {
  completedTaskIds: string[]
  customTasks: Array<Omit<Task, 'date'> & { date: string }>
}

export default function TasksPage() {
  const { studentData, loading, error } = useStudentData()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    course: null,
    type: null,
    priority: null,
    completed: null
  })
  const [showFilters, setShowFilters] = useState(false)
  const [courses, setCourses] = useState<string[]>([])
  const [taskTypes, setTaskTypes] = useState<string[]>([])
  
  // New task creation state
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState<{
    courseName: string
    title: string
    description: string
    type: string
    date: string
    priority: 'high' | 'medium' | 'low'
  }>({
    courseName: '',
    title: '',
    description: '',
    type: 'assignment',
    date: new Date().toISOString().split('T')[0],
    priority: 'medium'
  })

  // Load tasks from student data
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
      
      const loadedTasks: Task[] = []
      const courseNames: string[] = []
      const types = new Set<string>(['assignment', 'exam', 'quiz', 'project'])
      
      // Get all semester courses
      for (const key in studentData) {
        if (key.startsWith("semester_") && studentData[key].courses) {
          studentData[key].courses.forEach((course: any) => {
            if (!courseNames.includes(course.course_name)) {
              courseNames.push(course.course_name)
            }
            
            if (course.schedule) {
              course.schedule.forEach((item: any) => {
                if (['assignment', 'exam', 'quiz', 'project'].includes(item.type)) {
                  types.add(item.type)
                  
                  // Determine priority based on type and date
                  const itemDate = new Date(item.date)
                  const now = new Date()
                  const daysUntil = Math.ceil((itemDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  
                  let priority: 'high' | 'medium' | 'low' = 'medium'
                  if (item.type === 'exam' || daysUntil <= 3) {
                    priority = 'high'
                  } else if (daysUntil > 7) {
                    priority = 'low'
                  }
                  
                  const taskId = `${course.course_name}-${item.title}-${item.date}`
                  
                  loadedTasks.push({
                    id: taskId,
                    courseName: course.course_name,
                    title: item.title,
                    description: item.description || '',
                    type: item.type,
                    date: new Date(item.date),
                    completed: storedTaskData.completedTaskIds.includes(taskId),
                    priority
                  })
                }
              })
            }
          })
        }
      }
      
      // Add custom tasks from localStorage
      if (storedTaskData.customTasks && storedTaskData.customTasks.length > 0) {
        storedTaskData.customTasks.forEach(customTask => {
          loadedTasks.push({
            ...customTask,
            date: new Date(customTask.date),
            completed: storedTaskData.completedTaskIds.includes(customTask.id),
            isCustom: true
          })
        })
      }
      
      // Sort by date and priority
      loadedTasks.sort((a, b) => {
        if (a.date.getTime() !== b.date.getTime()) {
          return a.date.getTime() - b.date.getTime()
        }
        
        const priorityValue = { high: 0, medium: 1, low: 2 }
        return priorityValue[a.priority] - priorityValue[b.priority]
      })
      
      setTasks(loadedTasks)
      setCourses(courseNames)
      setTaskTypes(Array.from(types))
      
      // Set default course if available
      if (courseNames.length > 0 && !newTask.courseName) {
        setNewTask(prev => ({ ...prev, courseName: courseNames[0] }))
      }
    }
  }, [studentData, newTask.courseName])

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (tasks.length) {
      const completedTaskIds = tasks
        .filter(task => task.completed)
        .map(task => task.id)
      
      const customTasks = tasks
        .filter(task => task.isCustom)
        .map(task => ({
          ...task,
          date: task.date.toISOString().split('T')[0]
        }))
      
      const dataToStore: StoredTasks = { 
        completedTaskIds, 
        customTasks 
      }
      
      localStorage.setItem('studentTasks', JSON.stringify(dataToStore))
    }
  }, [tasks])

  // Toggle task completion
  const toggleTaskCompletion = (taskId: string) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    )
  }

  // Add new task
  const handleAddTask = () => {
    if (!newTask.title || !newTask.courseName || !newTask.date) {
      return // Don't add if required fields are missing
    }
    
    const taskId = `custom-${Date.now()}-${newTask.title}`
    
    const task: Task = {
      id: taskId,
      courseName: newTask.courseName,
      title: newTask.title,
      description: newTask.description,
      type: newTask.type,
      date: new Date(newTask.date),
      completed: false,
      priority: newTask.priority,
      isCustom: true
    }
    
    setTasks(prev => {
      const updated = [...prev, task]
      
      // Sort by date and priority
      updated.sort((a, b) => {
        if (a.date.getTime() !== b.date.getTime()) {
          return a.date.getTime() - b.date.getTime()
        }
        
        const priorityValue = { high: 0, medium: 1, low: 2 }
        return priorityValue[a.priority] - priorityValue[b.priority]
      })
      
      return updated
    })
    
    // Reset new task form
    setNewTask({
      courseName: newTask.courseName,
      title: '',
      description: '',
      type: 'assignment',
      date: new Date().toISOString().split('T')[0],
      priority: 'medium'
    })
    
    setShowAddTask(false)
  }

  // Delete custom task
  const deleteCustomTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }

  // Handle new task form input change
  const handleNewTaskChange = (field: string, value: string) => {
    setNewTask(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Filter tasks
  const getFilteredTasks = () => {
    return tasks.filter(task => {
      if (filterOptions.course && task.courseName !== filterOptions.course) return false
      if (filterOptions.type && task.type !== filterOptions.type) return false
      if (filterOptions.priority && task.priority !== filterOptions.priority) return false
      if (filterOptions.completed !== null && task.completed !== filterOptions.completed) return false
      return true
    })
  }

  // Update filter option
  const updateFilter = (key: keyof FilterOptions, value: any) => {
    setFilterOptions(prev => ({
      ...prev,
      [key]: prev[key] === value ? null : value // Toggle if already selected
    }))
  }

  // Reset filters
  const resetFilters = () => {
    setFilterOptions({
      course: null,
      type: null,
      priority: null,
      completed: null
    })
  }

  // Format date to a readable string
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Calculate days until deadline
  const getDaysUntil = (date: Date) => {
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    return `${diffDays} days`
  }

  // Get status colors based on priority and completion
  const getStatusColor = (task: Task) => {
    if (task.completed) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    
    if (task.priority === 'high') return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    if (task.priority === 'medium') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
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
        <h1 className="text-2xl font-bold mb-6">Tasks</h1>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error || "Could not load student data. Please try again later."}
        </div>
      </div>
    )
  }

  const filteredTasks = getFilteredTasks()

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 h-full p-6 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter size={16} />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setShowAddTask(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Add Task
          </Button>
        </div>
      </div>

      {/* New Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-medium">Add New Task</h3>
              <button 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setShowAddTask(false)}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                {/* Course Selection */}
                <div>
                  <label className="block text-sm font-medium mb-1">Course *</label>
                  <select
                    className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    value={newTask.courseName}
                    onChange={(e) => handleNewTaskChange('courseName', e.target.value)}
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.map(course => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                </div>
                
                {/* Task Title */}
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    value={newTask.title}
                    onChange={(e) => handleNewTaskChange('title', e.target.value)}
                    placeholder="Task title"
                    required
                  />
                </div>
                
                {/* Task Description */}
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm h-20"
                    value={newTask.description}
                    onChange={(e) => handleNewTaskChange('description', e.target.value)}
                    placeholder="Task description (optional)"
                  />
                </div>
                
                {/* Type and Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      value={newTask.type}
                      onChange={(e) => handleNewTaskChange('type', e.target.value)}
                    >
                      <option value="assignment">Assignment</option>
                      <option value="exam">Exam</option>
                      <option value="quiz">Quiz</option>
                      <option value="project">Project</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      value={newTask.priority}
                      onChange={(e) => handleNewTaskChange('priority', e.target.value as any)}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                
                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date *</label>
                  <input
                    type="date"
                    className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    value={newTask.date}
                    onChange={(e) => handleNewTaskChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddTask(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleAddTask}
                disabled={!newTask.title || !newTask.courseName || !newTask.date}
              >
                Add Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <h2 className="text-sm font-medium mb-3">Filter Tasks</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Course Filter */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Course</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {courses.map(course => (
                  <button
                    key={course}
                    onClick={() => updateFilter('course', course)}
                    className={`text-xs px-2 py-1 rounded-md ${
                      filterOptions.course === course 
                        ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900' 
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {course.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Type</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {Array.from(taskTypes).map(type => (
                  <button
                    key={type}
                    onClick={() => updateFilter('type', type)}
                    className={`text-xs px-2 py-1 rounded-md ${
                      filterOptions.type === type 
                        ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900' 
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Priority</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {['high', 'medium', 'low'].map(priority => (
                  <button
                    key={priority}
                    onClick={() => updateFilter('priority', priority)}
                    className={`text-xs px-2 py-1 rounded-md ${
                      filterOptions.priority === priority 
                        ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900' 
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
              <div className="mt-1 flex flex-wrap gap-1">
                <button
                  onClick={() => updateFilter('completed', true)}
                  className={`text-xs px-2 py-1 rounded-md ${
                    filterOptions.completed === true 
                      ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900' 
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => updateFilter('completed', false)}
                  className={`text-xs px-2 py-1 rounded-md ${
                    filterOptions.completed === false 
                      ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900' 
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFilters}
              className="text-xs"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div>
        {filteredTasks.length > 0 ? (
          <div className="space-y-3">
            {filteredTasks.map(task => (
              <div 
                key={task.id} 
                className={`p-4 rounded-lg border ${task.completed ? 'border-gray-200 dark:border-gray-800 opacity-70' : 'border-gray-200 dark:border-gray-800'}`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button 
                    className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center ${
                      task.completed 
                        ? 'bg-gray-800 border-gray-800 dark:bg-gray-200 dark:border-gray-200' 
                        : 'border-gray-300 dark:border-gray-700'
                    }`}
                    onClick={() => toggleTaskCompletion(task.id)}
                  >
                    {task.completed && (
                      <CheckSquare size={12} className="text-white dark:text-gray-900" />
                    )}
                  </button>
                  
                  {/* Task Content */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                          {task.title}
                          {task.isCustom && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Custom)</span>}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{task.courseName}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(task)}`}>
                          {task.completed ? 'Completed' : task.priority}
                        </span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(task.date)}
                        </span>
                        {task.isCustom && (
                          <button
                            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                            onClick={() => deleteCustomTask(task.id)}
                            title="Delete task"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{task.description}</p>
                    )}
                    
                    <div className="mt-2 flex justify-between items-center">
                      <span className={`text-xs flex items-center gap-1 ${
                        getDaysUntil(task.date) === 'Overdue' 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        <Clock size={12} />
                        {getDaysUntil(task.date)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {task.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckSquare size={40} className="text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No tasks found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {Object.values(filterOptions).some(val => val !== null) 
                ? "Try changing your filters or create a new task" 
                : "You don't have any tasks yet"}
            </p>
            <div className="mt-4 flex gap-4">
              {Object.values(filterOptions).some(val => val !== null) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetFilters}
                >
                  Reset Filters
                </Button>
              )}
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setShowAddTask(true)}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                Add Task
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 