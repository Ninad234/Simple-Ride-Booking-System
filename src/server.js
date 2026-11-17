import "dotenv/config";

import express from "express";

import connectDB from "./config/db.js";
import redisConnection from "./config/redis.js";

import rideRoutes from "./routes/rideRoutes.js";

const app = express();

app.use(express.json());

app.use("/rides", rideRoutes);

const startServer = async () => {
  await connectDB();

  await redisConnection.ping();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();