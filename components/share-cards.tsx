"use client";
import { drawMonthCard, drawWeekCard, drawWorkoutCard, loadImage, type MonthCardData, type WeekCardData, type WorkoutCardData } from "@/lib/share-cards";
import { ShareActions } from "./share-actions";

type Discord = { title: string; session?: string } | null;

/** `photo` = the workout's first photo, drawn under the exercises. */
export function WorkoutShare({ data, filename, discord, photo }: { data: WorkoutCardData; filename: string; discord: Discord; photo?: string | null }) {
  return <ShareActions make={async () => drawWorkoutCard(data, await loadImage(photo))} filename={filename} label="Share workout image" discord={discord && { kind: "workout", ...discord }} />;
}

export function MonthShare({ data, filename, discord }: { data: MonthCardData; filename: string; discord: Discord }) {
  return <ShareActions make={() => drawMonthCard(data)} filename={filename} label="Share month image" discord={discord && { kind: "month", ...discord }} />;
}

export function WeekShare({ data, filename, discord }: { data: WeekCardData; filename: string; discord: Discord }) {
  return <ShareActions make={() => drawWeekCard(data)} filename={filename} label="Share weekly recap" discord={discord && { kind: "week", ...discord }} />;
}
