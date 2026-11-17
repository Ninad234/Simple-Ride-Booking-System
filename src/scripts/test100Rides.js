import "dotenv/config";

import mongoose from "mongoose";

import Ride from "../models/Ride.js";

const API_URL = "http://localhost:5000/rides";

const TOTAL_RIDES = 100;

// Book 100 rides simultaneously
const book100Rides = async () => {

  console.log("\nBooking 100 rides...\n");

  const requests = Array.from(
    { length: TOTAL_RIDES },
    (_, index) => {

      return fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          riderId: `RIDER${index + 1}`,
          pickup: "Panvel",
          destination: "Vashi"
        })
      });
    }
  );

  const responses = await Promise.all(requests);

  const results = await Promise.all(
    responses.map(async (response) => ({
      ok: response.ok,
      data: await response.json()
    }))
  );

  const failedRequests = results.filter(
    result => !result.ok
  );

  if (failedRequests.length > 0) {
    throw new Error(
      `${failedRequests.length} ride booking requests failed`
    );
  }

  const rideIds = results.map(
    result => result.data.rideId
  );

  console.log(`${rideIds.length} rides created successfully`);

  return rideIds;
};

// Wait until every ride has a final status
const waitForCompletion = async (rideIds) => {

  console.log("\nWaiting for ride assignments...\n");

  const startTime = Date.now();

  const timeout = 120000;

  while (Date.now() - startTime < timeout) {

    const completedRides = await Ride.countDocuments({
      _id: { $in: rideIds },
      status: {
        $in: ["ASSIGNED", "NO_DRIVER_FOUND"]
      }
    });

    console.log(
      `Completed: ${completedRides}/${rideIds.length}`
    );

    if (completedRides === rideIds.length) {
      return true;
    }

    await new Promise(resolve =>
      setTimeout(resolve, 1000)
    );
  }

  return false;
};

// Verify final results
const generateReport = async (rideIds) => {

  const rides = await Ride.find({
    _id: { $in: rideIds }
  });

  const totalCreated = rides.length;

  const assigned = rides.filter(
    ride => ride.status === "ASSIGNED"
  ).length;

  const noDriverFound = rides.filter(
    ride => ride.status === "NO_DRIVER_FOUND"
  ).length;

  const stuckRides = rides.filter(
    ride =>
      !["ASSIGNED", "NO_DRIVER_FOUND"].includes(
        ride.status
      )
  ).length;

  const doubleAssigned = rides.filter(
    ride => ride.assignmentHistory.length > 1
  ).length;

  console.log("\n========== FINAL RIDE REPORT ==========\n");

  console.table([
    {
      Check: "Total rides created",
      Actual: totalCreated,
      Expected: 100,
      Result: totalCreated === 100 ? "PASS" : "FAIL"
    },
    {
      Check: "Assigned rides",
      Actual: assigned,
      Expected: "Part of 100",
      Result: "INFO"
    },
    {
      Check: "No driver found",
      Actual: noDriverFound,
      Expected: "Part of 100",
      Result: "INFO"
    },
    {
      Check: "Assigned + No Driver Found",
      Actual: assigned + noDriverFound,
      Expected: 100,
      Result:
        assigned + noDriverFound === 100
          ? "PASS"
          : "FAIL"
    },
    {
      Check: "Rides assigned to 2 drivers",
      Actual: doubleAssigned,
      Expected: 0,
      Result: doubleAssigned === 0 ? "PASS" : "FAIL"
    },
    {
      Check: "Rides without final status",
      Actual: stuckRides,
      Expected: 0,
      Result: stuckRides === 0 ? "PASS" : "FAIL"
    }
  ]);

  console.log("\n=======================================\n");

  const allPassed =
    totalCreated === 100 &&
    assigned + noDriverFound === 100 &&
    doubleAssigned === 0 &&
    stuckRides === 0;

  console.log(
    allPassed
      ? "ALL TESTS PASSED"
      : "SOME TESTS FAILED"
  );
};

// Main execution
const runTest = async () => {

  try {

    await mongoose.connect(process.env.MONGO_URI);

    const rideIds = await book100Rides();

    const completed = await waitForCompletion(rideIds);

    if (!completed) {
      console.log("TIMEOUT: Some rides are still processing.");
    }

    await generateReport(rideIds);

  } catch (error) {

    console.error("Test Error:", error);

  } finally {

    await mongoose.disconnect();

  }
};

runTest();