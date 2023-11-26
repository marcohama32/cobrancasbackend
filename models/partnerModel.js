const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const partnerSchema = new mongoose.Schema(
  {
    partnerName: {
      type: String,
      required: [true, "Prtner Name is required"],
    },
    partnerLocation: {
      type: String,
      trim: true,
      required: [true, "Partner Location is required"],
    },
    partnerBusiness: {
      type: String,
      trim: true,
      required: [true, "Partner Business is required"],
    },
    email: {
      type: String,
      trim: true,
      required: [true, "e-mail name is required"],
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please add a valid email",
      ],
    },
    enrolmentDate: {
      type: Date,
    },
    contact1: {
      type: String,
      trim: true,
      required: [true, "Contact is required"],
    },
    contact2: {
      type: String,
      trim: true,
      required: ["Partner Business is required"],
    },
    avatar: {
      type: String
    },
    status: {
      type: String,
      default: "Active",
    },
    user: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Partner", partnerSchema);
