const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const { Decimal128 } = require("mongoose").Schema.Types;

// Define the Mongoose schema for expense
const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    date: Date,
    description: String,
    amount: {
      type: String, // Use 'Number' for decimal or 'Decimal128' for higher precision
      required: true,
    },
    category: String,
    paymentMethod: {
      type: String,
      enum: ["check", "dinheiro", "mpesa","transferencia"],
    },
    notes: String,
    user: {
      type: ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true, // Enable timestamps
  }
);

// Create the Mongoose model using the schema
const Expense = mongoose.model("Expense", expenseSchema);

module.exports = Expense;
