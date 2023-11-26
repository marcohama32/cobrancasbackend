const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const { Decimal128 } = require("mongoose").Schema.Types;

// Define the Mongoose schema for expense
const servicoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    amount: {
      type: String, // Use 'Number' for decimal or 'Decimal128' for higher precision
      required: true,
    },
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
const Servico = mongoose.model("Servico", servicoSchema);

module.exports = Servico;
