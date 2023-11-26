const Partner = require("../models/partnerModel");
const User = require("../models/userModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/asyncHandler");
const { escapeRegExp } = require("lodash");

//create service
exports.createPartner = asyncHandler(async (req, res, next) => {
  try {
    const avatar = req.file?.path;
    const {
      partnerName,
      partnerLocation,
      partnerBusiness,
      contact1,
      contact2,
      email,
      enrolmentDate,
    } = req.body;

    if (
      !partnerName ||
      !partnerLocation ||
      !partnerBusiness ||
      !contact1 ||
      !contact2
    ) {
      return next(new ErrorResponse("Fields cannot be null", 400));
    }

    // Check if contact is a valid number
    if (isNaN(contact1) || isNaN(contact2)) {
      return next(new ErrorResponse("Contact must be a number", 400));
    }

    // Check if serviceName already exists for the given plan
    const existingPartner = await Partner.findOne({ partnerName });
    if (existingPartner) {
      return next(new ErrorResponse("Partner already exists", 400));
    }

    const partner = await Partner.create({
      partnerName,
      partnerLocation,
      partnerBusiness,
      enrolmentDate,
      contact1,
      contact2,
      avatar,
      email,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      partner,
    });
  } catch (error) {
    next(error);
  }
});

//find company by id
exports.singlePartner = asyncHandler(async (req, res, next) => {
  try {
    const partner = await Partner.findById(req.params.partner_id).populate(
      "user"
    );

    if (!partner) {
      return next(new ErrorResponse("Partner not found", 404));
    }

    res.status(200).json({
      success: true,
      partner,
    });
  } catch (error) {
    next(error);
  }
});

//update Company
exports.updatedPartner = asyncHandler(async (req, res, next) => {
  const avatar = req.file?.path;
  const id = req.params.id;
  const {
    partnerName,
    partnerLocation,
    partnerBusiness,
    contact1,
    contact2,
    email,
    enrolmentDate,
    status,
  } = req.body;

  if (
    !partnerName ||
    !partnerLocation ||
    !partnerBusiness ||
    !contact1 ||
    !contact2 ||
    !enrolmentDate ||
    !email
  ) {
    return next(new ErrorResponse("Fields cannot be null", 400));
  }

  // Check if contact is a valid number
  if (isNaN(contact1) || isNaN(contact2)) {
    return next(new ErrorResponse("Contact must be a number", 400));
  }

  const updatedPartner = await Partner.findByIdAndUpdate(
    id,
    {
      partnerName,
      partnerLocation,
      partnerBusiness,
      contact1,
      contact2,
      avatar,
      email,
      enrolmentDate,
      status,
    },
    { new: true }
  );

  if (!updatedPartner) {
    return next(new ErrorResponse("Partner not found", 404));
  }

  res.status(200).json({
    success: true,
    partner: updatedPartner,
  });
});

//Get all partner
exports.getAllPartner = async (req, res, next) => {
  // Enable pagination
  const pageSize = Number(req.query.pageSize) || 5;
  const page = Number(req.query.pageNumber) || 1;
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

  let query = {};
  if (searchTerm) {
    query = {
      $or: [
        { partnerName: { $regex: searchTerm, $options: "i" } },
        { contact1: { $regex: searchTerm, $options: "i" } },
        // Add other fields you want to search here
      ],
    };
  }

  try {
    const count = await Partner.countDocuments(query);

    const partner = await Partner.find(query)
      .populate("user")
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.status(200).json({
      success: true,
      page,
      partner,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    next(error);
  }
};

//delete plan
exports.deletePartner = asyncHandler(async (req, res, next) => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id);

    if (!partner) {
      return next(new ErrorResponse("Company not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Partner deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

//create partner User
exports.createPartnerUser = asyncHandler(async (req, res, next) => {
  try {
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
      profile,
      contact1,
      contact2,
      id,
    } = req.body;

    // Check if any of the required fields are missing
    if (
      !firstName ||
      !lastName ||
      !idType ||
      !idNumber ||
      !dob ||
      !gender ||
      !email ||
      !address ||
      !profile ||
      !contact1 ||
      !contact2 ||
      !id
    ) {
      return next(new ErrorResponse("Fields cannot be null", 400));
    }

    // Check if contact1 and contact2 are valid numbers
    if (isNaN(contact1) || isNaN(contact2)) {
      return next(new ErrorResponse("Contact must be a number", 400));
    }

    // Check if the partner with the given 'id' exists and is not inactive
    const existingPartner = await Partner.findById(id);

    if (!existingPartner) {
      return next(new ErrorResponse("Partner not found", 404));
    }

    if (existingPartner.status === "Inactive") {
      return next(new ErrorResponse("Partner is inactive", 400));
    }
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return next(new ErrorResponse("Email address is already in use", 400));
    }

    // Create the partneruser user
    const partneruser = await User.create({
      firstName,
      lastName,
      idType,
      idNumber,
      dob,
      gender,
      email,
      address,
      profile,
      contact1,
      contact2,
      partnerUser: id,
      avatar,
      userType: 6,
      role: 6,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      partneruser,
    });
  } catch (error) {
    next(error);
  }
});

//Get all partner Users
exports.getAllPartnerUsers = async (req, res, next) => {
  // Enable pagination
  const pageSize = Number(req.query.pageSize) || 16; // Change the pageSize to 16
  const page = Number(req.query.pageNumber) || 1;
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

  let query = { userType: 6 };

  if (searchTerm) {
    query = {
      $and: [
        { userType: 6 },
        {
          $or: [
            { firstName: { $regex: searchTerm, $options: "i" } },
            { lastName: { $regex: searchTerm, $options: "i" } },
            { idNumber: { $regex: searchTerm, $options: "i" } },
            { contact1: { $regex: searchTerm, $options: "i" } },
            { contact2: { $regex: searchTerm, $options: "i" } },

            // Add other fields you want to search here
          ],
        },
      ],
    };
  }

  try {
    const count = await User.countDocuments(query);

    const partneruser = await User.find(query)
      .populate("user")
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.status(200).json({
      success: true,
      page,
      partneruser,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    next(error);
  }
};

//Get all partner Users
exports.getUsersByPartner = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const searchTerm = req.query.searchTerm;

    // Enable pagination
    const pageSize = Number(req.query.pageSize) || 15; // Change pageSize to 15
    const page = Number(req.query.pageNumber) || 1;

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

    const query = { partnerUser: id, userType: 6 };

    if (searchTerm) {
      // Escape any special characters in the search term
      const escapedSearchTerm = escapeRegExp(searchTerm);
      const searchRegex = new RegExp(escapedSearchTerm, "i");

      // Modify the query to include search conditions with case-insensitive regular expressions
      query.$and = [
        { $or: [{ firstName: searchRegex }, { lastName: searchRegex }] },
        { partnerUser: id, userType: 6 },
      ];
    }

    const count = await User.countDocuments(query);

    const allUsers = await User.find(query)
      .populate("partnerUser")
      .populate({ path: "user", select: "firstName lastName email" })
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.status(200).json({
      success: true,
      page,
      allUsers,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    next(error);
  }
});


//find company user by id
exports.singlePartnerUser = asyncHandler(async (req, res, next) => {
  try {
    const partneruser = await User.findById(req.params.id);

    if (!partneruser) {
      return next(new ErrorResponse("User not found", 404));
    }

    res.status(200).json({
      success: true,
      partneruser,
    });
  } catch (error) {
    next(error);
  }
});

exports.updatedPartnerUser = asyncHandler(async (req, res, next) => {
  const avatar = req.file?.path;
  const id = req.params.id;
  const {
    firstName,
    lastName,
    idType,
    idNumber,
    dob,
    gender,
    email,
    address,
    profile,
    contact1,
    contact2,
    status,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !idType ||
    !idNumber ||
    !dob ||
    !gender ||
    !email ||
    !address ||
    !profile ||
    !contact1
  ) {
    return next(new ErrorResponse("Fields cannot be null", 400));
  }

  // Check if contact is a valid number
  if (isNaN(contact1) || isNaN(contact2)) {
    return next(new ErrorResponse("Contact must be a number", 400));
  }
  //  const userType = 6
  //  const role = 6
  const updatedPartnerUser = await User.findByIdAndUpdate(
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
      profile,
      contact1,
      contact2,
      avatar,
      status,
      // userType,
      // role,
    },
    { new: true }
  );

  if (!updatedPartnerUser) {
    return next(new ErrorResponse("Partner not found", 404));
  }

  res.status(200).json({
    success: true,
    partner: updatedPartnerUser,
  });
});



