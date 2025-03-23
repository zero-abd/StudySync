"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, Send, Upload, X, AlertCircle, Maximize, Minimize } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useStudentData } from "@/hooks/use-student-data"

interface ChatPanelProps {
  isOpen: boolean
  onToggle: () => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface PdfData {
  course_name: string
  instructor_name: string
  start_time: string
  end_time: string
  marks_distribution: Record<string, number>
  schedule: ScheduleItem[]
}

interface ScheduleItem {
  date: string
  type: string
  title: string
  description: string | null
}

export default function ChatPanel({ isOpen, onToggle }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showPdfDataDialog, setShowPdfDataDialog] = useState(false)
  const [editedPdfData, setEditedPdfData] = useState<PdfData | null>(null)
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [isPdfSidebarCollapsed, setIsPdfSidebarCollapsed] = useState(false)
  const { refetch } = useStudentData()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input }),
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Reader not available')

      const assistantMessageId = Date.now().toString()
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = new TextDecoder().decode(value)
        const lines = text.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            
            if (data.chunk) {
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: msg.content + data.chunk } 
                    : msg
                )
              )
            }
          } catch (e) {
            console.error('Error parsing stream:', e)
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [
        ...prev, 
        { id: Date.now().toString(), role: 'assistant', content: 'Sorry, there was an error processing your request.' }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPdfError(null)
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      
      // Create a data URL for the PDF viewer
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setPdfDataUrl(e.target.result as string)
        }
      }
      reader.onerror = () => {
        setPdfError('Failed to read the file. Please try again.')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return
    
    setIsLoading(true)
    setShowFileUpload(false)
    
    setMessages(prev => [
      ...prev, 
      { id: Date.now().toString(), role: 'user', content: `Analyzing file: ${selectedFile.name}` }
    ])

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('action', 'analyze_syllabus')
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chat`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to analyze syllabus')
      }

      const result = await response.json()
      setEditedPdfData(result)
      setShowPdfDataDialog(true)
      
      setMessages(prev => [
        ...prev, 
        { id: Date.now().toString(), role: 'assistant', content: 'Syllabus analysis complete. Please review the extracted information.' }
      ])
    } catch (error) {
      console.error('Error analyzing syllabus:', error)
      setMessages(prev => [
        ...prev, 
        { 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: 'Sorry, there was an error analyzing your syllabus file.' 
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/save_syllabus_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: editedPdfData }),
      })

      if (!response.ok) {
        throw new Error('Failed to save syllabus data')
      }

      // Refresh the student data after successful save
      await refetch()

      setMessages(prev => [
        ...prev, 
        { id: Date.now().toString(), role: 'assistant', content: 'Course information has been saved successfully!' }
      ])
    } catch (error) {
      console.error('Error saving syllabus data:', error)
      setMessages(prev => [
        ...prev, 
        { id: Date.now().toString(), role: 'assistant', content: 'Sorry, there was an error saving the course information.' }
      ])
    } finally {
      setIsLoading(false)
      setShowPdfDataDialog(false)
      setPdfDataUrl(null)
      setSelectedFile(null)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const togglePdfSidebar = () => {
    setIsPdfSidebarCollapsed(!isPdfSidebarCollapsed)
  }

  if (!mounted) {
    return (
      <div
        className={`fixed top-0 right-0 h-full bg-gray-100 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-all duration-300 z-10 ${
          isOpen ? "w-80" : "w-16"
        }`}
      />
    )
  }

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-gray-100 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-all duration-300 z-10 ${
        isOpen ? "w-80" : "w-16"
      }`}
    >
      <div className="flex flex-col h-full">
        <Button
          variant="ghost"
          size="icon"
          className="absolute -left-3 top-4 h-6 w-6 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
          onClick={onToggle}
        >
          {isOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Button>

        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-center">
          {isOpen ? (
            <h2 className="font-bold">AI Assistant</h2>
          ) : (
            <div className="rotate-90 whitespace-nowrap text-xs">AI Assistant</div>
          )}
        </div>

        {isOpen && (
          <>
            <div className="flex-1 p-4 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                  <p>Ask me anything about your studies!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-black text-white dark:bg-white dark:text-black"
                            : "bg-gray-200 text-black dark:bg-gray-800 dark:text-white"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 text-black dark:bg-gray-800 dark:text-white rounded-lg p-3">
                        <Spinner />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs" 
                  onClick={() => setShowFileUpload(true)}
                >
                  <Upload size={14} className="mr-1" />
                  Upload Syllabus PDF
                </Button>
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 bg-white dark:bg-gray-950"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" className="rounded-lg" disabled={isLoading}>
                  <Send size={18} />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>

      {showFileUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Upload Syllabus PDF</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowFileUpload(false)}>
                <X size={18} />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center">
                <input
                  type="file"
                  id="syllabus-file"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="syllabus-file"
                  className="cursor-pointer block py-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  {selectedFile ? selectedFile.name : "Click to select a PDF file"}
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowFileUpload(false)}>
                  Cancel
                </Button>
                <Button onClick={handleFileUpload} disabled={!selectedFile}>
                  Upload
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showPdfDataDialog} onOpenChange={setShowPdfDataDialog}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden p-0 gap-0">
          <DialogTitle className="sr-only">Syllabus Details</DialogTitle>
          <div className="flex flex-col h-full">
            {/* Top Bar with Title and Buttons */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={togglePdfSidebar}
                  className="h-8 w-8"
                >
                  {isPdfSidebarCollapsed ? <Maximize size={16} /> : <Minimize size={16} />}
                </Button>
                <h2 className="font-bold">Syllabus Details</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => {
                  setShowPdfDataDialog(false)
                  setPdfDataUrl(null)
                  setSelectedFile(null)
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveData} disabled={isLoading}>
                  {isLoading ? <Spinner className="mr-2" /> : null}
                  Save Course Information
                </Button>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* PDF Viewer Column - Collapsible */}
              {!isPdfSidebarCollapsed && (
                <div className="w-1/2 border-r border-gray-200 dark:border-gray-800 overflow-auto h-[85vh] flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="font-medium">Original PDF Document</h3>
                  </div>
                  
                  <div className="flex-1 overflow-auto">
                    {pdfError ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                        <h3 className="text-lg font-medium mb-2">Error Loading PDF</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{pdfError}</p>
                        <p className="mt-4 text-sm">You can still edit the extracted information.</p>
                      </div>
                    ) : pdfDataUrl ? (
                      <div className="w-full h-full">
                        <iframe 
                          src={pdfDataUrl}
                          className="w-full h-full border-0" 
                          title="PDF Viewer"
                          onError={() => setPdfError('Failed to display PDF. You can still edit the extracted data.')}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500 dark:text-gray-400">No PDF document loaded</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Data Form Column */}
              <div className={`${isPdfSidebarCollapsed ? 'w-full' : 'w-1/2'} overflow-auto h-[85vh] p-6`}>
                <div className="mb-4">
                  <h3 className="font-medium">Extracted Course Information</h3>
                </div>
                
                {editedPdfData && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="course_name">Course Name</Label>
                      <Input
                        id="course_name"
                        value={editedPdfData.course_name || ''}
                        onChange={(e) => setEditedPdfData({...editedPdfData, course_name: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="instructor_name">Instructor Name</Label>
                      <Input
                        id="instructor_name"
                        value={editedPdfData.instructor_name || ''}
                        onChange={(e) => setEditedPdfData({...editedPdfData, instructor_name: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="start_time">Start Time</Label>
                        <Input
                          id="start_time"
                          value={editedPdfData.start_time || ''}
                          onChange={(e) => setEditedPdfData({...editedPdfData, start_time: e.target.value})}
                          placeholder="HH:MM AM/PM"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="end_time">End Time</Label>
                        <Input
                          id="end_time"
                          value={editedPdfData.end_time || ''}
                          onChange={(e) => setEditedPdfData({...editedPdfData, end_time: e.target.value})}
                          placeholder="HH:MM AM/PM"
                        />
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Marks Distribution</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {editedPdfData.marks_distribution && Object.entries(editedPdfData.marks_distribution).map(([key, value]) => (
                          <div key={key} className="grid gap-2">
                            <Label htmlFor={`marks_${key}`}>{key.charAt(0).toUpperCase() + key.slice(1)}</Label>
                            <Input
                              id={`marks_${key}`}
                              type="number"
                              value={value || 0}
                              onChange={(e) => {
                                const newDistribution = {...editedPdfData.marks_distribution, [key]: parseInt(e.target.value)}
                                setEditedPdfData({...editedPdfData, marks_distribution: newDistribution})
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Schedule</h4>
                      <div className="space-y-4">
                        {editedPdfData.schedule && editedPdfData.schedule.map((item, index) => (
                          <div key={index} className="border p-3 rounded-md">
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div className="grid gap-1">
                                <Label htmlFor={`date_${index}`}>Date</Label>
                                <Input
                                  id={`date_${index}`}
                                  value={item.date || ''}
                                  onChange={(e) => {
                                    const newSchedule = [...editedPdfData.schedule]
                                    newSchedule[index] = {...newSchedule[index], date: e.target.value}
                                    setEditedPdfData({...editedPdfData, schedule: newSchedule})
                                  }}
                                />
                              </div>
                              <div className="grid gap-1">
                                <Label htmlFor={`type_${index}`}>Type</Label>
                                <Input
                                  id={`type_${index}`}
                                  value={item.type || ''}
                                  onChange={(e) => {
                                    const newSchedule = [...editedPdfData.schedule]
                                    newSchedule[index] = {...newSchedule[index], type: e.target.value}
                                    setEditedPdfData({...editedPdfData, schedule: newSchedule})
                                  }}
                                />
                              </div>
                            </div>
                            <div className="grid gap-1 mb-2">
                              <Label htmlFor={`title_${index}`}>Title</Label>
                              <Input
                                id={`title_${index}`}
                                value={item.title || ''}
                                onChange={(e) => {
                                  const newSchedule = [...editedPdfData.schedule]
                                  newSchedule[index] = {...newSchedule[index], title: e.target.value}
                                  setEditedPdfData({...editedPdfData, schedule: newSchedule})
                                }}
                              />
                            </div>
                            <div className="grid gap-1">
                              <Label htmlFor={`description_${index}`}>Description</Label>
                              <Textarea
                                id={`description_${index}`}
                                value={item.description || ''}
                                onChange={(e) => {
                                  const newSchedule = [...editedPdfData.schedule]
                                  newSchedule[index] = {...newSchedule[index], description: e.target.value}
                                  setEditedPdfData({...editedPdfData, schedule: newSchedule})
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

