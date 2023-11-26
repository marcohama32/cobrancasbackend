const Company = require("../../models/companyModel");
const Plan = require("../../models/planModel");
const User = require("../../models/userModel");
const ErrorResponse = require("../../utils/errorResponse");
const asyncHandler = require("../../middleware/asyncHandler");
const bcrypt = require("bcrypt");

// upload files

exports.uploadSingleFile = async (req, res, next) => {
  try {
    const id = req.params.id;
    // const files = req.files;
    if (req.file) {
      avatar = req.file.path;
    }
    const fileUpload = await User.findByIdAndUpdate(
      id,
      {
        avatar,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      avatar: avatar, // Return the uploaded files in the response
      file: fileUpload,
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadMultipleFiles = async (req, res, next) => {
  try {
    const id = req.params.id;
    const existingUser = await User.findById(id);

    if (!req.files || req.files.length === 0) {
      res.status(400).json({
        success: false,
        error: "No files were uploaded",
      });
      return;
    }

    const newFiles = req.files.map((file) => file.path.replace(/\\/g, "/"));

    let multipleFiles = existingUser.multipleFiles || ""; // Set default value as empty string if multipleFiles is undefined or null

    if (multipleFiles) {
      multipleFiles += ",";
    }

    multipleFiles += newFiles.join(",");

    const fileUpload = await User.findByIdAndUpdate(
      id,
      { multipleFiles },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      multipleFiles: fileUpload.multipleFiles,
      file: fileUpload,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

//create IndividualCustomer
exports.createIndividualUser = asyncHandler(async (req, res, next) => {
  try {
    const {
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
      manager,
      gender,
      lastName,
      monthlyFee,
      plan,
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
      enrolmentDate,
      memberShipID,
      firstName,
      manager,
      gender,
      lastName,
      monthlyFee,
      plan,
    ];

    if (requiredFields.some((field) => !field)) {
      return next(new ErrorResponse("Fields cannot be null", 400));
    }
    // Check if contact is a valid number
    if (isNaN(contact1) || isNaN(contact2) || isNaN(monthlyFee)) {
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

    const existingPlan = await Plan.findById(plan);
    if (!existingPlan) {
      return next(new ErrorResponse("Plan doesn't exist, please check", 400));
    }

    const avatar = req.file?.path;

    let hashedPassword = password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const customer = await User.create({
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
      manager,
      monthlyFee,
      plan,
      relation: "Main",
      role: 5,
      avatar,
      userType: 5,
      password: hashedPassword,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      customer,
    });
  } catch (error) {
    next(error);
  }
});

//update Company
exports.editIndividualUser = asyncHandler(async (req, res, next) => {
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
    enrolmentDate,
    memberShipID,
    firstName,
    manager,
    gender,
    lastName,
    monthlyFee,
    plan,
    status,
    relation,
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
    enrolmentDate,
    memberShipID,
    firstName,
    manager,
    gender,
    lastName,
    monthlyFee,
    plan,
    status,
    relation,
  ];

  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Fields cannot be null", 400));
  }
  // Check if contact is a valid number
  if (isNaN(contact1) || isNaN(contact2) || isNaN(monthlyFee)) {
    return next(new ErrorResponse("Contact must be a number", 400));
  }

  // Check if plan  exists for the given plan
  // console.log(plan)
  // Check if serviceName already exists for the given plan
  if (!(await Plan.exists({ _id: plan }))) {
    return next(new ErrorResponse("Plan doesn't exist, please check", 400));
  }

  let hashedPassword = password;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
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
      manager,
      gender,
      lastName,
      monthlyFee,
      plan,
      relation,
      role: 5,
      avatar,
      userType: 5,
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


exports.getAllIndividualCustomer = async (req, res, next) => {
  let pageSize = Number(req.query.pageSize) || 10;
  let page = Number(req.query.pageNumber) || 1;
  const searchTerm = req.query.searchTerm;
  // Parse the date range parameters from the request query
  const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
  const endDateParam = req.query.endDate; // Format: YYYY-MM-DD
  
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
    let query = { $or: [{ userType: 5 }, { userType: 8 }] }; // Users with userType 5 or 8

    if (searchTerm) {
      query = {
        $and: [
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

      if (startDateParam && endDateParam) {
        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);
        if (!isNaN(startDate) && !isNaN(endDate) && startDate <= endDate) {
          // Only add date range criteria if startDate and endDate are valid dates
          query.createdAt = {
            $gte: startDate,
            $lte: endDate,
          };
        }
      }

      const dateSearch = new Date(searchTerm);
      if (!isNaN(dateSearch)) {
        query.$and.push({ enrolmentDate: dateSearch });
      }
    }

    const count = await User.countDocuments(query);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password")
      .populate({
        path: "accountOwner",
        populate: {
          path: "manager",
          select: "firstName lastName email",
        },
      })
      .populate({
        path: "plan",
        populate: {
          path: "planService",
          model: "PlanServices",
        },
      })
      .populate("manager")
      .populate({
        path: "user",
        select: "firstName lastName email",
      })
      .populate("myMembers")
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    // Calculate updated remaining balance for each service in the user's planService
    const usersWithUpdatedBalance = users.map((user) => {
      user.planService.forEach((service) => {
        service.remainingBalance = service.calculateRemainingBalance();
      });
      return user;
    });

    res.status(200).json({
      success: true,
      users: usersWithUpdatedBalance,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    return next(error);
  }
};

// get all individual customer for a manager:
exports.getAllIndividualCustomerManager1 = async (req, res, next) => {
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
    let query = { $or: [{ userType: 5 }, { userType: 8 }] }; // Users with userType 5 or 8

    if (searchTerm) {
      query = {
        $and: [
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
      .select("-password")
      .populate({
        path: "accountOwner",
        populate: {
          path: "manager",
          select: "firstName lastName email",
        },
      })
      .populate({
        path: "plan",
        populate: {
          path: "planService",
          model: "PlanServices",
        },
      })
      .populate({
        path: "manager",
        select: "firstName lastName email",
        populate: {
          path: "lineManager",
          model: "User",
          select: "firstName lastName email",
        },
      })
      .populate("myMembers")
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    // Calculate updated remaining balance for each service in the user's planService
    const usersWithUpdatedBalance = users.map((user) => {
      user.planService.forEach((service) => {
        service.remainingBalance = service.calculateRemainingBalance();
      });
      return user;
    });

    res.status(200).json({
      success: true,
      users: usersWithUpdatedBalance,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    return next(error);
  }
};

// ----------------------------------------------Manager-----------------------------------------------

exports.getAllIndividualCustomerManagerByManagerID = async (req, res, next) => {
  const managerId = req.params.id; // Get managerId from the route parameter
  let pageSize = Number(req.query.pageSize) || 10;
  let page = Number(req.query.pageNumber) || 1;
  const searchTerm = req.query.searchTerm;
  // Parse the date range parameters from the request query
  const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
  const endDateParam = req.query.endDate; // Format: YYYY-MM-DD
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
    let query = {
      $and: [
        { $or: [{ userType: 5 }, { userType: 8 }] }, // Users with userType 5 or 8
        {
          $or: [
            { manager: managerId }, // Users with the specified manager
            // { lineManager: managerId }, // Users with the specified line manager
          ],
        },
      ],
    };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$and.push({
        $or: [
          { firstName: { $regex: searchTerm, $options: "i" } },
          { lastName: { $regex: searchTerm, $options: "i" } },
          { idNumber: { $regex: searchTerm, $options: "i" } },
          { contact1: { $regex: searchTerm, $options: "i" } },
          { contact2: { $regex: searchTerm, $options: "i" } },
          { memberShipID: { $regex: searchTerm, $options: "i" } },
          { relation: { $regex: searchTerm, $options: "i" } },
        ],
      });
    }
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      if (!isNaN(startDate) && !isNaN(endDate) && startDate <= endDate) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    const count = await User.countDocuments(query);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password")
      .populate({
        path: "accountOwner",
        populate: {
          path: "manager",
          select: "firstName lastName email",
        },
      })
      .populate({
        path: "plan",
        populate: {
          path: "planService",
          model: "PlanServices",
        },
      })
      .populate({
        path: "manager",
        select: "firstName lastName email",
        populate: {
          path: "lineManager",
          model: "User",
          select: "firstName lastName email",
        },
      })
      .populate("myMembers")
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    // Calculate updated remaining balance for each service in the user's planService
    const usersWithUpdatedBalance = users.map((user) => {
      user.planService.forEach((service) => {
        service.remainingBalance = service.calculateRemainingBalance();
      });
      return user;
    });

    res.status(200).json({
      success: true,
      users: usersWithUpdatedBalance,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    return next(error);
  }
};

// get All Individual Customer Manager By Loged Manager our Agent  const managerId = req.user.id;
exports.getAllIndividualCustomerManagerByLogedManager = async (
  req,
  res,
  next
) => {
  const managerId = req.user.id; // Get managerId from the route parameter
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
    let query = {
      $and: [
        { $or: [{ userType: 5 }, { userType: 8 }] }, // Users with userType 5 or 8
        {
          $or: [
            { manager: managerId }, // Users with the specified manager
            // { lineManager: managerId }, // Users with the specified line manager
          ],
        },
      ],
    };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$and.push({
        $or: [
          { firstName: { $regex: searchTerm, $options: "i" } },
          { lastName: { $regex: searchTerm, $options: "i" } },
          { idNumber: { $regex: searchTerm, $options: "i" } },
          { contact1: { $regex: searchTerm, $options: "i" } },
          { contact2: { $regex: searchTerm, $options: "i" } },
          { memberShipID: { $regex: searchTerm, $options: "i" } },
          { relation: { $regex: searchTerm, $options: "i" } },
        ],
      });
    }

    const count = await User.countDocuments(query);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password")
      .populate({
        path: "accountOwner",
        populate: {
          path: "manager",
          select: "firstName lastName email",
        },
      })
      .populate({
        path: "plan",
        populate: {
          path: "planService",
          model: "PlanServices",
        },
      })
      .populate({
        path: "manager",
        select: "firstName lastName email",
        populate: {
          path: "lineManager",
          model: "User",
          select: "firstName lastName email",
        },
      })
      .populate("myMembers")
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    // Calculate updated remaining balance for each service in the user's planService
    const usersWithUpdatedBalance = users.map((user) => {
      user.planService.forEach((service) => {
        service.remainingBalance = service.calculateRemainingBalance();
      });
      return user;
    });

    res.status(200).json({
      success: true,
      users: usersWithUpdatedBalance,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    return next(error);
  }
};

// get All Individual Customer Manager By Loged Manager our Agent  const managerId = req.user.id;
exports.getAllCorporateCustomerManagerByLogedManager = async (req,res,next) => {
  const managerId = req.user.id; // Get managerId from the route parameter
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
    let query = {
      $and: [
        { $or: [{ userType: 4 }, { userType: 7 }] }, // Users with userType 5 or 8
        {
          $or: [
            { manager: managerId }, // Users with the specified manager
            // { lineManager: managerId }, // Users with the specified line manager
          ],
        },
      ],
    };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$and.push({
        $or: [
          { firstName: { $regex: searchTerm, $options: "i" } },
          { lastName: { $regex: searchTerm, $options: "i" } },
          { idNumber: { $regex: searchTerm, $options: "i" } },
          { contact1: { $regex: searchTerm, $options: "i" } },
          { contact2: { $regex: searchTerm, $options: "i" } },
          { memberShipID: { $regex: searchTerm, $options: "i" } },
          { relation: { $regex: searchTerm, $options: "i" } },
        ],
      });
    }

    const count = await User.countDocuments(query);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password")
      .populate({
        path: "accountOwner",
        populate: {
          path: "manager",
          select: "firstName lastName email",
        },
      })
      .populate({
        path: "plan",
        populate: {
          path: "planService",
          model: "PlanServices",
        },
      })
      .populate({
        path: "manager",
        select: "firstName lastName email",
        populate: {
          path: "lineManager",
          model: "User",
          select: "firstName lastName email",
        },
      })
      .populate("myMembers")
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    // Calculate updated remaining balance for each service in the user's planService
    const usersWithUpdatedBalance = users.map((user) => {
      user.planService.forEach((service) => {
        service.remainingBalance = service.calculateRemainingBalance();
      });
      return user;
    });

    res.status(200).json({
      success: true,
      users: usersWithUpdatedBalance,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getAllCorporateCustomerManagerByManagerID = async (req, res, next) => {
  const managerId = req.params.id; // Get managerId from the route parameter
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
    let query = {
      $and: [
        { $or: [{ userType: 4 }, { userType: 7 }] }, // Users with userType 5 or 8
        {
          $or: [
            { manager: managerId }, // Users with the specified manager
            // { lineManager: managerId }, // Users with the specified line manager
          ],
        },
      ],
    };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$and.push({
        $or: [
          { firstName: { $regex: searchTerm, $options: "i" } },
          { lastName: { $regex: searchTerm, $options: "i" } },
          { idNumber: { $regex: searchTerm, $options: "i" } },
          { contact1: { $regex: searchTerm, $options: "i" } },
          { contact2: { $regex: searchTerm, $options: "i" } },
          { memberShipID: { $regex: searchTerm, $options: "i" } },
          { relation: { $regex: searchTerm, $options: "i" } },
        ],
      });
    }

    const count = await User.countDocuments(query);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password")
      .populate({
        path: "accountOwner",
        populate: {
          path: "manager",
          select: "firstName lastName email",
        },
      })
      .populate({
        path: "plan",
        populate: {
          path: "planService",
          model: "PlanServices",
        },
      })
      .populate({
        path: "manager",
        select: "firstName lastName email",
        populate: {
          path: "lineManager",
          model: "User",
          select: "firstName lastName email",
        },
      })
      .populate("myMembers")
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    // Calculate updated remaining balance for each service in the user's planService
    const usersWithUpdatedBalance = users.map((user) => {
      user.planService.forEach((service) => {
        service.remainingBalance = service.calculateRemainingBalance();
      });
      return user;
    });

    res.status(200).json({
      success: true,
      users: usersWithUpdatedBalance,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    return next(error);
  }
};

// brings all customers from a especific manager
exports.getAllIndividualCorporateCustomerManagerByManagerID = async (
  req,
  res,
  next
) => {
  const managerId = req.params.id; // Get managerId from the route parameter
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
    let query = {
      $and: [
        {
          $or: [
            { userType: 4 },
            { userType: 7 },
            { userType: 5 },
            { userType: 8 },
          ],
        }, // Users with userType 5 or 8
        {
          $or: [
            { manager: managerId }, // Users with the specified manager
            // { lineManager: managerId }, // Users with the specified line manager
          ],
        },
      ],
    };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$and.push({
        $or: [
          { firstName: { $regex: searchTerm, $options: "i" } },
          { lastName: { $regex: searchTerm, $options: "i" } },
          { idNumber: { $regex: searchTerm, $options: "i" } },
          { contact1: { $regex: searchTerm, $options: "i" } },
          { contact2: { $regex: searchTerm, $options: "i" } },
          { memberShipID: { $regex: searchTerm, $options: "i" } },
          { relation: { $regex: searchTerm, $options: "i" } },
        ],
      });
    }

    const count = await User.countDocuments(query);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password")
      .populate({
        path: "accountOwner",
        populate: {
          path: "manager",
          select: "firstName lastName email",
        },
      })
      .populate({
        path: "plan",
        populate: {
          path: "planService",
          model: "PlanServices",
        },
      })
      .populate({
        path: "manager",
        select: "firstName lastName email",
        populate: {
          path: "lineManager",
          model: "User",
          select: "firstName lastName email",
        },
      })
      .populate("myMembers")
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    // Calculate updated remaining balance for each service in the user's planService
    const usersWithUpdatedBalance = users.map((user) => {
      user.planService.forEach((service) => {
        service.remainingBalance = service.calculateRemainingBalance();
      });
      return user;
    });

    res.status(200).json({
      success: true,
      users: usersWithUpdatedBalance,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    return next(error);
  }
};

// brings all customers from a loged manager
// Bring all customers from a logged manager including both manager and line manager
exports.getAllIndividualCorporateCustomerByLogedManager1 = async (req, res, next) => {
  try {
    const managerId = req.user.id;
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;
    const searchTerm = req.query.searchTerm;

    if (pageSize <= 0 || page <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid pageSize or pageNumber. Both must be greater than 0",
      });
    }

    // Define the base query
    const baseQuery = {
      $and: [
        {
          $or: [{ userType: 4 }, { userType: 7 }, { userType: 5 }, { userType: 8 }],
        },
        {
          $or: [{ manager: managerId }],
        },
      ],
    };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      baseQuery.$and.push({
        $or: [
          { firstName: { $regex: searchTerm, $options: "i" } },
          { lastName: { $regex: searchTerm, $options: "i" } },
          { idNumber: { $regex: searchTerm, $options: "i" } },
          { contact1: { $regex: searchTerm, $options: "i" } },
          { contact2: { $regex: searchTerm, $options: "i" } },
          { memberShipID: { $regex: searchTerm, $options: "i" } },
          { relation: { $regex: searchTerm, $options: "i" } },
        ],
      });
    }

    // Find users that match the base query
    const users = await User.find(baseQuery)
      .sort({ createdAt: -1 })
      .select("-password")
      .populate({
        path: "accountOwner",
        populate: {
          path: "manager",
          select: "firstName lastName email",
        },
      })
      .populate({
        path: "plan",
        populate: {
          path: "planService",
          model: "PlanServices",
        },
      })
      .populate({
        path: "manager",
        select: "firstName lastName email",
        populate: {
          path: "lineManager",
          model: "User",
          select: "firstName lastName email",
        },
      })
      .populate("myMembers")
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    // Calculate updated remaining balance for each service in the user's planService
    const usersWithUpdatedBalance = users.map((user) => {
      user.planService.forEach((service) => {
        service.remainingBalance = service.calculateRemainingBalance();
      });
      return user;
    });

    res.status(200).json({
      success: true,
      users: usersWithUpdatedBalance,
      page,
      pages: Math.ceil(users.length / pageSize),
      count: users.length,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getAllIndividualCorporateCustomerByLogedManager = async (req, res, next) => {
  console.log("Here");
  const managerId = req.user.id; // Get managerId from the route parameter
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
    let query = {
      $and: [
        { $or: [{ userType: 4 }, { userType: 7 }, { userType: 5 }, { userType: 8 }] },
        {
          $or: [
            { manager: managerId }, // Users with the specified manager
          ],
        },
      ],
    };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$and.push({
        $or: [
          { firstName: { $regex: searchTerm, $options: "i" } },
          { lastName: { $regex: searchTerm, $options: "i" } },
          { idNumber: { $regex: searchTerm, $options: "i" } },
          { contact1: { $regex: searchTerm, $options: "i" } },
          { contact2: { $regex: searchTerm, $options: "i" } },
          { memberShipID: { $regex: searchTerm, $options: "i" } },
          { relation: { $regex: searchTerm, $options: "i" } },
        ],
      });
    }

    const count = await User.countDocuments(query);

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select("-password")
      .populate({
        path: "accountOwner",
        populate: {
          path: "manager",
          select: "firstName lastName email",
        },
      })
      .populate({
        path: "plan",
        populate: {
          path: "planService",
          model: "PlanServices",
        },
      })
      .populate({
        path: "manager",
        select: "firstName lastName email",
        populate: {
          path: "lineManager",
          model: "User",
          select: "firstName lastName email",
        },
      })
      .populate("myMembers")
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    // Create a new array to store the flattened users
    const flattenedUsers = [];

    // Iterate through the users and add the main user and their myMembers to the flattenedUsers
    users.forEach((user) => {
      flattenedUsers.push(user); // Add the main user
      if (user.myMembers.length > 0) {
        flattenedUsers.push(...user.myMembers); // Add myMembers if present
      }
    });

    // Calculate updated remaining balance for each service in the user's planService
    const usersWithUpdatedBalance = flattenedUsers.map((user) => {
      user.planService.forEach((service) => {
        service.remainingBalance = service.calculateRemainingBalance();
      });
      return user;
    });

    res.status(200).json({
      success: true,
      users: usersWithUpdatedBalance,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    return next(error);
  }
};



// ----------------------------------------------Agent-----------------------------------------------

const fs = require("fs");
const path = require("path");

exports.deleteFile = async (req, res, next) => {
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
