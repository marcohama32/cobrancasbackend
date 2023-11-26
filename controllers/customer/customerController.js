const Customer = require("../../models/customer/customerModel");
const Charge = require("../../models/charges/chargeModel");
const ErrorResponse = require("../../utils/errorResponse");
const asyncHandler = require("../../middleware/asyncHandler");
const mongoose = require("mongoose");

//create admin
exports.createCustomers = asyncHandler(async (req, res, next) => {
  try {
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
      contact2,
      activities,
      description,
      multipleFiles,
    } = req.body;

    const requiredFields = [
      firstName,
      lastName,
      gender,
      dob,
      idType,
      idNumber,
      address,
      contact1,
      activities,
    ];

    if (requiredFields.some((field) => !field)) {
      return next(new ErrorResponse("Campos nao podem estar vazios", 400));
    }
    // Check if contact is a valid number
    if (isNaN(contact1)) {
      return next(new ErrorResponse("Varificar todos os campos", 400));
    }

    const existingUser = await Customer.findOne({ email });
    if (existingUser) {
      return next(
        new ErrorResponse(
          "Cliente com os mesmos dados ja existe no banco de dados",
          400
        )
      );
    }

    // const avatar = req.file?.path;

    const customer = await Customer.create({
      firstName,
      lastName,
      email,
      gender,
      dob,
      idType,
      idNumber,
      address,
      contact1,
      contact2,
      multipleFiles,
      activities,
      description,
      role: 4,
      userType: 4,
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

//find customer by ID
exports.findCustomerById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the customer by ID
    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({ message: "Cliente nao foi encontrado" });
    }

    res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    next(error);
  }
});

//find all customers
exports.getAllCustomer = asyncHandler(async (req, res, next) => {
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
        { activities: { $regex: searchTerm, $options: "i" } },
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
    const totalCount = await Customer.countDocuments(query);
    // Find customer requests with pagination
    const customer = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize)
    
    res.status(200).json({
      success: true,
      count: customer.length,
      total: totalCount,
      pageSize,
      page,
      customer,
    });
  } catch (error) {
    next(error);
  }
});

// edit customers
exports.editCustomers = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  // Find the customer by ID
  let checkCustomer = await Customer.findById(id);

  if (!checkCustomer) {
    return res.status(404).json({ message: "Cliente nao existe" });
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
    contact2,
    multipleFiles,
    activities,
    description,
    status
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
    activities,
    status
  ];

  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Campo nao pode ser nulo", 400));
  }
  // Check if contact is a valid number
  if (isNaN(contact1)) {
    return next(new ErrorResponse("Contacto deve ser um numero", 400));
  }

 
  const updatedCustomer = await Customer.findByIdAndUpdate(
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
      contact2,
      multipleFiles,
      activities,
      description,
      status,
      role: 4,
      userType: 4,
      user: req.user.id,
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    customer: updatedCustomer,
  });
});

//delete customer by ID
exports.deleteCustomerById1 = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Find the chat message by ID and delete it
    const deletecustomer = await Customer.findByIdAndDelete(id);

    if (!deletecustomer) {
      return res.status(404).json({ error: "Cliente nao encontrado" });
    }

    // Emit an event indicating that the message was deleted
    // const io = req.app.locals.io; // Get the Socket.IO instance
    // io.emit("chat message deleted", messageId);

    res.status(200).json({ message: "Cliente removido com sucesso" });
  } catch (err) {
    console.error("Ocorreu um erro removendo Cliente:", err);
    res.status(500).json({ error: "Ocorreu um erro removendo Cliente" });
  }
});


//delete customer with charge || rolback function
exports.deleteCustomerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Start a MongoDB session
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the customer by ID
    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    // Find charges associated with the customer
    const charges = await Charge.find({ customer: id });

    // Add logic to find associated records in other tables if needed
    // const otherRecords = await OtherModel.find({ customer: id });
    // ...

    // Delete associated charges
    await Charge.deleteMany({ customer: id });

    // Add logic to delete associated records in other tables if needed
    // await OtherModel.deleteMany({ customer: id });
    // ...

    // Delete the customer
    await customer.remove();

    // If everything is successful, commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Respond with success
    res.status(200).json({ message: "Cliente removido com sucesso" });
  } catch (err) {
    console.error("Ocorreu um erro removendo Cliente:", err);

    // If an error occurs, abort the transaction
    await session.abortTransaction();
    session.endSession();

    // Respond with an error
    res.status(500).json({ error: "Ocorreu um erro removendo Cliente" });
  }
});