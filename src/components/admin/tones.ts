import type { Tone } from "@/components/ui/primitives";

export const progressTone = (status: string): Tone =>
  status === "passed" ? "success" : status === "action_required" ? "danger" : status === "exam_available" ? "info" : "neutral";

export const sessionTone = (status: string): Tone => (status === "scheduled" ? "info" : status === "completed" ? "success" : "danger");

export const attendanceTone = (status: string | undefined): Tone =>
  status === "present" ? "success" : status === "partial" ? "warning" : status === "absent" ? "danger" : "neutral";

export const certificateTone = (status: string): Tone => (status === "valid" ? "success" : status === "revoked" ? "danger" : "warning");
