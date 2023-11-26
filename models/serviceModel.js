const mongoose = require("mongoose");

const planServiceSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: true,
  },
  servicePrice: {
    type: Number,
    required: true,
  },
  serviceDescription: {
    type: String,
    required: true,
  },
  serviceAreaOfCover: {
    type: String,
    required: true,
  },
  preAuthorization: {
    type: String,
    enum: ["yes", "no"],
    required: true,
  },
  remainingBalance: {  // Add remainingBalance field
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    default: "Active",
  },
});

module.exports = mongoose.model("PlanServices", planServiceSchema);
