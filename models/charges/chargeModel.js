const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

// Define the Mongoose schema for charges
const chargeSchema = new mongoose.Schema(
  {
    invoice: {
      type: String,
      required: true,
    },
    msisdn: {
      type: String,
      required: true,
    },
    transaction_ref: {
      type: String,
      required: false,
      default: "T12344C",
    },
    thirdparty_ref: {
      type: String,
      required: false,
      default: "64VBPT",
    },
    data: {
      type: Object, // Update the data field to allow objects
      required: false,
    },
    customer: {
      firstName: { type: String, text: true }, // Add text index here
      lastName: String,
      type: ObjectId,
      ref: "Customer",
      required: false,
    },
    service: {
      title: { type: String, text: true }, // Add text index here
      // ... other fields ...
      type: ObjectId,
      ref: "Servico",
      required: false,
    },
    paymentMethod: {
      type: String,
      enum: ["check", "dinheiro", "mpesa"],
    },
    amount: {
      type: String, // Use 'Number' for decimal or 'Decimal128' for higher precision
      required: true,
    },
    status: {
      type: String, // Use 'Number' for decimal or 'Decimal128' for higher precision
      default: "completo", //pending
    },
    user: {
      firstName: { type: String, text: true }, // Add text index here
      lastName: String,
      type: ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true, // Enable timestamps
  }
);

// Add text indexes for the specified fields
chargeSchema.index({ 'customer.firstName': 'text', 'service.title': 'text', 'user.firstName': 'text' });
// Create the Mongoose model using the schema
const Charge = mongoose.model("Charge", chargeSchema);

module.exports = Charge;

// data;