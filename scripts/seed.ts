/** Apply migrations and, when DEMO_MODE=true and the database is empty, seed the fictional demo data. */
import { closeDatabase, database } from "../src/server/db/client";

database()
  .then(async () => {
    console.log("Database is migrated" + (process.env.DEMO_MODE === "true" ? " and demo data is present." : "."));
    await closeDatabase();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
