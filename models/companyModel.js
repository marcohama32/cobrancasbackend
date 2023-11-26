const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company Name is required"],
    },
    brand: {
      type: String,
      trim: true,
      required: [true, "Brand is required"],
    },
    accountManager: {
      type: String,
      trim: true,
      required: [true, "Account Manager is required"],
    },
    manager: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    agent: {
      type: ObjectId,
      ref: "User",
      required: false,
    },
    
    plan: [{
      type: ObjectId,
      ref: "Plan",
      required: false,
    }],
    status: {
      type: String,
      default: "Active",
    },
    email: {
      type: String,
      required: false,
    },
    contact1: {
      type: String,
      required: [true, "Contact is required"],
    },
    contact2: {
      type: String,
      required: false,
    },
    avatar: {
      type: String,
      required: false,
    },
    user: {
        type: ObjectId,
        ref: "User",
        required: true,
      },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
