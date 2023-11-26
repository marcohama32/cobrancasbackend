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
      unique: true,
      required: function () {
        return this.isNew; // Make it required only when creating a new document
      },
    },
    contact2: {
      type: String,
      unique: true,
      required: false,
    },

    activities: {
      type: String,
      required: false,
    },
    username: {
      type: String,
      required: false,
    },

    user: {
      type: ObjectId,
      ref: "User",
      required: false,
    },

    password: {
      type: String,
      trim: true,
      default: "senha123",
      // minlength: [6, "passwprd must have at least (6) caracters"],
    },

    multipleFiles: {
      type: String,
    },
    avatar: {
      type: String,
    },
    role: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: "Active",
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

//compare user password
userSchema.methods.comparePassword = async function (enteredPassword) {
  // return await bcrypt.compare(enteredPassword, this.password);
  return await bcrypt.compare(enteredPassword, this.password);

};

//return a JWT token
userSchema.methods.getJwtToken = function () {
  const token = jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: 3600,
  });
  return token;
};

module.exports = mongoose.model("User", userSchema);
