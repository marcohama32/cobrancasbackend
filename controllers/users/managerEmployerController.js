const Company = require("../../models/companyModel");
const Plan = require("../../models/planModel");
const User = require("../../models/userModel");
const ErrorResponse = require("../../utils/errorResponse");
const asyncHandler = require("../../middleware/asyncHandler");
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");

exports.createManagerUser = asyncHandler(async (req, res, next) => {
  try {
    // Validate user input using express-validator (optional but recommended)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      firstName,
      lastName,
      idType,
      idNumber,
      dob,
      gender,
      email,
      address,
      contact1,
      contact2,
      password,
    } = req.body;

    // Check if contact is a valid number
    if (isNaN(contact1) || (contact2 && isNaN(contact2))) {
      return res.status(400).json({
        success: false,
        message: "Validate all fields",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with the same email already exists",
      });
    }

    const avatar = req.file ? req.file.path : null;

    // Use the same hashing logic as in the model's pre-save hook
    let hashedPassword = password;
    if (!hashedPassword) {
      hashedPassword = await bcrypt.hash("mediplus", 10);
    }

    const admin = await User.create({
      dob,
      idNumber,
      idType,
      address,
      contact1,
      contact2,
      email,
      firstName,
      gender,
      lastName,
      role: 2,
      avatar,
      userType: 2,
      password: hashedPassword, // Use the hashed password
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      admin,
    });
  } catch (error) {
    next(error);
  }
});

//update manager
exports.updatedManager = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  const avatar = req.file?.path;

  const {
    firstName,
    lastName,
    idType,
    idNumber,
    dob,
    gender,
    email,
    address,
    contact1,
    contact2,
    password,
    status,
  } = req.body;

  const requiredFields = [
    firstName,
    lastName,
    idType,
    idNumber,
    dob,
    gender,
    email,
    address,
    contact1,
  ];

  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Fields cannot be null", 400));
  }
  // Check if contact is a valid number
  if (isNaN(contact1) || isNaN(contact2)) {
    return next(new ErrorResponse("Contact must be a number", 400));
  }

  let hashedPassword = password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

  const updatedadmin = await User.findByIdAndUpdate(
    id,
    {
      firstName,
      lastName,
      idType,
      idNumber,
      dob,
      gender,
      email,
      address,
      contact1,
      role: 2,
      avatar,
      password:hashedPassword,
      userType: 2,
      status,
      user: req.user.id,
    },
    { new: true }
  );

  if (!updatedadmin) {
    return next(new ErrorResponse("User not found", 404));
  }

  res.status(200).json({
    success: true,
    admin: updatedadmin,
  });
});

//get all manager
exports.getAllAdminUser = async (req, res, next) => {
  let pageSize = Number(req.query.pageSize) || 10;
  let page = Number(req.query.pageNumber) || 1;
  const searchTerm = req.query.searchTerm;

  // Validate pageSize and pageNumber
  if (pageSize <= 0) {
    return res.status(400).json({
      success: false,
      error: "Invalid pageSize. Must be greater than 0",
    });
  }

  if (page <= 0) {
    return res.status(400).json({
      success: false,
      error: "Invalid pageNumber. Must be greater than 0",
    });
  }

  try {
    let query = { role: { $in: [1, 2, 3] } }; // Include users with userType 1, 2, or 3

    if (searchTerm) {
      query = {
        $and: [
          { role: { $in: [1, 2, 3] } }, // Include users with userType 1, 2, or 3
          {
            $or: [
              { firstName: { $regex: searchTerm, $options: "i" } },
              { lastName: { $regex: searchTerm, $options: "i" } },
              { idNumber: { $regex: searchTerm, $options: "i" } },
              { contact1: { $regex: searchTerm, $options: "i" } },
              { contact2: { $regex: searchTerm, $options: "i" } },
              { memberShipID: { $regex: searchTerm, $options: "i" } },
              { relation: { $regex: searchTerm, $options: "i" } },
            ],
          },
        ],
      };

      const dateSearch = new Date(searchTerm);
      if (!isNaN(dateSearch)) {
        query.$and.push({ enrolmentDate: dateSearch });
      }
    }

    const count = await User.countDocuments(query);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select(
        "firstName lastName idType idNumber dob gender email address contact1 contact2 manager password userType role avatar status"
      )
      .populate({
        path: "manager",
        select: "firstName lastName email contact1 contact2 avatar _id",
      })
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    // The rest of the code remains the same...

    res.status(200).json({
      success: true,
      users,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    return next(error);
  }
};

// exports.getAllIndividualCustomer = getAllIndividualCustomer;
