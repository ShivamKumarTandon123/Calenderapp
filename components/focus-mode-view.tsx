"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { SessionHeader } from "@/components/focus-mode/session-header"
import { TimerControls } from "@/components/focus-mode/timer-controls"
import { MicroChecklist } from "@/components/focus-mode/micro-checklist"
import { DistractionCapture } from "@/components/focus-mode/distraction-capture"
import { SessionSummaryModal } from "@/components/focus-mode/session-summary-modal"
import { TodayStatsPanel } from "@/components/focus-mode/today-stats-panel"
import { ItemPicker } from "@/components/focus-mode/item-picker"
import {
  mockFocusItems,
  getRecommendedItem,
  generateDefaultChecklist,
  calculateChecklistCompletion,
  type FocusItem,
  type ChecklistItem,
  type SessionData,
} from "@/lib/focus-mode-utils"

export function FocusModeView() {
  const [currentItem, setCurrentItem] = useState<FocusItem | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [distractionNotes, setDistractionNotes] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [recentSessions, setRecentSessions] = useState<SessionData[]>([]);
  const [showItemPicker, setShowItemPicker] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const recommended = getRecommendedItem(mockFocusItems);
    if (recommended) {
      setCurrentItem(recommended);
      setChecklist(generateDefaultChecklist(recommended.title));
    }
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const newElapsed = prev + 1;
          if (newElapsed >= totalSeconds && totalSeconds > 0) {
            handleTimerComplete();
            return totalSeconds;
          }
          return newElapsed;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, totalSeconds]);

  const handleStart = (durationSeconds: number) => {
    setTotalSeconds(durationSeconds);
    setElapsedSeconds(0);
    setIsRunning(true);
    startTimeRef.current = Date.now();
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleResume = () => {
    setIsRunning(true);
  };

  const handleEnd = () => {
    setIsRunning(false);
    setShowSummary(true);
  };

  const handleTimerComplete = () => {
    setIsRunning(false);
    setShowSummary(true);
  };

  const handleSummaryConfirm = (rating: number, notes: string) => {
    if (!currentItem) return;

    const sessionData: SessionData = {
      itemId: currentItem.id,
      itemTitle: currentItem.title,
      itemType: currentItem.type,
      plannedDuration: totalSeconds,
      actualDuration: elapsedSeconds,
      checklistCompletion: calculateChecklistCompletion(checklist),
      focusRating: rating,
      notes,
      endedAt: new Date(),
    };

    setRecentSessions((prev) => [...prev, sessionData]);

    if (distractionNotes.trim()) {
      const lines = distractionNotes
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      console.log("Distraction notes to convert to tasks:", lines);
    }

    setTotalSeconds(0);
    setElapsedSeconds(0);
    setChecklist(generateDefaultChecklist(currentItem.title));
    setDistractionNotes("");
    setShowSummary(false);
  };

  const handleChangeItem = (item: FocusItem) => {
    setCurrentItem(item);
    setChecklist(generateDefaultChecklist(item.title));
    setTotalSeconds(0);
    setElapsedSeconds(0);
    setIsRunning(false);
    setDistractionNotes("");
  };

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No focus items available</p>
      </div>
    );
  }

  const hasStarted = totalSeconds > 0;

  return (
    <div className="relative h-full bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30 overflow-auto">
      {isRunning && hasStarted && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-20 pointer-events-none" />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            <Card className={`relative overflow-hidden transition-all duration-300 border-0 ${isRunning && hasStarted ? 'shadow-2xl ring-2 ring-blue-500/20 z-30' : 'shadow-xl'}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-blue-50/20" />
              <div className="relative p-8 lg:p-10">
                <SessionHeader
                  item={currentItem}
                  onChangeItem={() => setShowItemPicker(true)}
                />

                <div className="mt-8">
                  <TimerControls
                    isRunning={isRunning}
                    onStart={handleStart}
                    onPause={handlePause}
                    onResume={handleResume}
                    onEnd={handleEnd}
                    elapsedSeconds={elapsedSeconds}
                    totalSeconds={totalSeconds}
                  />
                </div>

                {hasStarted && (
                  <>
                    <div className="mt-8 pt-8 border-t border-gray-200/60">
                      <MicroChecklist items={checklist} onChange={setChecklist} />
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-200/60">
                      <DistractionCapture
                        notes={distractionNotes}
                        onChange={setDistractionNotes}
                      />
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <div className={`sticky top-8 transition-all duration-300 ${isRunning && hasStarted ? 'z-30' : ''}`}>
              <TodayStatsPanel recentSessions={recentSessions} />
            </div>
          </div>
        </div>
      </div>

      <SessionSummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        onConfirm={handleSummaryConfirm}
        itemTitle={currentItem.title}
        itemType={currentItem.type}
        plannedDuration={totalSeconds}
        actualDuration={elapsedSeconds}
        checklistCompletion={calculateChecklistCompletion(checklist)}
      />

      <ItemPicker
        isOpen={showItemPicker}
        onClose={() => setShowItemPicker(false)}
        items={mockFocusItems}
        currentItemId={currentItem.id}
        onSelectItem={handleChangeItem}
      />
    </div>
  );
}
