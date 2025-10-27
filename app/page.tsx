"use client"

import { useState } from "react"
import { CalendarView } from "@/components/calendar-view"
import { GoalManager } from "@/components/goal-manager"
import { PriorityDashboard } from "@/components/priority-dashboard"
import { GoogleIntegrations } from "@/components/google-integrations"
import { DocumentUpload } from "@/components/document-upload"
import { TasksView } from "@/components/tasks-view"
import { Sidebar } from "@/components/sidebar"

export default function HomePage() {
  const [activeView, setActiveView] = useState("tasks")

  const renderView = () => {
    switch (activeView) {
      case "tasks":
        return <TasksView />
      case "goals":
        return <GoalManager />
      case "priorities":
        return <PriorityDashboard />
      case "google":
        return <GoogleIntegrations />
      case "upload":
        return <DocumentUpload />
      case "calendar":
        return <CalendarView />
      default:
        return <TasksView />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-hidden">{renderView()}</main>
    </div>
  )
}
