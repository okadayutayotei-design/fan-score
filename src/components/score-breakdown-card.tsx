import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Coins, MapPin } from "lucide-react";

interface ScoreBreakdownCardProps {
  title: string;
  totalScore: number;
  actionScore: number;
  moneyScore: number;
  travelContribution: number;
  accentColor?: string;
}

export function ScoreBreakdownCard({
  title,
  totalScore,
  actionScore,
  moneyScore,
  travelContribution,
  accentColor,
}: ScoreBreakdownCardProps) {
  const items = [
    { label: "参加貢献", value: actionScore, color: "#3B82F6", icon: Users },
    { label: "支払い貢献", value: moneyScore, color: "#10B981", icon: Coins },
    { label: "遠征貢献", value: travelContribution, color: "#F59E0B", icon: MapPin },
  ];

  const maxValue = Math.max(actionScore, moneyScore, travelContribution, 0.1);

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className="text-3xl font-bold tracking-tight"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {totalScore.toFixed(1)}
          <span className="text-sm font-normal text-muted-foreground ml-1">
            pt
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                {item.label}
              </span>
              <span className="font-semibold">{item.value.toFixed(1)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
