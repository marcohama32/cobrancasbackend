const User = require("../models/userModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/asyncHandler");


//find all customers
exports.allUsers = asyncHandler(async (req, res, next) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;
    const searchTerm = req.query.searchTerm;
    // Parse the date range parameters from the request query
    const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
    const endDateParam = req.query.endDate; // Format: YYYY-MM-DD
    // Create the query object
    const query = {};

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      // query["customer.firstName"] = { $regex: searchTerm, $options: "i" };
      query.$or = [
        { firstName: { $regex: searchTerm, $options: "i" } },
        { lastName: { $regex: searchTerm, $options: "i" } },
        { idNumber: { $regex: searchTerm, $options: "i" } },
        { idType: { $regex: searchTerm, $options: "i" } },
        { gender: { $regex: searchTerm, $options: "i" } },
        { address: { $regex: searchTerm, $options: "i" } },
        { contact1: { $regex: searchTerm, $options: "i" } },
        { contact2: { $regex: searchTerm, $options: "i" } },
        { username: { $regex: searchTerm, $options: "i" } },
        { status: { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
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
    // Calculate the total count of transactions matching the query
    const totalCount = await User.countDocuments(query);
    // Find customer requests with pagination
    const user = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.status(200).json({
      success: true,
      count: user.length,
      total: totalCount,
      pageSize,
      page,
      user,
    });
  } catch (error) {
    next(error);
  }
});


//load all users from db
exports.allUsers1 = async (req, res, next) => {
  //enavle pagination
  const pageSize = 20;
  const page = Number(req.query.pageNumber) || 1;
  const searchTerm = req.query.searchTerm;
  // Parse the date range parameters from the request query
  const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
  const endDateParam = req.query.endDate; // Format: YYYY-MM-DD

  if (searchTerm) {
    const regex = new RegExp(searchTerm, "i");
    query["$or"] = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      // Add other fields you want to search by
    ];
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

  const count = await User.find({}).estimatedDocumentCount();
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select("-password")
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
      .populate({
        path: "user",
        select: "firstName lastName email",
      })
      .populate("myMembers")
      .populate("myMembers")
      .skip(pageSize * (page - 1))
      .limit(pageSize);
    res.status(200).json({
      success: true,
      users,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    });
    next();
  } catch (error) {
    return next(error);
  }
};

//show single user
exports.singleUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);

    // Check if the user exists
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "Usuario nao encontrado" });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

// single user profile || i use this to get profile to a customer
exports.singleUserProfile = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId)
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
      .populate("user", "firstName lastName email")
      .populate("myMembers");

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Construct the full URL for the avatar image
    if (user.avatar) {
      user.avatar = `${user.avatar}`; // Replace 'your-image-url' with the actual URL or path to your images
    }

    // Fetch and construct full URLs for the files
    if (user.multipleFiles) {
      const files = user.multipleFiles.split(",");
      const fileURLs = files.map((file) => `${file}`);
      user.multipleFiles = fileURLs;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
};
//update user
exports.updateUser = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  // Find the customer by ID
  let checkCustomer = await User.findById(id);

  if (!checkCustomer) {
    return res.status(404).json({ message: "Usuario nao existe" });
  }
  const {
    firstName,
    lastName,
    email,
    gender,
    dob,
    idType,
    idNumber,
    address,
    contact1,
    role,
    username,
    password
  } = req.body;

  const requiredFields = [
    firstName,
    lastName,
    email,
    gender,
    dob,
    idType,
    idNumber,
    address,
    contact1,
    role,
    username,
  ];

  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Campo nao pode ser nulo", 400));
  }
  // Check if contact is a valid number
  if (isNaN(contact1)) {
    return next(new ErrorResponse("Contacto deve ser um numero", 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    {
      firstName,
      lastName,
      email,
      gender,
      dob,
      idType,
      idNumber,
      address,
      contact1,
      role,
      username,
      password
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    user: updatedUser,
  });
});

//delete user
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return next(new ErrorResponse("Usuario nao encontrado", 404));
    }
    res.status(200).json({
      success: true,
      message: "Usuario apagado",
    });
  } catch (error) {
    return next(error);
  }
};

// desactive user
exports.desactiveUser = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  const { status } = req.body;

  const requiredFields = [status];

  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Fields cannot be null", 400));
  }

  // verificar se esses esse user
  const validUser = await User.findById(id);
  if (!validUser) {
    return next(new ErrorResponse("User not found, please check", 400));
  }

  const InactiveUser = await User.findByIdAndUpdate(
    id,
    {
      status,
      user: req.user.id,
    },
    { new: true }
  );

  if (!InactiveUser) {
    return next(new ErrorResponse("Service not found", 404));
  }

  res.status(200).json({
    success: true,
    user: InactiveUser.status,
  });
});

//get user by memberShipID
exports.UserByMembershipID = async (req, res, next) => {
  try {
    const { memberShipID } = req.query;

    // Validate input
    if (!memberShipID) {
      return res.status(400).json({ success: false, error: "Invalid input" });
    }

    // Find the user by membership ID and populate the 'myMembers.user' field
    const foundUser = await User.findOne({ memberShipID }).populate({
      path: "myMembers",
    });
    // .select("firstName lastName email gender dob relation idType idNumber myMembers address contact1 contact2 avatar memberShipID _id status");

    // Check if the user exists
    if (!foundUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Check if the user is inactive
    if (foundUser.status === "Inactive") {
      return res.status(400).json({
        success: false,
        error: "Customer is Inactive. Please contact admin.",
      });
    }

    res.status(200).json({
      success: true,
      thisuser: foundUser,
    });
  } catch (error) {
    return next(error);
  }
};
