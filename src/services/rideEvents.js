import redisConnection from "../config/redis.js";

export const publishRideEvent = async (ride) => {
  await redisConnection.xadd(
    "rideEvents",
    "*",
    "rideId",
    ride._id.toString(),
    "status",
    ride.status,
    "timestamp",
    new Date().toISOString()
  );

  console.log(
    `Event Published: ${ride._id} - ${ride.status}`
  );
};