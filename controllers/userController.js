const User = require("../models/userModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/asyncHandler");

//load all users from db
exports.allUsers = async (req, res, next) => {
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

//load customers users from db
exports.allCustomersUsers = async (req, res, next) => {
  // Enable pagination
  const pageSize = 10;
  const page = Number(req.query.pageNumber) || 1;
  // Enable search
  const searchTerm = req.query.searchTerm;
  // Parse the date range parameters from the request query
  const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
  const endDateParam = req.query.endDate; // Format: YYYY-MM-DD
  const query = { userType: { $in: [4, 5, 7, 8] } };

  if (searchTerm) {
    const regex = new RegExp(searchTerm, "i");
    query["$or"] = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      // Add other fields you want to search by
    ];
  }

  try {
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
      .populate({
        path: "company",
        select: "companyName contact1 email",
      })
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
  } catch (error) {
    return next(error);
  }
};

//show single user
exports.singleUser = async (req, res, next) => {
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
//edit user
exports.editUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id, req.body, { new: true });
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

//delete user
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }
    res.status(200).json({
      success: true,
      message: "User deleted",
    });
  } catch (error) {
    return next(error);
  }
};

//jobs history
exports.createUserJobsHistory = async (req, res, next) => {
  const { title, description, salary, location } = req.body;
  try {
    const currentUser = await User.findOne({ _id: req.user._id });
    if (!currentUser) {
      return next(new ErrorResponse("You must log in", 401));
    } else {
      const addJobHistory = {
        title,
        description,
        salary,
        location,
        user: req.user._id,
      };
      currentUser.jobsHistory.push(addJobHistory);
      await currentUser.save();
    }
    res.status(200).json({
      success: true,
      currentUser,
    });
  } catch (error) {
    return next(error);
  }
};

//////////////////////// OTHER USERS /////////////////////////////////
//load all users
exports.allUsersManagers = async (req, res, next) => {
  //enavle pagination
  const pageSize = 10;
  const page = Number(req.query.pageNumber) || 1;
  const count = await User.find({}).estimatedDocumentCount();
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select("-password")
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
