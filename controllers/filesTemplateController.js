const FilesTemplate = require("../models/filesTemplate");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/asyncHandler");

//create File Template
exports.createFileTemplate = asyncHandler(async (req, res, next) => {
  try {
    const { description, status } = req.body;

    // Check if 'description' is provided
    if (!description) {
      return next(new ErrorResponse("Description field is required", 400));
    }

    const fileTemplate = req.file?.path;

    const fileUpload = await FilesTemplate.create({
      description,
      fileTemplate,
      status,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      fileUpload,
    });
  } catch (error) {
    next(error);
  }
});

exports.updateFileTemplate = asyncHandler(async (req, res, next) => {
  try {
    const { description, status } = req.body;
    const fileId = req.params.templateId; // Assuming you're passing the file ID as a URL parameter
    console.log("Description: ", status);

    // Check if 'description' is provided
    if (!description) {
      return next(new ErrorResponse("Description field is required", 400));
    }

    const updatedFields = {
      description,
      status
    };

    if (req.file) {
      updatedFields.avatar = req.file.path;
    }

    // Find the file template by ID and update it
    const file = await FilesTemplate.findByIdAndUpdate(fileId, updatedFields, {
      new: true,
      runValidators: true,
    });

    if (!file) {
      return next(new ErrorResponse("File template not found", 404));
    }

    res.status(200).json({
      success: true,
      file,
    });
  } catch (error) {
    next(error);
  }
});

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

exports.getAllFileTemplates = asyncHandler(async (req, res, next) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;
    const searchTerm = req.query.searchTerm;

    // Validate pageSize and pageNumber
    if (pageSize <= 0 || page <= 0) {
      return res.status(400).json({ success: false, error: "Invalid pageSize or pageNumber" });
    }

    let query = {};

    if (searchTerm) {
      query = {
        description: { $regex: searchTerm, $options: "i" }, // Case-insensitive search for description field
      };
    }

    const count = await FilesTemplate.countDocuments(query);

    const fileTemplates = await FilesTemplate.find(query)
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.status(200).json({
      success: true,
      count,
      page,
      pages: Math.ceil(count / pageSize),
      fileTemplates,
    });
  } catch (error) {
    next(error);
  }
});

// get all active files
exports.getAllActiveFileTemplates = asyncHandler(async (req, res, next) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;
    const searchTerm = req.query.searchTerm;

    // Validate pageSize and pageNumber
    if (pageSize <= 0 || page <= 0) {
      return res.status(400).json({ success: false, error: "Invalid pageSize or pageNumber" });
    }

    const query = { status: 'Active' };

    if (searchTerm) {
      console.log("Search Term: ", searchTerm);
      const escapedSearchTerm = escapeRegExp(searchTerm);
      console.log("Escaped Search Term: ", escapedSearchTerm);
      query.description = { $regex: escapedSearchTerm, $options: "i" };
    }

    const count = await FilesTemplate.countDocuments(query);

    const fileTemplates = await FilesTemplate.find(query)
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.status(200).json({
      success: true,
      count,
      page,
      pages: Math.ceil(count / pageSize),
      fileTemplates,
    });
  } catch (error) {
    next(error);
  }
});

// get by id
exports.singleTemplate = async (req, res, next) => {
  try {
    const templateId = req.params.templateId;
    console.log(templateId)

    const template = await FilesTemplate.findById(templateId)
      .populate("user", "firstName lastName email")

    // Check if the user exists
    if (!template) {
      return res.status(404).json({ success: false, error: "File not found" });
    }

    // Construct the full URL for the avatar image
    if (template.fileTemplate) {
      template.fileTemplate = `${template.fileTemplate}`; // Replace 'your-image-url' with the actual URL or path to your images
    }

    // Fetch and construct full URLs for the files
    if (template.multipleFiles) {
      const files = template.multipleFiles.split(",");
      const fileURLs = files.map((file) => `${file}`);
      template.multipleFiles = fileURLs;
    }

    res.status(200).json({
      success: true,
      template,
    });
  } catch (error) {
    return next(error);
  }
};