const mongoose = require("mongoose");
const PlanServices = require("./serviceModel"); // Make sure the file path is correct

const planSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      required: [true, "Plan Name is required"],
    },
    planTotalBalance: {
      type: Number,
      default:0,
    },
    planPrice: {
      type: Number,
      required: true
    },
    areaOfCover:{
      type:String,
      required:true
    },
    planDescription: {
      type: String,
      required: [true, "Plan Description is required"],
    },
    planService: [{ type: mongoose.Schema.Types.ObjectId, ref: "PlanServices" }],
    // Using the ref property, we reference the "PlanServices" model
    status: {
      type: String,
      default: "Active",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Virtual field to populate services
planSchema.virtual('services', {
  ref: 'PlanServices',
  localField: '_id',
  foreignField: 'plan',
});

module.exports = mongoose.model("Plan", planSchema);
