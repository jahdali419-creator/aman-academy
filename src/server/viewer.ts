/** The authenticated person making a request, as the business rules see them. */
export type Viewer = {
  id: string;
  name: string;
  nameAr: string | null;
  email: string;
  phone: string | null;
  role: "learner" | "instructor" | "admin";
  locale: string;
  isDemo: boolean;
  /** Organization membership, if any. Always resolved on the server. */
  org: { id: string; name: string; role: "manager" | "employee" } | null;
  /** Instructor profile linked to this account, if any. */
  instructorId: string | null;
};

export const isAdmin = (v: Viewer) => v.role === "admin";
export const isManager = (v: Viewer) => v.org?.role === "manager";
