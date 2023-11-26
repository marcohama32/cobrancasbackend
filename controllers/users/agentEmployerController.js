const Company = require("../../models/companyModel");
const Plan = require("../../models/planModel");
const User = require("../../models/userModel");
const ErrorResponse = require("../../utils/errorResponse");
const asyncHandler = require("../../middleware/asyncHandler");
const bcrypt = require("bcrypt");

//create agent
exports.createAgentUser = asyncHandler(async (req, res, next) => {
  try {
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
      lineManager,
      password,
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
      lineManager,
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

    const existingManager = await User.findById(lineManager);
    if (!existingManager) {
      return next(
        new ErrorResponse("Manager doesn't exist, please check", 400)
      );
    }

    if (existingManager.status === "Inactive") {
      return next(new ErrorResponse("This Manager is inactive", 400));
    }

    const avatar = req.file?.path;

    // Use the same hashing logic as in the model's pre-save hook
    let hashedPassword = password;
    if (!hashedPassword) {
      hashedPassword = await bcrypt.hash("mediplus", 10);
    }

    const customer = await User.create({
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
      lineManager,
      role: 3,
      avatar,
      userType: 3,
      password: hashedPassword, // Use the hashed password
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

//update agent
exports.updatedAgent = asyncHandler(async (req, res, next) => {
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
    lineManager,
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
    lineManager,
  ];

  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Fields cannot be null", 400));
  }
  // Check if contact is a valid number
  if (isNaN(contact1) || isNaN(contact2)) {
    return next(new ErrorResponse("Contact must be a number", 400));
  }

  const existingManager = await User.findById(lineManager);
  if (!existingManager) {
    return next(new ErrorResponse("Manager doesn't exist, please check", 400));
  }

  if (existingManager.status === "Inactive") {
    return next(new ErrorResponse("This Manager is inactive", 400));
  }

  let hashedPassword = password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

  const updatedCompany = await User.findByIdAndUpdate(
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
      lineManager,
      role: 3,
      avatar,
      password: hashedPassword,
      userType: 3,
      status,
      user: req.user.id,
    },
    { new: true }
  );

  if (!updatedCompany) {
    return next(new ErrorResponse("User not found", 404));
  }

  res.status(200).json({
    success: true,
    company: updatedCompany,
  });
});

//get all agents
exports.getAllAgentUser = async (req, res, next) => {
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
    let query = { role: { $in: [3] } }; // Include users with userType 1, 2, or 3

    if (searchTerm) {
      query = {
        $and: [
          { role: { $in: [3] } }, // Include users with userType 1, 2, or 3
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

// get all agents from a manager
exports.getAllAgentsFromManagerByManagerID = async (
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
            { userType: 3 }
          ],
        }, // Users with userType 5 or 8
        {
          $or: [
            { lineManager: managerId }, // Users with the specified manager
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
        path: "lineManager",
        select: "firstName lastName email",
        // populate: {
        //   path: "lineManager",
        //   model: "User",
        //   select: "firstName lastName email",
        // },
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

// get all agents from a loged manager
exports.getAllAgentsFromLogedManager = async (
  req,
  res,
  next
) => {
  const managerId = req.user.id;
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
            { userType: 3 }
          ],
        }, // Users with userType 5 or 8
        {
          $or: [
            { lineManager: managerId }, // Users with the specified manager
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
        path: "lineManager",
        select: "firstName lastName email",
        // populate: {
        //   path: "lineManager",
        //   model: "User",
        //   select: "firstName lastName email",
        // },
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
// exports.getAllIndividualCustomer = getAllIndividualCustomer;
