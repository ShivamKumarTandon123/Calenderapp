"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Mail, Video, Calendar, CheckCircle2, AlertCircle, Settings, Plus, ExternalLink } from "lucide-react"

interface EmailEvent {
  id: string
  subject: string
  sender: string
  date: string
  extractedEvents: {
    title: string
    date: string
    time: string
    location?: string
    description: string
    confidence: number
  }[]
  processed: boolean
}

interface GoogleIntegration {
  service: "gmail" | "meet" | "calendar"
  connected: boolean
  lastSync: string
  permissions: string[]
}

const sampleEmailEvents: EmailEvent[] = [
  {
    id: "1",
    subject: "Project Kickoff Meeting - Next Tuesday",
    sender: "sarah@company.com",
    date: "2024-09-25",
    processed: false,
    extractedEvents: [
      {
        title: "Project Kickoff Meeting",
        date: "2024-10-01",
        time: "10:00",
        location: "Conference Room A",
        description: "Discuss project timeline and deliverables",
        confidence: 95,
      },
    ],
  },
  {
    id: "2",
    subject: "Dentist Appointment Confirmation",
    sender: "appointments@dentalcare.com",
    date: "2024-09-24",
    processed: false,
    extractedEvents: [
      {
        title: "Dentist Appointment",
        date: "2024-09-30",
        time: "14:30",
        location: "Downtown Dental Care",
        description: "Regular checkup and cleaning",
        confidence: 98,
      },
    ],
  },
  {
    id: "3",
    subject: "Flight Confirmation - SFO to NYC",
    sender: "noreply@airline.com",
    date: "2024-09-23",
    processed: true,
    extractedEvents: [
      {
        title: "Flight to NYC",
        date: "2024-10-15",
        time: "08:00",
        location: "San Francisco Airport (SFO)",
        description: "Flight AA123 - Departure 8:00 AM",
        confidence: 99,
      },
    ],
  },
]

const integrations: GoogleIntegration[] = [
  {
    service: "gmail",
    connected: true,
    lastSync: "2024-09-25T10:30:00Z",
    permissions: ["read", "modify"],
  },
  {
    service: "meet",
    connected: true,
    lastSync: "2024-09-25T10:30:00Z",
    permissions: ["create", "manage"],
  },
  {
    service: "calendar",
    connected: true,
    lastSync: "2024-09-25T10:30:00Z",
    permissions: ["read", "write"],
  },
]

export function GoogleIntegrations() {
  const [emailEvents, setEmailEvents] = useState<EmailEvent[]>(sampleEmailEvents)
  const [autoProcessEmails, setAutoProcessEmails] = useState(true)
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  const handleImportEvents = (emailId: string) => {
    setEmailEvents(emailEvents.map((email) => (email.id === emailId ? { ...email, processed: true } : email)))
    // In a real app, this would sync with Google Calendar
    console.log("Importing events to calendar...")
  }

  const handleCreateMeeting = () => {
    // In a real app, this would create a Google Meet link
    console.log("Creating Google Meet...")
  }

  const getServiceIcon = (service: string) => {
    switch (service) {
      case "gmail":
        return (
          <svg className="h-5 w-5" viewBox="0 0 256 193" fill="none">
            <path d="M58.182 192.05V93.493L27.507 65.507L0 49.507v125.091c0 9.658 7.825 17.482 17.455 17.482h40.727z" fill="#4285F4"/>
            <path d="M197.818 192.05h40.727c9.658 0 17.455-7.854 17.455-17.482V49.507l-27.507 16-30.675 27.986v98.557z" fill="#34A853"/>
            <path d="M197.818 17.504v75.989L256 49.507V26.001c0-21.116-24.085-33.053-40.942-20.298l-17.24 11.801z" fill="#FBBC04"/>
            <path d="M0 49.507l58.182 43.986V17.504L40.942 5.703C24.085-7.052 0 4.885 0 26.001v23.506z" fill="#EA4335"/>
            <path d="M58.182 93.493l69.818 50.909 69.818-50.909V17.504L128 68.413 58.182 17.504v75.989z" fill="#C5221F"/>
          </svg>
        )
      case "meet":
        return <Video className="h-5 w-5 text-[#00897B]" />
      case "calendar":
        return <Calendar className="h-5 w-5 text-[#1A73E8]" />
      default:
        return <Settings className="h-5 w-5" />
    }
  }

  const formatLastSync = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Google Integrations</h1>
          <p className="text-muted-foreground">Connect and sync with your Google services</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {/* Integration Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.service} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getServiceIcon(integration.service)}
                <div>
                  <h3 className="font-medium capitalize">{integration.service}</h3>
                  <p className="text-xs text-muted-foreground">
                    {integration.connected ? "Connected" : "Disconnected"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {integration.connected ? (
                  <CheckCircle2 className="h-4 w-4 text-[color:var(--priority-low)]" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-[color:var(--priority-high)]" />
                )}
              </div>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
              <div>Last sync: {formatLastSync(integration.lastSync)}</div>
              <div className="flex flex-wrap gap-1">
                {integration.permissions.map((permission) => (
                  <Badge key={permission} variant="secondary" className="text-xs">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="mt-3 flex space-x-2">
              <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                {integration.connected ? "Reconnect" : "Connect"}
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Email Event Detection */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Email Event Detection</h2>
            <p className="text-sm text-muted-foreground">Automatically detect and import events from your Gmail</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Auto-process</span>
            <Switch checked={autoProcessEmails} onCheckedChange={setAutoProcessEmails} />
          </div>
        </div>

        <div className="space-y-4">
          {emailEvents.map((email) => (
            <Card key={email.id} className={`p-4 ${email.processed ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1">
                  <h3 className="font-medium">{email.subject}</h3>
                  <p className="text-sm text-muted-foreground">
                    From: {email.sender} • {new Date(email.date).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={email.processed ? "secondary" : "default"}>
                  {email.processed ? "Processed" : "New"}
                </Badge>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Detected Events:</h4>
                {email.extractedEvents.map((event, index) => (
                  <div key={index} className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h5 className="font-medium">{event.title}</h5>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center space-x-4">
                            <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                            <span>🕐 {event.time}</span>
                            {event.location && <span>📍 {event.location}</span>}
                          </div>
                          <p>{event.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            event.confidence >= 90
                              ? "border-[color:var(--priority-low)] text-[color:var(--priority-low)]"
                              : event.confidence >= 70
                                ? "border-[color:var(--priority-medium)] text-[color:var(--priority-medium)]"
                                : "border-[color:var(--priority-high)] text-[color:var(--priority-high)]"
                          }`}
                        >
                          {event.confidence}% confident
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}

                {!email.processed && (
                  <div className="flex space-x-2 pt-2">
                    <Button size="sm" onClick={() => handleImportEvents(email.id)}>
                      Import to Calendar
                    </Button>
                    <Button variant="outline" size="sm">
                      Edit Events
                    </Button>
                    <Button variant="outline" size="sm">
                      Ignore
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5 text-[#00897B]" />
              <h3 className="font-medium">Google Meet Integration</h3>
            </div>
            <p className="text-sm text-muted-foreground">Automatically add Google Meet links to your calendar events</p>
            <div className="space-y-2">
              <Button className="w-full" onClick={handleCreateMeeting}>
                <Video className="h-4 w-4 mr-2" />
                Create Instant Meeting
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                <Settings className="h-4 w-4 mr-2" />
                Meeting Settings
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-[#1A73E8]" />
              <h3 className="font-medium">Calendar Sync</h3>
            </div>
            <p className="text-sm text-muted-foreground">Two-way sync with your Google Calendar</p>
            <div className="space-y-2">
              <Button variant="outline" className="w-full bg-transparent">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Google Calendar
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                <Settings className="h-4 w-4 mr-2" />
                Sync Settings
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Sync Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-medium">Sync Status</h3>
            <p className="text-sm text-muted-foreground">
              Last successful sync: {formatLastSync("2024-09-25T10:30:00Z")}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              Sync Now
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
