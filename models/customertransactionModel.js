const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const customertransactionSchema = new mongoose.Schema(
  {
    user: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: ObjectId,
      ref: "Plan",
      required: true,
    },
    service: {
      type: ObjectId,
      ref: "Service",
      required: true,
    },
    expense: {
      type: String,
      required: [true, "Expense is required"],
    },
    amountLeftPlan: {
      type: String,
      trim: true,
      required: [true, "Amount not send required"],
    },
    amountLeftService: {
      type: String,
      trim: true,
      required: [true, "Amount not send required"],
    },
    partner: {
      type: ObjectId,
      ref: "Partner",
      required: true,
    },
    transactionStatus: {
      type: String,
      enum: ["Pending", "Completed", "Revoked"],
      default: "Pending",
    },
    preAuthorization: {
      type: String,
      enum: ["yes", "no"], // Accepts "yes" or "no" as string values
      required: true,
      default: "no", // New field to indicate if pre-authorization is required
    },
    multipleFiles: {
      type: String,
    },
    adminApprovalStatus: {
      type: Boolean,
      default: false, // New field to indicate if admin approved the transaction
    },
    adminRevokeComment: {
      type: String, // New field for commenting the reason for revoking the transaction by the admin
      required: function () {
        return this.transactionStatus === "Revoked";
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomerTransaction", customertransactionSchema);
