const Charge = require("../../models/charges/chargeModel");
const ErrorResponse = require("../../utils/errorResponse");
const asyncHandler = require("../../middleware/asyncHandler");
const axios = require("axios");

const mpesaService = require("../../utils/mpesaService"); // Import the module I provided

// Example route handler for initiating C2B payment

exports.c2bPayment = asyncHandler(async (req, res) => {
  const {
    amount,
    msisdn,
    // transaction_ref,
    // thirdparty_ref,
    customer,
    service,
    paymentMethod,
  } = req.body;

  try {
    console.log("Initiating M-Pesa payment...");
    const transaction_ref = "T12344C";
    const thirdparty_ref = "64VBPT";
    const result = await mpesaService.initiateC2BPayment(
      amount,
      msisdn,
      transaction_ref,
      thirdparty_ref
    );



    // Generate a unique invoice number within an asynchronous context
    const invoiceNumber = await generateUniqueInvoiceNumber();

    // Set the invoice variable to the generated invoice number
    const invoice = invoiceNumber;

    // Assuming you have a 'Charge' model for your database
    const charge = await Charge.create({
      invoice,
      customer,
      service,
      paymentMethod,
      amount,
      transaction_ref,
      thirdparty_ref,
      msisdn,
      data: result.data, // Store the M-Pesa payment response data
      user: req.user.id, // Assuming you have user authentication and you're storing the user's ID
    });

    // Send the M-Pesa response back to the client
    res.json({
      status: result.status,
      statusText: result.statusText,
      data: result.data,
      charge,
    });
  } catch (error) {
    // Log any errors that occurred during payment processing
    // console.error("M-Pesa payment failed:", error);

    // Send the M-Pesa error message back to the client
    if (
      error.response &&
      error.response.data &&
      error.response.data.output_ResponseDesc
    ) {
      res.status(500).json({ error: error.response.data.output_ResponseDesc });
    } else {
      // If there's no specific error message from M-Pesa, you can send a generic error message
      res.status(500).json({ error: "M-Pesa payment failed" });
    }
  }
});

//
const generateUniqueInvoiceNumber = async () => {
  const prefix = "FAC"; // You can use any prefix you prefer
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, ""); // Generate a timestamp without dashes, colons, and periods
  let count;

  try {
    // Attempt to count existing charge documents
    count = await Charge.countDocuments({});
  } catch (error) {
    // Handle any errors, log them, and provide a fallback count
    console.error("Error counting documents:", error);
    count = 1; // Provide a default count (e.g., starting from 1) on error
  }

  // Increment the count to ensure uniqueness
  count++;

  return `${prefix}-${timestamp}-${count}`; // Create the unique invoice number with timestamp
};

exports.createCharge = asyncHandler(async (req, res, next) => {
  try {
    const { customer, service, paymentMethod, amount, msisdn } = req.body;

    const requiredFields = [customer, service, paymentMethod, amount];

    if (requiredFields.some((field) => !field)) {
      return next(new ErrorResponse("Campos nao podem estar vazios", 400));
    }

    // Check if amount is a valid number
    if (isNaN(amount)) {
      return next(new ErrorResponse("Verificar todos os campos", 400));
    }
    // Generate a unique invoice number within an asynchronous context
    const invoiceNumber = await generateUniqueInvoiceNumber();

    // Set the invoice variable to the generated invoice number
    const invoice = invoiceNumber;

    // Create a charge document in your database with the received API response
    const charge = await Charge.create({
      invoice,
      customer,
      msisdn,
      service,
      paymentMethod,
      amount,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      charge,
    });
  } catch (error) {
    next(error);
  }
});

// find Charge by ID
exports.findChargeById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the charge by ID and populate the "customer" and "service" fields
    const charge = await Charge.findById(id)
      .populate("customer", "firstName lastName email gender dob") // Adjust the fields you want to populate for the customer
      .populate("service", "title description amount"); // Adjust the fields you want to populate for the service

    if (!charge) {
      return res.status(404).json({ message: "Cobranca nao foi encontrada" });
    }

    res.status(200).json({
      success: true,
      charge,
    });
  } catch (error) {
    next(error);
  }
});

// Escape special characters in a string for use in a regular expression
function escapeStringRegexp(string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

exports.getAllCharges2 = asyncHandler(async (req, res, next) => {
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
        { invoice: { $regex: searchTerm, $options: "i" } },
        { msisdn: { $regex: searchTerm, $options: "i" } },
        { amount: { $regex: searchTerm, $options: "i" } },
        { "customer.firstName": { $regex: searchTerm, $options: "i" } },
        { status: { $regex: searchTerm, $options: "i" } },
        { paymentMethod: { $regex: searchTerm, $options: "i" } },
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
    const totalCount = await Charge.countDocuments(query);
    // Find customer requests with pagination
    const charges = await Charge.find(query)
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate("customer", "firstName lastName") // Populate only firstName for customer
      .populate("service", "title")
      .populate("user", "firstName lastName"); // Populate only firstName for customer

    res.status(200).json({
      success: true,
      count: charges.length,
      total: totalCount,
      pageSize,
      page,
      charges,
    });
  } catch (error) {
    next(error);
  }
});

exports.getAllCharges = asyncHandler(async (req, res, next) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;
    const searchTerm = req.query.searchTerm;
    const startDateParam = req.query.startDate;
    const endDateParam = req.query.endDate;

    const pipeline = [];

    // Lookup stage to join with the customers collection
    pipeline.push({
      $lookup: {
        from: "customers", // Assuming your customers collection is named 'customers'
        localField: "customer",
        foreignField: "_id",
        as: "customer",
      },
    });

    // Lookup stage to join with the servicos collection
    pipeline.push({
      $lookup: {
        from: "servicos", // Assuming your servicos collection is named 'servicos'
        localField: "service",
        foreignField: "_id",
        as: "servico",
      },
    });

    // Lookup stage to join with the users collection
    pipeline.push({
      $lookup: {
        from: "users", // Assuming your users collection is named 'users'
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    });

    // Unwind the customer array created by the $lookup stage
    pipeline.push({
      $unwind: "$customer",
    });

    // Unwind the servico array created by the $lookup stage
    pipeline.push({
      $unwind: "$servico",
    });

    // Unwind the user array created by the $lookup stage
    pipeline.push({
      $unwind: "$user",
    });

    const matchStage = {};

    if (searchTerm) {
      matchStage.$or = [
        { invoice: { $regex: searchTerm, $options: "i" } },
        { msisdn: { $regex: searchTerm, $options: "i" } },
        { amount: { $regex: searchTerm, $options: "i" } },
        { "customer.firstName": { $regex: searchTerm, $options: "i" } },
        { "customer.lastName": { $regex: searchTerm, $options: "i" } },
        { "servico.title": { $regex: searchTerm, $options: "i" } },
        { "user.firstName": { $regex: searchTerm, $options: "i" } },
        { status: { $regex: searchTerm, $options: "i" } },
        { paymentMethod: { $regex: searchTerm, $options: "i" } },
      ];
    }

    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate) && startDate <= endDate) {
        matchStage.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({
        $match: matchStage,
      });
    }

    // Sort, skip, and limit stages
    pipeline.push({
      $sort: { createdAt: -1 },
    });

    pipeline.push({
      $skip: pageSize * (page - 1),
    });

    pipeline.push({
      $limit: pageSize,
    });

    const totalCount = await Charge.countDocuments(matchStage);
    const charges = await Charge.aggregate(pipeline);

    res.status(200).json({
      success: true,
      count: charges.length,
      total: totalCount,
      pageSize,
      page,
      charges,
    });
  } catch (error) {
    console.error("Error fetching charges:", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while fetching charges",
    });
  }
});

exports.getAllCharges3 = asyncHandler(async (req, res, next) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10;
    const page = parseInt(req.query.pageNumber, 10) || 1;
    const searchTerm = req.query.searchTerm;
    const startDateParam = req.query.startDate;
    const endDateParam = req.query.endDate;

    const pipeline = [
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $lookup: {
          from: "servicos",
          localField: "service",
          foreignField: "_id",
          as: "servico",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$customer" },
      { $unwind: "$servico" },
      { $unwind: "$user" },
    ];

    const matchStage = {};

    if (searchTerm) {
      matchStage.$or = [
        { invoice: { $regex: searchTerm, $options: "i" } },
        { msisdn: { $regex: searchTerm, $options: "i" } },
        { amount: { $regex: searchTerm, $options: "i" } },
        { "customer.firstName": { $regex: searchTerm, $options: "i" } },
        { "servico.title": { $regex: searchTerm, $options: "i" } },
        { "user.firstName": { $regex: searchTerm, $options: "i" } },
        { status: { $regex: searchTerm, $options: "i" } },
        { paymentMethod: { $regex: searchTerm, $options: "i" } },
      ];
    }

    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate) && startDate <= endDate) {
        matchStage.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $skip: pageSize * (page - 1) });
    pipeline.push({ $limit: pageSize });

    const aggregationPipeline = [...pipeline, { $count: "count" }];

    const charges = await Charge.aggregate(pipeline);
    const totalCountPipelineResult = await Charge.aggregate(
      aggregationPipeline
    );

    const totalCount =
      totalCountPipelineResult.length > 0
        ? totalCountPipelineResult[0].count
        : 0;

    res.status(200).json({
      success: true,
      count: charges.length,
      total: totalCount,
      pageSize,
      page,
      charges,
    });
  } catch (error) {
    console.error("Error fetching charges:", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while fetching charges",
    });
  }
});

function isValidDate(date) {
  return date instanceof Date && !isNaN(date);
}

// edit charge
exports.editCharge = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  // Find the charge by ID
  let checkCustomer = await Charge.findById(id);

  if (!checkCustomer) {
    return res.status(404).json({ message: "Cobranca nao existe" });
  }
  const { customer, service, paymentMethod, amount } = req.body;

  const requiredFields = [customer, service, paymentMethod, amount];

  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Campo nao pode ser nulo", 400));
  }
  // Check if contact is a valid number
  if (isNaN(amount)) {
    return next(new ErrorResponse("Verificar todos os campos", 400));
  }

  const updatedCharge = await Charge.findByIdAndUpdate(
    id,
    {
      customer,
      service,
      paymentMethod,
      amount,
      user: req.user.id,
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    charge: updatedCharge,
  });
});

// Revoke charge
exports.revokeCharge = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  // Find the charge by ID
  let checkCustomer = await Charge.findById(id);

  if (!checkCustomer) {
    return res.status(404).json({ message: "Cobranca nao existe" });
  }
  const { status } = req.body;

  const requiredFields = [status];

  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Campo nao pode ser nulo", 400));
  }

  const revokeCharge = await Charge.findByIdAndUpdate(
    id,
    {
      status,
      user: req.user.id,
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    charge: revokeCharge,
  });
});

//delete customer by ID
exports.deleteChargeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Find the chat message by ID and delete it
    const delecharge = await Charge.findByIdAndDelete(id);

    if (!delecharge) {
      return res.status(404).json({ error: "Cobranca nao encontrada" });
    }

    // Emit an event indicating that the message was deleted
    // const io = req.app.locals.io; // Get the Socket.IO instance
    // io.emit("chat message deleted", messageId);

    res.status(200).json({ message: "Cobranca removida com sucesso" });
  } catch (err) {
    console.error("Ocorreu um erro removendo Cobranca:", err);
    res.status(500).json({ error: "Ocorreu um erro removendo Cobranca" });
  }
});
