const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const transactionSchema = new mongoose.Schema(
  {
    customerId: {
      type:ObjectId,
      ref: "User",
      required: true,
    },
    customerName: {
      type: String,
      required: false,
    },
    customerCompany: {
      type: ObjectId,
      ref: "Company",
      required: false,
    },
    planId: {
      type: ObjectId,
      ref: "Plan",
      required: true,
    },
    serviceIds: [
      {
        type: ObjectId,
        ref: "PlanServices",
        required: true,
      },
    ],
    multipleFiles: {
      type: String,
    },
    paymentMethod: {
      type: String,
      required: false,
    },
    amount: {
      type: Number,
      required: true,
    },
    revokedAmount: {
      type: Number,
      required: false,
    },
    // Additional fields for tracking information
    amountSpent: {
      type: Number,
      default: 0,
    },
    remainingBalance: {
      type: Number,
      default: 0,
    },
    // Add any other fields related to the transaction here
    transactionStatus: {
      type: String,
      enum: ["Pending", "Completed", "Revoked","Aproved","In progress","Canceled"],
      default: "In progress",
    },
    // Status change history
    statusHistory: [
      {
        status: { type: String },
        changedBy: { type: ObjectId, ref: "User" }, // Reference to the admin/user who changed the status
        date: { type: Date, default: Date.now },
      },
    ],
    preAuthorization: {
      type: String,
      enum: ["yes", "no"], // Accepts "yes" or "no" as string values
      required: true,
      default: "no", // New field to indicate if pre-authorization is required
    },
    adminApprovalStatus: {
      type: Boolean,
      default: false, // New field to indicate if admin approved the transaction
    },
    revokeReason: {
      type: String, // New field for commenting the reason for revoking the transaction by the admin
      required: function () {
        return this.transactionStatus === "Revoked";
      },
      required:false
    },
    cancelReason: {
      type: String, // New field for commenting the reason for canceled the transaction by the admin
      required: function () {
        return this.transactionStatus === "Canceled";
      },
      required:false
    },
    invoiceNumber: {
      type: String,
      required: true,
      default: function () {
        // Generate a default invoice number when creating a new transaction
        const prefix = "INV";
        const date = new Date();
        const timestamp = date.getTime();
        const randomDigits = Math.floor(Math.random() * 1000);
        return `${prefix}-${timestamp}-${randomDigits}`;
      },
    },
    companyPartner:{
      type: ObjectId,
      ref: "Partner",
      required: false
    },
    user: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
  },
    
  { timestamps: true }
);


module.exports = mongoose.model("Transaction", transactionSchema);
