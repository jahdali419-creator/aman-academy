/** Result of a server action, as consumed by <ActionForm>. All codes are keys in the `errors` messages. */
export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Submitted (non-secret) values, echoed back so the form keeps them after an error. */
  values?: Record<string, string>;
  /** Key in the `common.success` messages. */
  success?: string;
} | null;
