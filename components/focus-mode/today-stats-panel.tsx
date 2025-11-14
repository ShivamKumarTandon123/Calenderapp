"use client"

import { Card } from "@/components/ui/card"
import { Calendar, CheckSquare, Star, Clock, Target, TrendingUp } from "lucide-react"
import { SessionData, formatDuration } from "@/lib/focus-mode-utils"
import { format } from "date-fns"

type TodayStatsPanelProps = {
  recentSessions: SessionData[];
  dailyGoalMinutes?: number;
};

export function TodayStatsPanel({
  recentSessions,
  dailyGoalMinutes = 180,
}: TodayStatsPanelProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySessions = recentSessions.filter((session) => {
    const sessionDate = new Date(session.endedAt);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate.getTime() === today.getTime();
  });

  const totalMinutes = todaySessions.reduce(
    (sum, session) => sum + Math.floor(session.actualDuration / 60),
    0
  );

  const progress = Math.min((totalMinutes / dailyGoalMinutes) * 100, 100);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-xl">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Today's Focus</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <div className="text-4xl font-bold tracking-tight">
              {formatDuration(totalMinutes)}
            </div>
            <div className="text-blue-100 text-sm font-medium">
              / {formatDuration(dailyGoalMinutes)}
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2 bg-blue-400/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-blue-100 font-medium">
              {Math.round(progress)}% of daily goal
            </p>
          </div>
        </div>

        <div className="p-6 bg-white">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center p-4 bg-blue-50 rounded-xl">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {todaySessions.length}
              </div>
              <div className="text-xs font-medium text-gray-600">Sessions</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-green-50 rounded-xl">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {todaySessions.length > 0
                  ? (
                      todaySessions.reduce(
                        (sum, s) => sum + (s.focusRating || 0),
                        0
                      ) / todaySessions.length
                    ).toFixed(1)
                  : "—"}
              </div>
              <div className="text-xs font-medium text-gray-600">Avg Focus</div>
            </div>
          </div>
        </div>
      </Card>

      {todaySessions.length > 0 && (
        <Card className="p-6 border-0 shadow-xl">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-4 w-4 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-800">
              Recent Sessions
            </h3>
          </div>
          <div className="space-y-3">
            {todaySessions
              .slice()
              .reverse()
              .slice(0, 5)
              .map((session, index) => {
                const SourceIcon =
                  session.itemType === "event" ? Calendar : CheckSquare;
                return (
                  <div
                    key={index}
                    className="p-4 bg-gradient-to-br from-gray-50 to-gray-50/50 rounded-xl hover:from-gray-100 hover:to-gray-100/50 transition-all border border-gray-100"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-white rounded-md shadow-sm">
                            <SourceIcon className="h-3 w-3 text-gray-600" />
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {session.itemTitle}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                            <Clock className="h-3 w-3" />
                            {formatDuration(
                              Math.floor(session.actualDuration / 60)
                            )}
                          </span>
                          {session.focusRating && (
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold text-gray-700">
                                {session.focusRating}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2 font-medium">
                        {format(session.endedAt, "h:mm a")}
                      </span>
                    </div>
                    {session.notes && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mt-2 pt-2 border-t border-gray-200">
                        {session.notes}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>
      )}
    </div>
  );
}
