import type { Tone } from "@/components/ui/primitives";

/** Badge tone for a learner progress status (see `status.progress.*`). */
export function progressTone(status: string): Tone {
  switch (status) {
    case "passed":
      return "success";
    case "action_required":
      return "danger";
    case "exam_available":
    case "exam_in_progress":
      return "info";
    case "attendance_pending":
      return "warning";
    default:
      return "neutral";
  }
}

/** Badge tone for a recorded attendance status (see `status.attendance.*`). */
export function attendanceTone(status: string | null | undefined): Tone {
  return status === "present" ? "success" : status === "partial" ? "warning" : status === "absent" ? "danger" : "neutral";
}
