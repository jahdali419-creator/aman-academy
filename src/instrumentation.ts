export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { database } = await import("./server/db/client");
    await database(); // run migrations (and the demo seed) before serving requests
  }
}
