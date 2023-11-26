const Company = require("../models/companyModel");
const Plan = require("../models/planModel");
const User = require("../models/userModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/asyncHandler");

//create service
exports.createIndividualUser = asyncHandler(async (req, res, next) => {
  try {
    const {
      DOB,
      IdNumber,
      IdType,
      address,
      contact1,
      contact2,
      email,
      enrolmentDate,
      firstName,
      gender,
      lastName,
      monthlyFee,
      plan,
    } = req.body;

    if (
      !DOB ||
      !IdNumber ||
      !IdType ||
      !address ||
      !contact1 ||
      !contact2 ||
      !email ||
      !enrolmentDate ||
      !firstName ||
      !gender ||
      !lastName ||
      !monthlyFee ||
      !plan
    ) {
      return next(new ErrorResponse("Fields cannot be null", 400));
    }

    // Check if contact is a valid number
    if (isNaN(contact1) || isNaN(contact2) || isNaN(monthlyFee)) {
      return next(new ErrorResponse("Contact must be a number", 400));
    }

    // Check if user exists
    const existingUser = await User.findById(email);
    if (!existingUser) {
      return next(
        new ErrorResponse("User with the same data already exists", 400)
      );
    }
    // Check if serviceName already exists for the given plan
    const existingPlan = await Plan.findOne({ plan });
    if (!existingPlan) {
      return next(new ErrorResponse("Plan dont exist, please check", 400));
    }

    const company = await User.create({
      DOB,
      IdNumber,
      IdType,
      address,
      contact1,
      contact2,
      email,
      enrolmentDate,
      firstName,
      gender,
      lastName, 
      monthlyFee,
      plan,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      company,
    });
  } catch (error) {
    next(error);
  }
});

//find company by id
exports.singleCompany = asyncHandler(async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.company_id)
      .populate("plan")
      .populate("user");

    if (!company) {
      return next(new ErrorResponse("Company not found", 404));
    }

    res.status(200).json({
      success: true,
      company,
    });
  } catch (error) {
    next(error);
  }
});

//update Company
exports.updatedCompany = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  const { companyName, brand, accountManager, contact1, contact2, plan } =
    req.body;
  //check if empty
  if (
    !companyName ||
    !plan ||
    !brand ||
    !accountManager ||
    !contact1 ||
    !contact2
  ) {
    return next(new ErrorResponse("Fields cannot be null", 400));
  }

  // Check if contact is a valid number
  if (isNaN(contact1) || isNaN(contact2)) {
    return next(new ErrorResponse("Contact must be a number", 400));
  }

  const updatedCompany = await Company.findByIdAndUpdate(
    id,
    { companyName, brand, accountManager, contact1, contact2, plan },
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

//Get all all job category
exports.getAllCompany = async (req, res, next) => {
  //enable seach
  const keyword = req.query.keyword
    ? {
        title: {
          $regex: req.query.keyword,
          $options: "i",
        },
      }
    : {};

  //enable pagination
  const pageSize = 5;
  const page = Number(req.query.pageNumber) || 1;

  // const count = await Job.find({ ...keyword }).estimatedDocumentCount();
  const count = await Company.find().countDocuments(); //jobType e o nome dentro do modelo job

  try {
    const company = await Company.find()
      .populate("plans")
      .populate("user")
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize);
    res.status(200).json({
      success: true,
      page,
      company,
      pages: Math.ceil(count / pageSize),
      count,
    });
  } catch (error) {
    next(error);
  }
};

//delete plan
exports.deleteCompany = asyncHandler(async (req, res, next) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      return next(new ErrorResponse("Company not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

//quero entrar na tabela de usuarios, e estrair todos os usuarios que tem o id da empresa
//irei receber esse id por parametro

exports.getThisCompanyUsers = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    const allUsers = await User.find({ company: id })
      .populate({ path: "plan", select: "-__v" })
      .populate({ path: "user", select: "firstName lastName email" });

    res.status(200).json({
      success: true,
      allUsers,
    });
  } catch (error) {
    next(error);
  }
});
