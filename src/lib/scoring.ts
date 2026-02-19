export interface PointsBase {
  paidLiveBase: number;
  freeLiveBase: number;
  paidStreamBase: number;
  youtubeViewBase: number;
}

export interface MoneyCoeff {
  merchCoeff: number;
  superchatCoeff: number;
}

export interface DiminishingReturns {
  enabled: boolean;
  rate: number;
  applyTo: string[];
}

export interface ScoringSettings {
  pointsBase: PointsBase;
  moneyCoeff: MoneyCoeff;
  moneyMode: "linear" | "sqrt" | "log";
  diminishingReturns: DiminishingReturns;
}

export interface AreaMultiplierMap {
  [key: string]: number; // "FROM->TO" => multiplier
}

export interface EventLogEntry {
  id: string;
  date: Date;
  fanId: string;
  eventType: string;
  venueArea: string;
  attendCount: number;
  merchAmountJPY: number;
  superchatAmountJPY: number;
}

export interface FanScoreResult {
  fanId: string;
  displayName: string;
  residenceArea: string;
  totalScore: number;
  actionScore: number;
  moneyScore: number;
  travelContribution: number;
  details: EventScoreDetail[];
}

export interface EventScoreDetail {
  logId: string;
  eventType: string;
  actionPoint: number;
  merchPoint: number;
  superchatPoint: number;
  distanceMultiplier: number;
  diminishMultiplier: number;
}

function getBasePoint(eventType: string, pointsBase: PointsBase): number {
  switch (eventType) {
    case "PaidLive":
      return pointsBase.paidLiveBase;
    case "FreeLive":
      return pointsBase.freeLiveBase;
    case "PaidStream":
      return pointsBase.paidStreamBase;
    case "YouTube":
      return pointsBase.youtubeViewBase;
    default:
      return 0;
  }
}

export function getDistanceMultiplier(
  fromArea: string,
  toArea: string,
  multipliers: AreaMultiplierMap
): number {
  if (toArea === "ONLINE") return 1.0;
  const key = `${fromArea}->${toArea}`;
  return multipliers[key] ?? 1.0;
}

function applyMoneyTransform(amount: number, mode: string): number {
  if (amount <= 0) return 0;
  switch (mode) {
    case "sqrt":
      return Math.sqrt(amount);
    case "log":
      return Math.log(amount + 1);
    case "linear":
    default:
      return amount;
  }
}

export function calculateMonthlyScores(
  logs: EventLogEntry[],
  fans: { id: string; displayName: string; residenceArea: string }[],
  settings: ScoringSettings,
  multipliers: AreaMultiplierMap
): FanScoreResult[] {
  const fanMap = new Map(fans.map((f) => [f.id, f]));

  // Group logs by fanId
  const logsByFan = new Map<string, EventLogEntry[]>();
  for (const log of logs) {
    const existing = logsByFan.get(log.fanId) ?? [];
    existing.push(log);
    logsByFan.set(log.fanId, existing);
  }

  const results: FanScoreResult[] = [];

  for (const [fanId, fanLogs] of logsByFan) {
    const fan = fanMap.get(fanId);
    if (!fan) continue;

    // Sort by date for diminishing returns calculation
    const sortedLogs = [...fanLogs].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // Count occurrences per eventType for diminishing returns
    const eventTypeCounts = new Map<string, number>();

    let totalActionScore = 0;
    let totalMoneyScore = 0;
    let totalTravelContribution = 0;
    const details: EventScoreDetail[] = [];

    for (const log of sortedLogs) {
      const base = getBasePoint(log.eventType, settings.pointsBase);
      const distMult = getDistanceMultiplier(
        fan.residenceArea,
        log.venueArea,
        multipliers
      );

      // Diminishing returns
      let dimMult = 1.0;
      if (
        settings.diminishingReturns.enabled &&
        settings.diminishingReturns.applyTo.includes(log.eventType)
      ) {
        const count = (eventTypeCounts.get(log.eventType) ?? 0) + 1;
        eventTypeCounts.set(log.eventType, count);
        dimMult = Math.pow(settings.diminishingReturns.rate, count - 1);
      } else {
        const count = (eventTypeCounts.get(log.eventType) ?? 0) + 1;
        eventTypeCounts.set(log.eventType, count);
      }

      // Action score
      const actionPoint = log.attendCount * base * distMult * dimMult;

      // Merch score (with distance multiplier for physical venue)
      const merchTransformed = applyMoneyTransform(
        log.merchAmountJPY,
        settings.moneyMode
      );
      const merchPoint =
        merchTransformed * settings.moneyCoeff.merchCoeff * distMult;

      // Superchat score (no distance multiplier)
      const superchatTransformed = applyMoneyTransform(
        log.superchatAmountJPY,
        settings.moneyMode
      );
      const superchatPoint =
        superchatTransformed * settings.moneyCoeff.superchatCoeff;

      // Travel contribution (how much distance multiplier added)
      const baseActionWithoutDist = log.attendCount * base * dimMult;
      const baseMoneyWithoutDist =
        merchTransformed * settings.moneyCoeff.merchCoeff;
      const withDist = actionPoint + merchPoint;
      const withoutDist = baseActionWithoutDist + baseMoneyWithoutDist;
      const travelContrib = withDist - withoutDist;

      totalActionScore += actionPoint;
      totalMoneyScore += merchPoint + superchatPoint;
      totalTravelContribution += travelContrib;

      details.push({
        logId: log.id,
        eventType: log.eventType,
        actionPoint,
        merchPoint,
        superchatPoint,
        distanceMultiplier: distMult,
        diminishMultiplier: dimMult,
      });
    }

    results.push({
      fanId,
      displayName: fan.displayName,
      residenceArea: fan.residenceArea,
      totalScore: totalActionScore + totalMoneyScore,
      actionScore: totalActionScore,
      moneyScore: totalMoneyScore,
      travelContribution: totalTravelContribution,
      details,
    });
  }

  // Sort by total score descending
  results.sort((a, b) => b.totalScore - a.totalScore);

  return results;
}

/**
 * Calculate cumulative (all-time) scores.
 * Reuses calculateMonthlyScores since it processes whatever logs are passed in.
 */
export function calculateCumulativeScores(
  logs: EventLogEntry[],
  fans: { id: string; displayName: string; residenceArea: string }[],
  settings: ScoringSettings,
  multipliers: AreaMultiplierMap
): FanScoreResult[] {
  return calculateMonthlyScores(logs, fans, settings, multipliers);
}

export function assignRanks(results: FanScoreResult[]): (FanScoreResult & { rank: number })[] {
  let currentRank = 1;
  return results.map((result, index) => {
    if (index > 0 && result.totalScore < results[index - 1].totalScore) {
      currentRank = index + 1;
    }
    return { ...result, rank: currentRank };
  });
}
