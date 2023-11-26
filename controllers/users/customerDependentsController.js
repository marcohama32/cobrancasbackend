const Company = require("../../models/companyModel");
const Plan = require("../../models/planModel");
const User = require("../../models/userModel");
const ErrorResponse = require("../../utils/errorResponse");
const asyncHandler = require("../../middleware/asyncHandler");
const bcrypt = require("bcrypt");

//create corporate dependent
exports.createCorporateDependent = async (req, res, next) => {
  const id = req.body.id;
  if (!id) {
    return res
      .status(400)
      .json({ success: false, error: "Select one Main customer" });
  }

  try {
    const checkMain = await User.findById(id);
    if (!checkMain) {
      return res
        .status(400)
        .json({ success: false, error: "Main customer not found" });
    }

    if (checkMain.relation !== "Main") {
      return res.status(400).json({
        success: false,
        error: "Only Main member can have dependents",
      });
    }

    if (checkMain.status !== "Active") {
      return res.status(400).json({
        success: false,
        error: "This Customer is not Active, please validate",
      });
    }

    const {
      firstName,
      lastName,
      idType,
      idNumber,
      dob,
      enrolmentDate,
      gender,
      relation,
      email,
      memberShipID,
      address,
      contact1,
      contact2,
      plan,
      company,
      password,
      monthlyFee,
    } = req.body;

    const requiredFields = [
      firstName,
      lastName,
      idType,
      idNumber,
      dob,
      enrolmentDate,
      gender,
      relation,
      email,
      memberShipID,
      address,
      contact1,
      plan,
      company,
    ];

    if (requiredFields.some((field) => !field)) {
      return res
        .status(400)
        .json({ success: false, error: "Fields cannot be null" });
    }

    // Check if contact is a valid number
    if (isNaN(contact1) || isNaN(contact2)) {
      return res
        .status(400)
        .json({ success: false, error: "Validate all fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with the same data already exists",
      });
    }

    const existingUserByMemberShipID = await User.findOne({ memberShipID });
    if (existingUserByMemberShipID) {
      return res.status(400).json({
        success: false,
        error: "User with the same memberShipID already exists",
      });
    }

    const existingPlan = await Plan.findById(plan);
    if (!existingPlan) {
      return res
        .status(400)
        .json({ success: false, error: "Plan doesn't exist, please check" });
    }

    const avatar = req.file?.path;
    // Use the same hashing logic as in the model's pre-save hook
    let hashedPassword = password;
    if (!hashedPassword) {
      hashedPassword = await bcrypt.hash("mediplus", 10);
    }

    const dependent = await User.create({
      dob,
      idNumber,
      idType,
      address,
      contact1,
      contact2,
      email,
      enrolmentDate,
      memberShipID,
      firstName,
      gender,
      lastName,
      monthlyFee,
      company,
      plan,
      accountOwner: id,
      relation,
      role: 7,
      avatar,
      userType: 7,
      password: hashedPassword,
      user: req.user.id,
    });

    const myMember = await User.findByIdAndUpdate(
      id,
      {
        $addToSet: { myMembers: dependent._id },
      },
      { new: true }
    );

    res.status(201).json({ success: true, dependent, myMember });
  } catch (error) {
    console.error("Error updating main user:", error);
    next(error);
  }
};

//update corporate dependent
exports.updateCorporateDependent = asyncHandler(async (req, res, next) => {
 
  const id = req.params.id;

  const avatar = req.file?.path;

  const {
    firstName,
    lastName,
    idType,
    idNumber,
    dob,
    enrolmentDate,
    gender,
    relation,
    email,
    memberShipID,
    address,
    contact1,
    contact2,
    plan,
    company,
    password,
    monthlyFee,
    status,
  } = req.body;

  const requiredFields = [
    firstName,
    lastName,
    idType,
    idNumber,
    dob,
    enrolmentDate,
    gender,
    relation,
    email,
    memberShipID,
    address,
    contact1,
    plan,
    company,
  ];



  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Fields cannot be null", 400));
  }
  // Check if contact is a valid number
  if (isNaN(contact1) || isNaN(contact2) || isNaN(monthlyFee)) {
    return next(new ErrorResponse("Contact must be a number", 400));
  }

  // Check if serviceName already exists for the given plan
  if (!(await Plan.exists({ _id: plan }))) {
    return next(new ErrorResponse("Plan doesn't exist, please check", 400));
  }

  const existingPlan = await Plan.findById(plan);
  if (!existingPlan) {
    return res
      .status(400)
      .json({ success: false, error: "Plan doesn't exist, please check" });
  }

  let hashedPassword = password;
  if (!hashedPassword) {
    hashedPassword = await bcrypt.hash("mediplus", 10);
  }

  const updatedCompany = await User.findByIdAndUpdate(
    id,
    {
      dob,
      idNumber,
      idType,
      address,
      contact1,
      contact2,
      email,
      enrolmentDate,
      memberShipID,
      firstName,
      gender,
      lastName,
      monthlyFee,
      company,
      plan,
      relation,
      role: 7,
      avatar,
      userType: 7,
      status,
      password: hashedPassword,
      user: req.user.id,
    },
    { new: true }
  );

  if (!updatedCompany) {
    return next(new ErrorResponse("Service not found", 404));
  }

  res.status(200).json({
    success: true,
    company: updatedCompany,
  });
});


//create Invidividual dependent
exports.createIndividualDependent = async (req, res, next) => {
  const id = req.body.id;
  if (!id) {
    return res
      .status(400)
      .json({ success: false, error: "Select one Main customer" });
  }

  try {
    const checkMain = await User.findById(id);
    if (!checkMain) {
      return res
        .status(400)
        .json({ success: false, error: "Main customer not found" });
    }

    if (checkMain.relation !== "Main") {
      return res.status(400).json({
        success: false,
        error: "Only Main member can have dependents",
      });
    }

    if (checkMain.status !== "Active") {
      return res.status(400).json({
        success: false,
        error: "This Customer is not Active, please validate",
      });
    }

    const {
      firstName,
      lastName,
      idType,
      idNumber,
      dob,
      enrolmentDate,
      gender,
      relation,
      email,
      memberShipID,
      address,
      contact1,
      contact2,
      plan,
      password,
      monthlyFee,
    } = req.body;

    const requiredFields = [
      firstName,
      lastName,
      idType,
      idNumber,
      dob,
      enrolmentDate,
      gender,
      relation,
      email,
      memberShipID,
      address,
      contact1,
      plan,
    ];

    if (requiredFields.some((field) => !field)) {
      return res
        .status(400)
        .json({ success: false, error: "Fields cannot be null" });
    }

    // Check if contact is a valid number
    if (isNaN(contact1) || isNaN(contact2)) {
      return res
        .status(400)
        .json({ success: false, error: "Validate all fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with the same data already exists",
      });
    }

    const existingUserByMemberShipID = await User.findOne({ memberShipID });
    if (existingUserByMemberShipID) {
      return res.status(400).json({
        success: false,
        error: "User with the same memberShipID already exists",
      });
    }

    const existingPlan = await Plan.findById(plan);
    if (!existingPlan) {
      return res
        .status(400)
        .json({ success: false, error: "Plan doesn't exist, please check" });
    }

    const avatar = req.file?.path;
    // Use the same hashing logic as in the model's pre-save hook
    let hashedPassword = password;
    if (!hashedPassword) {
      hashedPassword = await bcrypt.hash("mediplus", 10);
    }

    const dependent = await User.create({
      dob,
      idNumber,
      idType,
      address,
      contact1,
      contact2,
      email,
      enrolmentDate,
      memberShipID,
      firstName,
      gender,
      lastName,
      monthlyFee,
      plan,
      accountOwner: id,
      relation,
      role: 8,
      avatar,
      userType: 8,
      password: hashedPassword,
      user: req.user.id,
    });

    const myMember = await User.findByIdAndUpdate(
      id,
      {
        $addToSet: { myMembers: dependent._id },
      },
      { new: true }
    );

    res.status(201).json({ success: true, dependent, myMember });
  } catch (error) {
    console.error("Error updating main user:", error);
    next(error);
  }
};

//update Invidividual dependent
exports.updateInvidividualDependent = asyncHandler(async (req, res, next) => {
 
  const id = req.params.id;

  const avatar = req.file?.path;

  const {
    firstName,
    lastName,
    idType,
    idNumber,
    dob,
    enrolmentDate,
    gender,
    relation,
    email,
    memberShipID,
    address,
    contact1,
    contact2,
    plan,
    password,
    monthlyFee,
    status,
  } = req.body;

  const requiredFields = [
    firstName,
    lastName,
    idType,
    idNumber,
    dob,
    enrolmentDate,
    gender,
    relation,
    email,
    memberShipID,
    address,
    contact1,
    plan,
  ];



  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Fields cannot be null", 400));
  }
  // Check if contact is a valid number
  if (isNaN(contact1) || isNaN(contact2) || isNaN(monthlyFee)) {
    return next(new ErrorResponse("Contact must be a number", 400));
  }

  // Check if serviceName already exists for the given plan
  if (!(await Plan.exists({ _id: plan }))) {
    return next(new ErrorResponse("Plan doesn't exist, please check", 400));
  }

  const existingPlan = await Plan.findById(plan);
  if (!existingPlan) {
    return res
      .status(400)
      .json({ success: false, error: "Plan doesn't exist, please check" });
  }

  let hashedPassword = password;
  if (!hashedPassword) {
    hashedPassword = await bcrypt.hash("mediplus", 10);
  }

  const updatedCompany = await User.findByIdAndUpdate(
    id,
    {
      dob,
      idNumber,
      idType,
      address,
      contact1,
      contact2,
      email,
      enrolmentDate,
      memberShipID,
      firstName,
      gender,
      lastName,
      monthlyFee,
      plan,
      relation,
      role: 8,
      avatar,
      userType: 8,
      status,
      password: hashedPassword,
      user: req.user.id,
    },
    { new: true }
  );

  if (!updatedCompany) {
    return next(new ErrorResponse("Service not found", 404));
  }

  res.status(200).json({
    success: true,
    company: updatedCompany,
  });
});


exports.getAllIndividualCustomer2 = async (req, res, next) => {
  const pageSize = Number(req.query.pageSize) || 10;
  const page = Number(req.query.pageNumber) || 1;
  const searchTerm = req.query.searchTerm; // Extract searchTerm from query params

  try {
    let query = { userType: 5 };

    if (searchTerm) {
      // Modify the query to include search conditions
      query = {
        $and: [
          { userType: 5 },
          {
            $or: [
              { firstName: { $regex: searchTerm, $options: "i" } },
              { lastName: { $regex: searchTerm, $options: "i" } },
              { enrolmentDate: { $regex: searchTerm, $options: "i" } },
              { idNumber: { $regex: searchTerm, $options: "i" } },
              { contact1: { $regex: searchTerm, $options: "i" } },
              { contact2: { $regex: searchTerm, $options: "i" } },
              { memberShipID: { $regex: searchTerm, $options: "i" } },
            ],
          },
        ],
      };
    }

    const count = await User.countDocuments(query);

    const userIndividual = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password")
      .populate("plan")
      .populate({
        path: "user",
        select: "-password",
      })
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.status(200).json({
      success: true,
      userIndividual,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    return next(error);
  }
};

const fs = require("fs");
const path = require("path");

exports.deleteFile2 = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const fileName = req.body.file; // Assuming the file name is passed in the request body

    // Check if the user ID and file name are provided
    if (!userId || !fileName) {
      return res.status(400).json({
        success: false,
        message: "User ID and file name are required",
      });
    }

    try {
      // Remove the file entry from the User table
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Remove the file name from the user's file string
      const files = user.multipleFiles.split(",");
      const fileIndex = files.indexOf(fileName);
      if (fileIndex !== -1) {
        files.splice(fileIndex, 1);
        user.multipleFiles = files.join(",");
        await user.save();
      }

      res.status(200).json({
        success: true,
        message: "File deleted",
      });
    } catch (error) {
      console.error("Error deleting file from User table:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete the file from the User table",
      });
    }
  } catch (error) {
    return next(error);
  }
};
