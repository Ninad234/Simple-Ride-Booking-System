import "dotenv/config";

import redis from "../config/redis.js"

const STREAM = "rideEvents";
const GROUP = "billing-group";
const CONSUMER = "billing-1";

// Create consumer group
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

// Read events continuously
const startBilling = async () => {

  await createGroup();

  console.log("Billing Consumer Started");

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

        // Process every event.
        // Only charge on successful assignment.
        if (data.status === "ASSIGNED") {
          console.log(
            `Billing: charging rider for ride ${data.rideId}`
          );
        }

        await redis.xack(STREAM, GROUP, eventId);
      }
    }
  }
};

startBilling().catch(console.error);