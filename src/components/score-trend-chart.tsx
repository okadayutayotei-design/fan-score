interface ScoreTrendChartProps {
  data: {
    month: string;
    totalScore: number;
  }[];
  accentColor?: string;
}

export function ScoreTrendChart({
  data,
  accentColor = "#3B82F6",
}: ScoreTrendChartProps) {
  // Show last 6 months for wider bars
  const displayData = data.slice(-6);
  const maxScore = Math.max(...displayData.map((d) => d.totalScore), 0.1);

  // Format month label: "2026-02" -> "2月"
  const formatMonth = (month: string) => {
    const parts = month.split("-");
    return `${parseInt(parts[1])}月`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 h-40">
        {displayData.map((d, i) => {
          const height = maxScore > 0 ? (d.totalScore / maxScore) * 100 : 0;
          const isLast = i === displayData.length - 1;
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
              {/* Value label */}
              <span className="text-xs font-medium text-muted-foreground leading-none">
                {d.totalScore > 0 ? d.totalScore.toFixed(0) : ""}
              </span>
              {/* Bar */}
              <div className="w-full flex items-end" style={{ height: "120px" }}>
                <div
                  className="w-full rounded-t-lg transition-all duration-500 ease-out"
                  style={{
                    height: `${Math.max(height, d.totalScore > 0 ? 6 : 0)}%`,
                    backgroundColor: isLast ? accentColor : `${accentColor}50`,
                    minHeight: d.totalScore > 0 ? "6px" : "0px",
                    boxShadow: isLast ? `0 -2px 8px ${accentColor}30` : "none",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* Month labels */}
      <div className="flex gap-2">
        {displayData.map((d, i) => {
          const isLast = i === displayData.length - 1;
          return (
            <div
              key={d.month}
              className={`flex-1 text-center text-xs ${
                isLast ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {formatMonth(d.month)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
