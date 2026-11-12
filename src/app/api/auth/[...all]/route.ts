import { getAuth } from "@/server/auth/auth";
import { database } from "@/server/db/client";

// Bound lazily so the database is only opened when a request arrives.
const handler = async (req: Request) => {
  await database();
  return getAuth().handler(req);
};

export const GET = handler;
export const POST = handler;
