"use client"
import { Button } from "@/components/ui/button"
import { Calendar, Target, Plus, Upload, BarChart3, Mail, Brain, ChevronLeft, ChevronRight, CheckSquare } from "lucide-react"
import { useState } from "react"

const priorities = [
  { id: "critical", label: "Critical", color: "bg-red-500", count: 3 },
  { id: "high", label: "High", color: "bg-orange-500", count: 7 },
  { id: "medium", label: "Medium", color: "bg-yellow-500", count: 12 },
  { id: "low", label: "Low", color: "bg-green-500", count: 8 },
]

const goals = [
  { id: "work", label: "Work Projects", color: "bg-blue-500", progress: 65 },
  { id: "personal", label: "Personal Growth", color: "bg-green-500", progress: 40 },
  { id: "health", label: "Health & Fitness", color: "bg-orange-500", progress: 80 },
  { id: "learning", label: "Learning", color: "bg-purple-500", progress: 55 },
]

interface SidebarProps {
  activeView: string
  onViewChange: (view: string) => void
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [miniCalDate, setMiniCalDate] = useState(new Date())

  const generateMiniCalendar = () => {
    const year = miniCalDate.getFullYear()
    const month = miniCalDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()

    const days = []
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return { days, today, month, year }
  }

  const { days, today, month, year } = generateMiniCalendar()
  const monthName = new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" })

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <Button className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm justify-start">
          <Plus className="h-5 w-5 mr-3 text-blue-600" />
          Create
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{monthName}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  const newDate = new Date(miniCalDate)
                  newDate.setMonth(newDate.getMonth() - 1)
                  setMiniCalDate(newDate)
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  const newDate = new Date(miniCalDate)
                  newDate.setMonth(newDate.getMonth() + 1)
                  setMiniCalDate(newDate)
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <div key={i} className="text-xs text-gray-500 font-medium py-1">
                {day}
              </div>
            ))}
            {days.map((day, i) => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              return (
                <div
                  key={i}
                  className={`text-xs py-1 rounded-full cursor-pointer ${
                    day ? (isToday ? "bg-blue-600 text-white font-medium" : "text-gray-700 hover:bg-gray-100") : ""
                  }`}
                >
                  {day || ""}
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-1">
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm font-normal ${
              activeView === "calendar" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => onViewChange("calendar")}
          >
            <Calendar className="h-4 w-4 mr-3" />
            Calendar
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm font-normal ${
              activeView === "tasks" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => onViewChange("tasks")}
          >
            <CheckSquare className="h-4 w-4 mr-3" />
            Tasks
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm font-normal ${
              activeView === "goals" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => onViewChange("goals")}
          >
            <Target className="h-4 w-4 mr-3" />
            Goals
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm font-normal ${
              activeView === "priorities" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => onViewChange("priorities")}
          >
            <BarChart3 className="h-4 w-4 mr-3" />
            Priorities
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm font-normal ${
              activeView === "focus" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => onViewChange("focus")}
          >
            <Brain className="h-4 w-4 mr-3" />
            Focus Mode
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm font-normal ${
              activeView === "google" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => onViewChange("google")}
          >
            <Mail className="h-4 w-4 mr-3" />
            Integrations
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm font-normal ${
              activeView === "upload" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => onViewChange("upload")}
          >
            <Upload className="h-4 w-4 mr-3" />
            Upload
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">My Calendars</h3>
          <div className="space-y-1">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${goal.color}`} />
                  <span className="text-sm text-gray-700">{goal.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
