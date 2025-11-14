"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Play, Pause, Square } from "lucide-react"

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
    <div>
      {!hasStarted ? (
        <div className="space-y-5">
          <div className="flex items-center justify-center gap-3">
            {presets.map((minutes) => (
              <button
                key={minutes}
                onClick={() => handlePresetClick(minutes)}
                className="group relative px-8 py-4 bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-2xl transition-all duration-200 hover:shadow-md active:scale-95"
              >
                <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {minutes}
                </div>
                <div className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors mt-1">
                  minutes
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 max-w-md mx-auto">
            <div className="relative flex-1">
              <Input
                type="number"
                placeholder="Custom"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                min="1"
                max="999"
                className="h-12 text-center text-lg border-2 border-gray-200 focus:border-blue-400 rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCustomStart();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleCustomStart}
              disabled={!customMinutes || parseInt(customMinutes) <= 0}
              className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-900 tabular-nums tracking-tight">
                  {formatTime(remainingSeconds)}
                </div>
                <div className="text-sm font-medium text-gray-500 mt-2">remaining</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-center">
            {isRunning ? (
              <Button
                variant="outline"
                size="lg"
                onClick={onPause}
                className="flex items-center gap-2 h-12 px-6 border-2 border-gray-300 hover:border-gray-400 rounded-xl font-semibold"
              >
                <Pause className="h-5 w-5" />
                Pause
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={onResume}
                className="flex items-center gap-2 h-12 px-6 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold shadow-lg hover:shadow-xl"
              >
                <Play className="h-5 w-5" />
                Resume
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              onClick={onEnd}
              className="flex items-center gap-2 h-12 px-6 border-2 border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl font-semibold"
            >
              <Square className="h-4 w-4" />
              End
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
