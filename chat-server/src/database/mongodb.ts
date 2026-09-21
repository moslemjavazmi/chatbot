import {
  MongoClient,
  Db,
} from "mongodb";

const MONGO_URL =
  process.env.MONGO_URL ??
  "mongodb://127.0.0.1:27017";

const DATABASE_NAME =
  process.env.MONGO_DATABASE ??
  "taskino-chat";

const client =
  new MongoClient(MONGO_URL);

let database: Db | null = null;

export async function connectMongoDB(): Promise<Db> {
  if (database) {
    return database;
  }

  await client.connect();

  database =
    client.db(DATABASE_NAME);

  console.log(
    `🍃 MongoDB connected: ${DATABASE_NAME}`
  );

  return database;
}

export function getMongoDB(): Db {
  if (!database) {
    throw new Error(
      "MongoDB is not connected"
    );
  }

  return database;
}