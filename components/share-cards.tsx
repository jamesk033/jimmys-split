"use client";
import { drawMonthCard, drawWeekCard, drawWorkoutCard, type MonthCardData, type WeekCardData, type WorkoutCardData } from "@/lib/share-cards";
import { ShareActions } from "./share-actions";

type Discord = { title: string; session?: string } | null;

export function WorkoutShare({ data, filename, discord }: { data: WorkoutCardData; filename: string; discord: Discord }) {
  return <ShareActions make={() => drawWorkoutCard(data)} filename={filename} label="Share workout image" discord={discord && { kind: "workout", ...discord }} />;
}

export function MonthShare({ data, filename, discord }: { data: MonthCardData; filename: string; discord: Discord }) {
  return <ShareActions make={() => drawMonthCard(data)} filename={filename} label="Share month image" discord={discord && { kind: "month", ...discord }} />;
}

export function WeekShare({ data, filename, discord }: { data: WeekCardData; filename: string; discord: Discord }) {
  return <ShareActions make={() => drawWeekCard(data)} filename={filename} label="Share weekly recap" discord={discord && { kind: "week", ...discord }} />;
}
