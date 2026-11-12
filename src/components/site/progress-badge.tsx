import { getTranslations } from "next-intl/server";
import type { ProgressStatus } from "@/server/services/enrollment";
import { Badge, type Tone } from "@/components/ui/primitives";

export const progressTone: Record<ProgressStatus, Tone> = {
  session_upcoming: "info",
  attendance_pending: "neutral",
  exam_available: "success",
  exam_in_progress: "warning",
  passed: "success",
  action_required: "danger",
  cancelled: "neutral",
};

export async function ProgressBadge({ status }: { status: ProgressStatus }) {
  const t = await getTranslations("status.progress");
  return <Badge tone={progressTone[status]}>{t(status)}</Badge>;
}
