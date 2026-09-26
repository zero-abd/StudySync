import { useSyncExternalStore } from "react"
import sampleStudent from "@/data/sample-student.json"

export interface ScheduleItem {
  date: string
  type: string
  title: string
  description: string | null
  time?: string
}

/** A schedule item joined with the course it belongs to. */
export type CourseItem = ScheduleItem & { courseName: string; startTime?: string; endTime?: string }

export interface Course {
  course_name: string
  instructor_name: string
  start_time: string
  end_time: string
  grade?: string
  current_marks?: Record<string, number>
  marks_distribution: Record<string, number>
  schedule: ScheduleItem[]
}

export interface Semester {
  term: string
  courses: Course[]
}

export interface StudentData {
  email: string
  name: string
  // semester_1, semester_2, ... hold Semester objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface UseStudentDataResult {
  studentData: StudentData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// The dashboard lives entirely in the visitor's browser. It starts from the
// bundled sample student and every saved syllabus is written to localStorage.
const STORAGE_KEY = "studysync:studentData"
const SAMPLE = sampleStudent as StudentData

let current: StudentData | null = null
const listeners = new Set<() => void>()

function readStorage(): StudentData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object") return parsed as StudentData
    }
  } catch {
    // Storage blocked or corrupted: fall back to the sample.
  }
  return structuredClone(SAMPLE)
}

function getSnapshot(): StudentData {
  if (current === null) current = readStorage()
  return current
}

function getServerSnapshot(): StudentData | null {
  return null
}

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      current = readStorage()
      emit()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

function write(next: StudentData) {
  current = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Quota or privacy mode: keep the in-memory copy for this tab.
  }
  emit()
}

export function getCourses(data: StudentData | null): Course[] {
  if (!data) return []
  const courses: Course[] = []
  for (const key in data) {
    if (key.startsWith("semester_") && data[key]?.courses) {
      courses.push(...(data[key] as Semester).courses)
    }
  }
  return courses
}

/** Add a course extracted from a syllabus, replacing any course with the same name. */
export function saveCourse(course: Course) {
  const data = structuredClone(getSnapshot())
  let semesterKey = Object.keys(data).find((k) => k.startsWith("semester_"))
  if (!semesterKey) {
    semesterKey = "semester_1"
    data[semesterKey] = { term: "Current term", courses: [] } satisfies Semester
  }
  const semester = data[semesterKey] as Semester
  const entry: Course = {
    course_name: course.course_name || "Unknown Course",
    instructor_name: course.instructor_name || "Unknown Instructor",
    start_time: course.start_time || "",
    end_time: course.end_time || "",
    grade: "",
    current_marks: {},
    marks_distribution: course.marks_distribution || {},
    schedule: course.schedule || [],
  }
  const index = semester.courses.findIndex((c) => c.course_name === entry.course_name)
  if (index >= 0) semester.courses[index] = entry
  else semester.courses.push(entry)
  write(data)
}

/** Drop everything the visitor saved and go back to the bundled sample student. */
export function resetToSample() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem("studentTasks")
  } catch {
    // ignore
  }
  write(structuredClone(SAMPLE))
}

export function useStudentData(): UseStudentDataResult {
  const studentData = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return {
    studentData,
    loading: studentData === null,
    error: null,
    refetch: async () => {},
  }
}
