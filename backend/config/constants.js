import { config } from "dotenv";
config();

export const mongoUri =
    process.env.MODE === "dev"
        ? process.env.LOCAL_MONGO_URI
        : process.env.MONGO_URI;

export const dbName =
    process.env.MODE === "dev"
        ? process.env.LOCAL_DB_NAME
        : process.env.DB_NAME;
