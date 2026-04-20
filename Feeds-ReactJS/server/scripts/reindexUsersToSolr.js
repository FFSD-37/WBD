import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import connectToMongo from "../Db/connection.js";
import User from "../models/users_schema.js";
import { isSolrEnabled, upsertUsersInSolr } from "../services/solr.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const BATCH_SIZE = 100;
console.log("BASE:", process.env.SOLR_BASE_URL);
console.log("CORE:", process.env.SOLR_CORE);
console.log("USER:", process.env.SOLR_USERNAME);
console.log("PASS EXISTS:", !!process.env.SOLR_PASSWORD);
async function reindexUsersToSolr() {
  if (!isSolrEnabled()) {
    throw new Error(
      "Solr is not configured. Set SOLR_BASE_URL and SOLR_CORE before running the reindex.",
    );
  }

  await connectToMongo();

  let skip = 0;
  let indexedCount = 0;

  while (true) {
    const users = await User.find({})
      .sort({ _id: 1 })
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean();

    if (!users.length) {
      break;
    }

    const indexed = await upsertUsersInSolr(users);
    if (!indexed) {
      throw new Error(`Failed to index user batch starting at offset ${skip}.`);
    }

    indexedCount += users.length;
    skip += users.length;
    console.log(`Indexed ${indexedCount} users into Solr...`);
  }

  console.log(`User reindex complete. Total indexed users: ${indexedCount}`);
}

try {
  await reindexUsersToSolr();
  await mongoose.connection.close();
  process.exit(0);
} catch (error) {
  console.error("User reindex failed:", error.message);

  try {
    await mongoose.connection.close();
  } catch {
    // Ignore close errors during shutdown.
  }

  process.exit(1);
}
