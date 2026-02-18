export const AREAS = [
  "KOBE",
  "OSAKA",
  "NARA",
  "TOKYO",
  "MITO",
  "SHIKOKU",
  "OTHER",
  "ONLINE",
] as const;

export type Area = (typeof AREAS)[number];

export const AREA_LABELS: Record<Area, string> = {
  KOBE: "神戸",
  OSAKA: "大阪",
  NARA: "奈良",
  TOKYO: "東京",
  MITO: "水戸",
  SHIKOKU: "四国",
  OTHER: "その他",
  ONLINE: "オンライン",
};

export const PHYSICAL_AREAS = AREAS.filter((a) => a !== "ONLINE");

export const EVENT_TYPES = [
  "PaidLive",
  "FreeLive",
  "PaidStream",
  "YouTube",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  PaidLive: "有料ライブ",
  FreeLive: "フリーライブ",
  PaidStream: "有料配信",
  YouTube: "YouTube",
};

export const ONLINE_EVENT_TYPES: EventType[] = ["PaidStream", "YouTube"];

export function isOnlineEvent(eventType: string): boolean {
  return ONLINE_EVENT_TYPES.includes(eventType as EventType);
}
