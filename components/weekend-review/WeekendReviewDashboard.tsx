import { getWeekendReviewPageData } from "@/lib/supabase/queries/weekend-review-page";
import { WeekendReviewClient } from "./WeekendReviewClient";

export async function WeekendReviewDashboard() {
  const data = await getWeekendReviewPageData();
  return <WeekendReviewClient initialData={data} />;
}
