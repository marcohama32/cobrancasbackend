const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      required: [true, "first name is required"],
      maxlength: 32,
    },
    lastName: {
      type: String,
      trim: true,
      required: [true, "last name is required"],
      maxlength: 32,
    },
    email: {
      type: String,
      trim: true,
      unique: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please add a valid email",
      ],
      required: false
    },

    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: ["masculino", "feminino", "outro"],
    },
    dob: {
      type: Date,
      required: [true, "Data de nascimento obrigatoria"],
    },

    idType: {
      type: String,
      required: [true, "Tipo de documento e obrigatorio"],
    },

    idNumber: {
      type: String,
      required: [true, "id Number is required"],
      unique: true,
    },
    address: {
      type: String,
      required: [true, "Adress is required"],
    },
    contact1: {
      type: String,
      unique: false,
      required: function () {
        return this.isNew; // Make it required only when creating a new document
      },
    },
    contact2: {
      type: String,
      unique: false,
      required: false,
    },
    user: {
      type: ObjectId,
      ref: "User",
      required: false,
    },
    activities: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    multipleFiles: {
      type: String,
      required: false,
    },
    avatar: {
      type: String,
      required: false,
    },
    role: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: "Activo",
    },
  },
  { timestamps: true }
);

//return a JWT token

module.exports = mongoose.model("Customer", userSchema);
