/**
 * Task Frequency Configuration
 * This file contains configurations related to task frequencies in the application.
 * Edit this file to add new frequency types or update display values.
 */

// Task frequency types used throughout the application
export type FrequencyType = 
  | "morning" 
  | "afternoon" 
  | "evening" 
  | "daily" 
  | "weekly" 
  | "monthly";

// Display information for each frequency type
export const FREQUENCY_INFO = {
  morning: {
    label: "Morning",
    icon: "Sunrise",
    description: "Tasks to be completed in the morning",
    color: "text-amber-500",
    order: 1
  },
  afternoon: {
    label: "Afternoon",
    icon: "Sun",
    description: "Tasks to be completed in the afternoon",
    color: "text-yellow-500",
    order: 2
  },
  evening: {
    label: "Evening",
    icon: "Sunset",
    description: "Tasks to be completed in the evening",
    color: "text-indigo-500",
    order: 3
  },
  daily: {
    label: "Daily",
    icon: "Calendar",
    description: "Tasks to be completed once per day (any time)",
    color: "text-emerald-500",
    order: 4
  },
  weekly: {
    label: "Weekly",
    icon: "CalendarDays",
    description: "Tasks to be completed once per week",
    color: "text-blue-500",
    order: 5
  },
  monthly: {
    label: "Monthly",
    icon: "CalendarRange",
    description: "Tasks to be completed once per month",
    color: "text-purple-500",
    order: 6
  }
};

// Array of all frequency types for dropdown menus
export const FREQUENCY_OPTIONS = Object.entries(FREQUENCY_INFO).map(([value, info]) => ({
  value,
  label: info.label,
  description: info.description,
  order: info.order
})).sort((a, b) => a.order - b.order);

// Group frequencies by daily vs recurring
export const FREQUENCY_GROUPS = {
  daily: ["morning", "afternoon", "evening", "daily"],
  recurring: ["weekly", "monthly"]
};

/**
 * Check if a frequency should be considered as "today's task"
 * @param frequency The frequency to check
 * @returns boolean indicating if it's a daily task
 */
export function isDailyFrequency(frequency: FrequencyType): boolean {
  return FREQUENCY_GROUPS.daily.includes(frequency);
}

/**
 * Get a human-readable description for a frequency
 * @param frequency The frequency to describe
 * @returns A user-friendly description of the frequency
 */
export function getFrequencyDescription(frequency: FrequencyType): string {
  return FREQUENCY_INFO[frequency]?.description || "Task";
} 