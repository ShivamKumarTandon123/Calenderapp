"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Clock, CheckCircle2, TrendingUp, Filter, Calendar } from "lucide-react"

interface PriorityTask {
  id: string
  title: string
  description: string
  priority: "critical" | "high" | "medium" | "low"
  goal: string
  dueDate: string
  estimatedHours: number
  completed: boolean
  progress: number
}

const sampleTasks: PriorityTask[] = [
  {
    id: "1",
    title: "Complete API Integration",
    description: "Integrate third-party payment API for checkout process",
    priority: "critical",
    goal: "Launch Product MVP",
    dueDate: "2024-09-28",
    estimatedHours: 8,
    completed: false,
    progress: 60,
  },
  {
    id: "2",
    title: "User Testing Session",
    description: "Conduct usability testing with 10 target users",
    priority: "high",
    goal: "Launch Product MVP",
    dueDate: "2024-09-30",
    estimatedHours: 4,
    completed: false,
    progress: 20,
  },
  {
    id: "3",
    title: "Marathon Long Run",
    description: "Complete 20-mile training run at target pace",
    priority: "high",
    goal: "Complete Marathon Training",
    dueDate: "2024-09-29",
    estimatedHours: 3,
    completed: true,
    progress: 100,
  },
  {
    id: "4",
    title: "React Performance Study",
    description: "Research and document React optimization techniques",
    priority: "medium",
    goal: "Learn Advanced React Patterns",
    dueDate: "2024-10-05",
    estimatedHours: 6,
    completed: false,
    progress: 30,
  },
  {
    id: "5",
    title: "Team Standup Meeting",
    description: "Daily team synchronization and progress updates",
    priority: "low",
    goal: "Launch Product MVP",
    dueDate: "2024-09-26",
    estimatedHours: 0.5,
    completed: false,
    progress: 0,
  },
]

const priorityColors = {
  critical: "bg-[color:var(--priority-critical)]",
  high: "bg-[color:var(--priority-high)]",
  medium: "bg-[color:var(--priority-medium)]",
  low: "bg-[color:var(--priority-low)]",
}

const priorityIcons = {
  critical: AlertTriangle,
  high: TrendingUp,
  medium: Clock,
  low: CheckCircle2,
}

export function PriorityDashboard() {
  const [tasks, setTasks] = useState<PriorityTask[]>(sampleTasks)
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all")

  const filteredTasks = filter === "all" ? tasks : tasks.filter((task) => task.priority === filter)
  const sortedTasks = filteredTasks.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })

  const getTaskStats = () => {
    const total = tasks.length
    const completed = tasks.filter((task) => task.completed).length
    const overdue = tasks.filter((task) => new Date(task.dueDate) < new Date() && !task.completed).length
    const critical = tasks.filter((task) => task.priority === "critical" && !task.completed).length

    return { total, completed, overdue, critical }
  }

  const stats = getTaskStats()

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Priority Dashboard</h1>
          <p className="text-muted-foreground">Focus on what matters most</p>
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-background border border-border rounded-md px-3 py-1 text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[color:var(--priority-critical)]/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-[color:var(--priority-critical)]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold">{stats.critical}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <Clock className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold">{stats.overdue}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-muted rounded-lg">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Priority Tasks */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Priority Tasks</h2>
        <div className="space-y-3">
          {sortedTasks.map((task) => {
            const daysLeft = getDaysUntilDue(task.dueDate)
            const PriorityIcon = priorityIcons[task.priority]
            const isOverdue = daysLeft < 0 && !task.completed

            return (
              <Card
                key={task.id}
                className={`p-4 ${task.completed ? "opacity-60" : ""} ${isOverdue ? "border-destructive" : ""}`}
              >
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    className="mt-1 rounded border-border"
                    onChange={() => {
                      setTasks(
                        tasks.map((t) =>
                          t.id === task.id ? { ...t, completed: !t.completed, progress: !t.completed ? 100 : 0 } : t,
                        ),
                      )
                    }}
                  />

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3
                          className={`font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                        >
                          {task.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                        <p className="text-xs text-muted-foreground">Goal: {task.goal}</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge className={`${priorityColors[task.priority]} text-white`}>
                          <PriorityIcon className="h-3 w-3 mr-1" />
                          {task.priority}
                        </Badge>
                      </div>
                    </div>

                    {!task.completed && task.progress > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-1.5" />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {isOverdue
                              ? `${Math.abs(daysLeft)} days overdue`
                              : daysLeft === 0
                                ? "Due today"
                                : daysLeft === 1
                                  ? "Due tomorrow"
                                  : `${daysLeft} days left`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{task.estimatedHours}h estimated</span>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
