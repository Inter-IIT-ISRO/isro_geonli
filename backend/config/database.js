import mongoose from "mongoose";
import { dbName, mongoUri } from "./constants.js";

export const connectDB = () => {
    mongoose
        .connect(mongoUri, { dbName })
        .then((c) => {
            console.log(`Database ${dbName} connected with ${c.connection.host} `);
        })
        .catch((err) => console.log(err));
};
