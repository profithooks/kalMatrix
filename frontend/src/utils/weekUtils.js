import { startOfWeek } from "date-fns";

export function getCurrentWeekStart() {
  return startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
}
