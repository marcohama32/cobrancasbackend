const Plan = require("../../models/planModel");
const User = require("../../models/userModel");
const ErrorResponse = require("../../utils/errorResponse");
const asyncHandler = require("../../middleware/asyncHandler");

//create IndividualCustomer
exports.createEmployerUser = asyncHandler(async (req, res, next) => {
  try {
    const {
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
      password,
    } = req.body;

    const requiredFields = [
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
    ];

    if (requiredFields.some((field) => !field)) {
      return next(new ErrorResponse("Fields cannot be null", 400));
    }
    // Check if contact is a valid number
    if (isNaN(contact1) || isNaN(contact2)) {
      return next(new ErrorResponse("Validate all fields", 400));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(
        new ErrorResponse("User with the same data already exists", 400)
      );
    }
    const existingUserByMemberShipID = await User.findOne({ memberShipID });
    if (existingUserByMemberShipID) {
      return res.status(400).json({
        success: false,
        error: "User with the same memberShipID already exists",
      });
    }

    const avatar = req.file?.path;

    const employer = await User.create({
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
      password,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      employer,
    });
  } catch (error) {
    next(error);
  }
});

//update Company
exports.editEmployer = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  const avatar = req.file?.path;

  const {
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
    password,
  } = req.body;
  relation = "Main";

  const requiredFields = [
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
  ];

  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Fields cannot be null", 400));
  }
  // Check if contact is a valid number
  if (isNaN(contact1) || isNaN(contact2)) {
    return next(new ErrorResponse("Contact must be a number", 400));
  }

  const updatedEmployer = await User.findByIdAndUpdate(
    id,
    {
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
      password,
      user: req.user.id,
    },
    { new: true }
  );

  if (!updatedEmployer) {
    return next(new ErrorResponse("Service not found", 404));
  }

  res.status(200).json({
    success: true,
    company: updatedEmployer,
  });
});

exports.getAllEmployer = async (req, res, next) => {
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
    let query = { role: { $in: [1,2,3] } }; // Include users with userType 1, 2, or 3

    if (searchTerm) {
      query = {
        $and: [
          { role: { $in: [1,2,3] } }, // Include users with userType 1, 2, or 3
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
      .select("firstName lastName idType idNumber dob gender email address contact1 contact2 manager password userType role avatar status")
      .populate({
        path:"lineManager",
        select: "firstName lastName email contact1 contact2 avatar _id"
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


exports.getAllActiveAgents = async (req, res, next) => {
  const pageSize = Number(req.query.pageSize) || 10;
  const page = Number(req.query.pageNumber) || 1;
  const searchTerm = req.query.searchTerm;

  try {
    // Create a base query with the userType condition
    let query = { userType: 3, status: "Active" };

    if (searchTerm) {
      // Escape any special characters in the search term
      const escapedSearchTerm = escapeRegExp(searchTerm);
      // Modify the query to include search conditions with case-insensitive regular expressions
      query = {
        $and: [
          { userType: 3 },
          {
            $or: [
              { firstName: { $regex: new RegExp(escapedSearchTerm, "i") } },
              { lastName: { $regex: new RegExp(escapedSearchTerm, "i") } },
              { idNumber: { $regex: new RegExp(escapedSearchTerm, "i") } },
              { contact1: { $regex: new RegExp(escapedSearchTerm, "i") } },
              { contact2: { $regex: new RegExp(escapedSearchTerm, "i") } },
            ],
          },
        ],
      };
    }

    const count = await User.countDocuments(query);

    const employer = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password")
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.status(200).json({
      success: true,
      employer,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    // Pass the error to the Express error handling middleware
    return next(error);
  }
};

exports.getAllActiveManagers = async (req, res, next) => {
  const pageSize = Number(req.query.pageSize) || 10;
  const page = Number(req.query.pageNumber) || 1;
  const searchTerm = req.query.searchTerm;

  try {
    // Create a base query with the userType condition
    let query = { userType: 2, status: "Active" };

    if (searchTerm) {
      // Escape any special characters in the search term
      const escapedSearchTerm = escapeRegExp(searchTerm);
      // Modify the query to include search conditions with case-insensitive regular expressions
      query = {
        $and: [
          { userType: 2 },
          {
            $or: [
              { firstName: { $regex: new RegExp(escapedSearchTerm, "i") } },
              { lastName: { $regex: new RegExp(escapedSearchTerm, "i") } },
              { idNumber: { $regex: new RegExp(escapedSearchTerm, "i") } },
              { contact1: { $regex: new RegExp(escapedSearchTerm, "i") } },
              { contact2: { $regex: new RegExp(escapedSearchTerm, "i") } },
            ],
          },
        ],
      };
    }

    const count = await User.countDocuments(query);

    const employer = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password")
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.status(200).json({
      success: true,
      employer,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    // Pass the error to the Express error handling middleware
    return next(error);
  }
};

exports.getAllActiveAdmins = async (req, res, next) => {
  const pageSize = Number(req.query.pageSize) || 10;
  const page = Number(req.query.pageNumber) || 1;
  const searchTerm = req.query.searchTerm;

  try {
    // Create a base query with the userType condition
    let query = { userType: 1, status: "Active" };

    if (searchTerm) {
      // Escape any special characters in the search term
      const escapedSearchTerm = escapeRegExp(searchTerm);
      // Modify the query to include search conditions with case-insensitive regular expressions
      query = {
        $and: [
          { userType: 1 },
          {
            $or: [
              { firstName: { $regex: new RegExp(escapedSearchTerm, "i") } },
              { lastName: { $regex: new RegExp(escapedSearchTerm, "i") } },
              { idNumber: { $regex: new RegExp(escapedSearchTerm, "i") } },
              { contact1: { $regex: new RegExp(escapedSearchTerm, "i") } },
              { contact2: { $regex: new RegExp(escapedSearchTerm, "i") } },
            ],
          },
        ],
      };
    }

    const count = await User.countDocuments(query);

    const employer = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password")
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.status(200).json({
      success: true,
      employer,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    // Pass the error to the Express error handling middleware
    return next(error);
  }
};
