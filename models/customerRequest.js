const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const customerRequestSchema = new mongoose.Schema(
    {
      customer: {
        type: ObjectId,
        ref: "User",
        required: true,
      },
      title: { type: String, required: true },
      files: {
        type: String,
        required: true,
      },
      comment: String,
      status: {
        type: String,
        enum: [
          "Pending",
          "canceled", 
          "Received",
          "Under assessment",
          "Under approval",
          "Done",
        ],
        default: "Pending",
      },
  
      statusHistory: [
        {
          status: { type: String },
          changedBy: { type: ObjectId, ref: "User" }, // Reference to the admin/user who changed the status
          date: { type: Date, default: Date.now },
        },
      ],
    },
    { timestamps: true }
  );

module.exports = mongoose.model("CustomerRequest", customerRequestSchema);