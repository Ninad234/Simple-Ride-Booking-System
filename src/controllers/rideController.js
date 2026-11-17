import Ride from "../models/Ride.js";
import rideQueue from "../queues/rideQueue.js";
import { publishRideEvent } from "../services/rideEvents.js";

export const bookRide = async (req, res) => {
  try {
    const { riderId, pickup, destination } = req.body;

    if (!riderId || !pickup || !destination) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    // 1. Create ride
    const ride = await Ride.create({
      riderId,
      pickup,
      destination,
      status: "REQUESTED"
    });

    // 2. Publish REQUESTED event
    await publishRideEvent(ride);

    // 3. Add ride to background queue
    await rideQueue.add(
      "assignRide",
      {
        rideId: ride._id.toString()
      },
      {
        jobId: ride._id.toString()
      }
    );

    // 4. Immediately return rideId
    return res.status(202).json({
      message: "Ride booked successfully",
      rideId: ride._id,
      status: ride.status
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Unable to book ride"
    });
  }
};