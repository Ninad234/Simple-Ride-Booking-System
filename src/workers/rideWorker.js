import "dotenv/config";

import { Worker } from "bullmq";

import Ride from "../models/Ride.js";
import connectDB from "../config/db.js";

import { publishRideEvent } from "../services/rideEvents.js";

// 10 Fake Drivers
const drivers = [
  "D001",
  "D002",
  "D003",
  "D004",
  "D005",
  "D006",
  "D007",
  "D008",
  "D009",
  "D010"
];

// Fake driver response
const driverResponse = () => {
  return Math.random() < 0.5
    ? "ACCEPTED"
    : "REJECTED";
};

await connectDB();

const worker = new Worker(
  "rideQueue",

  async (job) => {

    const { rideId } = job.data;

    const ride = await Ride.findById(rideId);

    if (!ride || ride.status !== "REQUESTED") {
      return;
    }

    console.log(`Processing Ride: ${rideId}`);

    // Try drivers until accepted or 3 rejections
    for (const driverId of drivers) {

      // Stop after 3 rejections
      if (ride.rejectionCount >= 3) {
        break;
      }

      // Skip already rejected drivers
      if (ride.rejectedDriverIds.includes(driverId)) {
        continue;
      }

      console.log(`Offering ride to ${driverId}`);

      const response = driverResponse();

      if (response === "ACCEPTED") {

        const updatedRide = await Ride.findOneAndUpdate(
          {
            _id: rideId,
            status: "REQUESTED",
            assignedDriverId: null
          },
          {
            $set: {
              status: "ASSIGNED",
              assignedDriverId: driverId
            },
            $push: {
              assignmentHistory: driverId
            }
          },
          {
            new: true
          }
        );

        if (updatedRide) {
          await publishRideEvent(updatedRide);

          console.log(
            `Ride ${rideId} assigned to ${driverId}`
          );
        }

        return;
      }

      // Driver rejected
      console.log(`${driverId} rejected the ride`);

      const updatedRide = await Ride.findOneAndUpdate(
        {
          _id: rideId,
          status: "REQUESTED"
        },
        {
          $addToSet: {
            rejectedDriverIds: driverId
          },
          $inc: {
            rejectionCount: 1
          }
        },
        {
          new: true
        }
      );

      if (!updatedRide) {
        return;
      }

      // Update local ride information
      ride.rejectedDriverIds = updatedRide.rejectedDriverIds;
      ride.rejectionCount = updatedRide.rejectionCount;
    }

    // Three rejections: no driver found
    if (ride.rejectionCount >= 3) {

      const updatedRide = await Ride.findOneAndUpdate(
        {
          _id: rideId,
          status: "REQUESTED"
        },
        {
          $set: {
            status: "NO_DRIVER_FOUND"
          }
        },
        {
          new: true
        }
      );

      if (updatedRide) {
        await publishRideEvent(updatedRide);

        console.log(`No driver found for ride ${rideId}`);
      }
    }
  },

  {
    connection: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null
    },
    concurrency: 5
  }
);

worker.on("completed", (job) => {
  console.log(`Job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Job failed: ${job?.id}`, error);
});

console.log("Ride Assignment Worker Started");