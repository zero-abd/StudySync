import { useState, useEffect } from "react"
import { fetchStudentData } from "@/lib/api"

export interface StudentData {
  email: string
  name: string
  [key: string]: any
}

export interface UseStudentDataResult {
  studentData: StudentData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStudentData(): UseStudentDataResult {
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const data = await fetchStudentData()
      setStudentData(data)
    } catch (err) {
      console.error('Error fetching student data:', err)
      setError("Failed to load student data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const refetch = async () => {
    await fetchData()
  }

  return { studentData, loading, error, refetch }
} 