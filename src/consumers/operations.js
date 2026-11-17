import "dotenv/config";

import redis from "../config/redis.js";

const STREAM = "rideEvents";
const GROUP = "operations-group";
const CONSUMER = "operations-1";

const createGroup = async () => {
  try {
    await redis.xgroup(
      "CREATE",
      STREAM,
      GROUP,
      "0",
      "MKSTREAM"
    );
  } catch (error) {
    if (!error.message.includes("BUSYGROUP")) {
      throw error;
    }
  }
};

const startOperations = async () => {

  await createGroup();

  console.log("Operations Consumer Started");

  while (true) {

    const events = await redis.xreadgroup(
      "GROUP",
      GROUP,
      CONSUMER,
      "COUNT",
      10,
      "BLOCK",
      5000,
      "STREAMS",
      STREAM,
      ">"
    );

    if (!events) continue;

    for (const [, messages] of events) {

      for (const [eventId, fields] of messages) {

        const data = {};

        for (let i = 0; i < fields.length; i += 2) {
          data[fields[i]] = fields[i + 1];
        }

        console.log(
          `Operations: ride ${data.rideId} is now in status ${data.status}`
        );

        await redis.xack(STREAM, GROUP, eventId);
      }
    }
  }
};

startOperations().catch(console.error);