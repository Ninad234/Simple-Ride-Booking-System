import { Queue } from "bullmq";

const rideQueue = new Queue("rideQueue", {
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null
  }
});

export default rideQueue;