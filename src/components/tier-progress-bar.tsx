import { PartyPopper } from "lucide-react";

interface TierProgressBarProps {
  currentScore: number;
  currentTier: {
    name: string;
    color: string;
    minScore: number;
  } | null;
  nextTier: {
    name: string;
    color: string;
    minScore: number;
  } | null;
  progress: number; // 0-100
}

export function TierProgressBar({
  currentScore,
  currentTier,
  nextTier,
  progress,
}: TierProgressBarProps) {
  const isMaxTier = !nextTier;

  return (
    <div className="space-y-3">
      {/* Labels */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentTier && (
            <span
              className="font-bold text-base"
              style={{ color: currentTier.color }}
            >
              {currentTier.name}
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            {currentScore.toFixed(1)} pt
          </span>
        </div>
        {nextTier && (
          <div className="flex items-center gap-2">
            <span
              className="font-bold text-base"
              style={{ color: nextTier.color }}
            >
              {nextTier.name}
            </span>
            <span className="text-sm text-muted-foreground">
              {nextTier.minScore} pt
            </span>
          </div>
        )}
        {isMaxTier && (
          <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
            <PartyPopper className="h-4 w-4 text-amber-500" />
            最上位ティア
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-5 rounded-full bg-muted overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out relative"
          style={{
            width: `${Math.min(progress, 100)}%`,
            background: nextTier
              ? `linear-gradient(90deg, ${currentTier?.color ?? "#9CA3AF"}, ${nextTier.color}80)`
              : currentTier?.color ?? "#9CA3AF",
          }}
        />
        {/* Percentage inside bar */}
        {progress > 15 && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-sm">
            {progress.toFixed(0)}%
          </span>
        )}
      </div>

      {/* Info text */}
      <div className="text-sm text-muted-foreground text-center">
        {isMaxTier ? (
          <span className="text-amber-600 font-medium">
            🎉 最高ティアに到達しています！
          </span>
        ) : (
          <span>
            あと <strong className="text-foreground">{(nextTier!.minScore - currentScore).toFixed(1)} pt</strong> で{" "}
            <span style={{ color: nextTier!.color, fontWeight: 600 }}>{nextTier!.name}</span>{" "}
            に昇格
          </span>
        )}
      </div>
    </div>
  );
}
