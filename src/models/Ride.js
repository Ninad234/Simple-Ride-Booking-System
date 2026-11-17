import mongoose from "mongoose";

const rideSchema = new mongoose.Schema(
  {
    riderId: {
      type: String,
      required: true
    },

    pickup: {
      type: String,
      required: true
    },

    destination: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: [
        "REQUESTED",
        "ASSIGNED",
        "NO_DRIVER_FOUND"
      ],
      default: "REQUESTED"
    },

    assignedDriverId: {
      type: String,
      default: null
    },

    rejectedDriverIds: {
      type: [String],
      default: []
    },

    assignmentHistory: {
      type: [String],
      default: []
    },

    rejectionCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const Ride = mongoose.model("Ride", rideSchema);

export default Ride;