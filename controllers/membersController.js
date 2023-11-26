const User = require("../models/userModel");
const ErrorResponse = require("../utils/errorResponse");
const bcrypt = require("bcrypt");

exports.addmembers = async (req, res, next) => {
  const id = req.params.id;
  const {
    firstName,
    lastName,
    email,
    gender,
    dob,
    relation,
    memberShipID,
    idType,
    idNumber,
    address,
    contact1,
    contact2,
    userType,
    plan: planId, // Rename the plan variable to planId to avoid conflict
    password,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !gender ||
    !idType ||
    !idNumber ||
    !address ||
    !contact1 ||
    !userType ||
    !planId || // Change plan to planId
    !id
  ) {
    return next(new ErrorResponse("Fields cannot be null", 400));
  }

  try {
    const userExist = await User.findOne({ email });

    if (userExist) {
      return next(new ErrorResponse("Email has already been taken", 400));
    }

    // Validate userType to ensure it's one of the valid values (e.g., 4 or 5)
    if (![4, 5].includes(userType)) {
      return next(new ErrorResponse("Invalid userType", 400));
    }

    // Use the same hashing logic as in the model's pre-save hook
    

    const company = mongoose.Types.ObjectId.isValid(id)
      ? mongoose.Types.ObjectId(id)
      : null;

    const plan = mongoose.Types.ObjectId.isValid(planId)
      ? mongoose.Types.ObjectId(planId)
      : null;

      let hashedPassword = password;
    if (!hashedPassword) {
      hashedPassword = await bcrypt.hash("mediplus", 10);
    }

console.log("imprimir",hashedPassword)

    const NewUser = await User.create({
      firstName,
      lastName,
      email,
      gender,
      dob,
      relation,
      monthlyFee,
      memberShipID,
      idType,
      idNumber,
      address,
      contact1,
      contact2,
      userType,
      company,
      plan,
      password: hashedPassword,
      user: req.user.id,
    });

    await User.findByIdAndUpdate(id, {
      $addToSet: { myMembers: NewUser._id }, // Use $addToSet to add members if not already present
    });

    res.status(201).json({
      success: true,
      NewUser,
    });
  } catch (error) {
    next(error);
  }
};
