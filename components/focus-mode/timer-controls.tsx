"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Play, Pause, Square } from "lucide-react"
import { Progress } from "@/components/ui/progress"

type TimerControlsProps = {
  isRunning: boolean;
  onStart: (duration: number) => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  elapsedSeconds: number;
  totalSeconds: number;
};

export function TimerControls({
  isRunning,
  onStart,
  onPause,
  onResume,
  onEnd,
  elapsedSeconds,
  totalSeconds,
}: TimerControlsProps) {
  const [customMinutes, setCustomMinutes] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const presets = [25, 50, 90];

  const hasStarted = totalSeconds > 0;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const progress = totalSeconds > 0 ? (elapsedSeconds / totalSeconds) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePresetClick = (minutes: number) => {
    if (!hasStarted) {
      setSelectedPreset(minutes);
      onStart(minutes * 60);
    }
  };

  const handleCustomStart = () => {
    const minutes = parseInt(customMinutes, 10);
    if (minutes > 0 && minutes <= 999) {
      setSelectedPreset(null);
      onStart(minutes * 60);
      setCustomMinutes("");
    }
  };

  return (
    <div className="space-y-6">
      {!hasStarted && (
        <div className="space-y-4">
          <div className="flex gap-3">
            {presets.map((minutes) => (
              <Button
                key={minutes}
                variant={selectedPreset === minutes ? "default" : "outline"}
                size="lg"
                onClick={() => handlePresetClick(minutes)}
                className="flex-1 text-lg font-semibold"
              >
                {minutes}m
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Custom minutes"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              min="1"
              max="999"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCustomStart();
                }
              }}
            />
            <Button
              onClick={handleCustomStart}
              disabled={!customMinutes || parseInt(customMinutes) <= 0}
              size="lg"
            >
              Start
            </Button>
          </div>
        </div>
      )}

      {hasStarted && (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 tabular-nums">
                  {formatTime(remainingSeconds)}
                </div>
                <div className="text-sm text-gray-500 mt-1">remaining</div>
              </div>
            </div>
          </div>

          <Progress value={progress} className="h-2" />

          <div className="flex gap-3 justify-center">
            {isRunning ? (
              <Button
                variant="outline"
                size="lg"
                onClick={onPause}
                className="flex items-center gap-2"
              >
                <Pause className="h-5 w-5" />
                Pause
              </Button>
            ) : (
              <Button
                variant="default"
                size="lg"
                onClick={onResume}
                className="flex items-center gap-2"
              >
                <Play className="h-5 w-5" />
                Resume
              </Button>
            )}
            <Button
              variant="destructive"
              size="lg"
              onClick={onEnd}
              className="flex items-center gap-2"
            >
              <Square className="h-5 w-5" />
              End Session
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
