const Plan = require("../models/planModel");
const PlanServices = require("../models/serviceModel");
const Transaction = require("../models/transaction");
const User = require("../models/userModel");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/asyncHandler");
const mongoose = require("mongoose");
// const PDFDocument = require('pdfkit');
const { PDFDocument, rgb } = require("pdf-lib");
const fs = require("fs");
const pdfMake = require("pdfmake/build/pdfmake");
const vfsFonts = require("pdfmake/build/vfs_fonts");
const path = require("path");
const stream = require("stream");

exports.createTransaction1 = async (req, res) => {
  try {
    const { customerId, planId, serviceId, paymentMethod, amount } = req.body;

    const customer = await User.findById(customerId).populate({
      path: "plan",
      populate: {
        path: "planService",
        model: "PlanServices",
      },
    });

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, error: "Customer not found" });
    }

    const selectedPlan = customer.plan.find(
      (plan) => plan._id.toString() === planId
    );

    if (!selectedPlan || !selectedPlan.planService) {
      return res
        .status(404)
        .json({ success: false, error: "Plan not found for the customer" });
    }

    const selectedService = selectedPlan.planService.find(
      (service) => service._id.toString() === serviceId
    );

    if (!selectedService) {
      return res.status(404).json({
        success: false,
        error: "Service not found in the customer's plan",
      });
    }

    if (selectedService.remainingBalance === undefined) {
      return res.status(400).json({
        success: false,
        error: "Service does not have a remaining balance",
      });
    }

    const transactions = await Transaction.find({
      customerId,
      serviceIds: serviceId,
    }).lean();

    const totalAmountSpent = transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0
    );
    const availableBalance = selectedService.servicePrice - totalAmountSpent;

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        error: "Transaction amount exceeds available balance",
      });
    }

    if (selectedService.preAuthorization === "yes") {
      return res.status(400).json({
        success: false,
        error: "You need authorization to use this service",
      });
    }

    selectedService.remainingBalance = availableBalance - amount;
    await selectedService.save();

    const newTransaction = await Transaction.create({
      customerId,
      planId,
      serviceIds: [serviceId],
      paymentMethod,
      amount,
    });

    res.status(201).json({
      success: true,
      remainingBalance: selectedService.remainingBalance,
      transaction: newTransaction,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
};

exports.deleteTransaction = asyncHandler(async (req, res, next) => {
  const transactionId = req.params.id;

  try {
    // Find the transaction by ID
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    // Get the customer ID from the transaction
    const customerId = transaction.customerId;

    // Find the customer
    const customer = await User.findById(customerId).populate({
      path: "plan",
      populate: {
        path: "planService",
        model: "PlanServices",
      },
    });

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, error: "Customer not found" });
    }

    // Find the selected service in the customer's plan
    const selectedPlan = customer.plan.find(
      (plan) => plan._id.toString() === transaction.planId.toString()
    );

    if (!selectedPlan || !selectedPlan.planService) {
      return res
        .status(404)
        .json({ success: false, error: "Plan not found for the customer" });
    }

    const selectedService = selectedPlan.planService.find(
      (service) =>
        service._id.toString() === transaction.serviceIds[0].toString()
    );

    if (!selectedService) {
      return res.status(404).json({
        success: false,
        error: "Service not found in the customer's plan",
      });
    }

    // Update the selected service's remaining balance
    selectedService.remainingBalance += transaction.amount;
    await selectedService.save();

    // Delete the transaction from the database
    await transaction.remove();

    res
      .status(200)
      .json({ success: true, message: "Transaction deleted successfully" });
  } catch (error) {
    next(error);
  }
});

exports.editTransaction1 = asyncHandler(async (req, res, next) => {
  const transactionId = req.params.transactionId;
  const { customerId, planId, serviceId, paymentMethod, amount } = req.body;

  try {
    // Find the transaction by ID
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    // Get the customer ID from the transaction
    const oldCustomerId = transaction.customerId;

    // Find the customer with the old customer ID
    const oldCustomer = await User.findById(oldCustomerId).populate({
      path: "plan",
      populate: {
        path: "planService",
        model: "PlanServices",
      },
    });

    if (!oldCustomer) {
      return res
        .status(404)
        .json({ success: false, error: "Customer not found" });
    }

    // Find the selected service in the old customer's plan
    const oldSelectedPlan = oldCustomer.plan.find(
      (plan) => plan._id.toString() === transaction.planId.toString()
    );

    if (!oldSelectedPlan || !oldSelectedPlan.planService) {
      return res
        .status(404)
        .json({ success: false, error: "Plan not found for the customer" });
    }

    const oldSelectedService = oldSelectedPlan.planService.find(
      (service) =>
        service._id.toString() === transaction.serviceIds[0].toString()
    );

    if (!oldSelectedService) {
      return res.status(404).json({
        success: false,
        error: "Service not found in the customer's plan",
      });
    }

    // Update the old selected service's remaining balance
    oldSelectedService.remainingBalance += transaction.amount;

    // Save the updated old customer and old selected service
    await oldCustomer.save();

    // Update the transaction with the new values
    // transaction.customerId = customerId;
    transaction.planId = planId;
    transaction.serviceIds = [serviceId];
    transaction.paymentMethod = paymentMethod;
    transaction.amount = amount;

    // Find the new customer
    const newCustomer = await User.findById(customerId).populate({
      path: "plan",
      populate: {
        path: "planService",
        model: "PlanServices",
      },
    });

    if (!newCustomer) {
      return res
        .status(404)
        .json({ success: false, error: "New customer not found" });
    }

    // Find the selected service in the new customer's plan
    const newSelectedPlan = newCustomer.plan.find(
      (plan) => plan._id.toString() === planId.toString()
    );

    if (!newSelectedPlan || !newSelectedPlan.planService) {
      return res
        .status(404)
        .json({ success: false, error: "New plan not found for the customer" });
    }

    const newSelectedService = newSelectedPlan.planService.find(
      (service) => service._id.toString() === serviceId
    );

    if (!newSelectedService) {
      return res.status(404).json({
        success: false,
        error: "New service not found in the customer's plan",
      });
    }

    // Check if the transaction amount exceeds the new service price
    if (amount > newSelectedService.servicePrice) {
      return res.status(400).json({
        success: false,
        error: "Transaction amount exceeds service price",
      });
    }

    // Update the new selected service's remaining balance
    newSelectedService.remainingBalance -= amount;

    // Save the updated new customer and new selected service
    await newCustomer.save();

    // Save the updated transaction
    await transaction.save();

    res
      .status(200)
      .json({ success: true, message: "Transaction updated successfully" });
  } catch (error) {
    next(error);
  }
});

exports.editTransaction2 = async (req, res) => {
  try {
    const { amount, paymentMethod, transactionStatus } = req.body;
    console.log("Req body amount : ", transactionStatus);
    const transactionId = req.params.transactionId;

    const transaction = await Transaction.findById(transactionId);
    // console.log(transaction);
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    if (
      transaction.transactionStatus !== "Aproved" &&
      transaction.transactionStatus !== "In progress"
    ) {
      return res.status(400).json({
        success: false,
        error: "Only aproved transactions can be edited...",
      });
    }

    if (
      transaction.preAuthorization === "yes" &&
      transaction.adminApprovalStatus === false
    ) {
      console.log("Need pre Authorization: ", transaction.preAuthorization);
      console.log("Need pre Authorization: ", transaction.adminApprovalStatus);

      return res.status(400).json({
        success: false,
        error: "Transaction wait for authorization",
      });
    }

    const selectedService = await PlanServices.findById(
      transaction.serviceIds[0]
    );

    if (!selectedService) {
      return res.status(404).json({
        success: false,
        error: "Service not found in the transaction",
      });
    }

    const totalAmountSpent = await Transaction.aggregate([
      {
        $match: {
          customerId: transaction.customerId,
          serviceIds: transaction.serviceIds[0],
        },
      },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]);

    const availableBalance =
      selectedService.servicePrice -
      (totalAmountSpent[0]?.totalAmount || 0) +
      transaction.amount;

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        error: "Transaction amount exceeds available balance",
      });
    }
    // check update Status
    if (!transactionStatus) {
      return res.status(404).json({
        success: false,
        error: "Status canot be null",
      });
    }

    // Update transaction fields
    transaction.amount = amount;
    transaction.paymentMethod = paymentMethod;
    transaction.remainingBalance = availableBalance - amount;
    transaction.transactionStatus = transactionStatus;

    // Update multipleFiles if present in the request body
    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map((file) => file.path.replace(/\\/g, "/"));
      transaction.multipleFiles = transaction.multipleFiles
        ? transaction.multipleFiles + "," + newFiles.join(",")
        : newFiles.join(",");
    }

    await transaction.save();

    res.json({
      success: true,
      remainingBalance: transaction.remainingBalance,
      transaction,
    });
  } catch (error) {
    console.error("Error in editTransaction:", error);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
};

exports.editTransaction = async (req, res) => {
  try {
    const { amount, paymentMethod, transactionStatus } = req.body;
    // console.log("Req body amount : ", transactionStatus);
    const transactionId = req.params.transactionId;

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    // Create a status change object
    const statusChange = {
      status: transactionStatus,
      changedBy: req.user._id, // Assuming you have the user/admin ID who made the change
      date: new Date(), // Current date and time
    };

    // Push the status change object into the statusHistory array
    transaction.statusHistory.push(statusChange);

    if (
      transaction.transactionStatus !== "Aproved" &&
      transaction.transactionStatus !== "In progress"
    ) {
      return res.status(400).json({
        success: false,
        error: "Only approved transactions can be edited...",
      });
    }

    if (
      transaction.preAuthorization === "yes" &&
      transaction.adminApprovalStatus === false
    ) {
      console.log("Need pre Authorization: ", transaction.preAuthorization);
      console.log("Need pre Authorization: ", transaction.adminApprovalStatus);

      return res.status(400).json({
        success: false,
        error: "Transaction is waiting for authorization",
      });
    }

    const selectedService = await PlanServices.findById(
      transaction.serviceIds[0]
    );

    if (!selectedService) {
      return res.status(404).json({
        success: false,
        error: "Service not found in the transaction",
      });
    }

    const totalAmountSpent = await Transaction.aggregate([
      {
        $match: {
          customerId: transaction.customerId,
          serviceIds: transaction.serviceIds[0],
        },
      },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]);

    const availableBalance =
      selectedService.servicePrice -
      (totalAmountSpent[0]?.totalAmount || 0) +
      transaction.amount;

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        error: "Transaction amount exceeds available balance",
      });
    }

    // check update Status
    if (!transactionStatus) {
      return res.status(404).json({
        success: false,
        error: "Status cannot be null",
      });
    }

    // Update transaction fields
    transaction.amount = amount;
    transaction.paymentMethod = paymentMethod;
    transaction.remainingBalance = availableBalance - amount;
    transaction.transactionStatus = transactionStatus;

    // Update multipleFiles if present in the request body
    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map((file) => file.path.replace(/\\/g, "/"));
      transaction.multipleFiles = transaction.multipleFiles
        ? transaction.multipleFiles + "," + newFiles.join(",")
        : newFiles.join(",");
    }

    await transaction.save();

    res.json({
      success: true,
      remainingBalance: transaction.remainingBalance,
      transaction,
    });
  } catch (error) {
    console.error("Error in editTransaction:", error);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
};

exports.getAllTransactions = asyncHandler(async (req, res, next) => {
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
      query.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { "customerId.lastName": { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { transactionStatus: { $regex: searchTerm, $options: "i" } },
        { "planId.planName": { $regex: searchTerm, $options: "i" } },
        {
          $and: [
            { serviceIds: { $exists: true, $not: { $size: 0 } } },
            {
              serviceIds: {
                $elemMatch: {
                  serviceName: { $regex: searchTerm, $options: "i" },
                },
              },
            },
          ],
        },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Calculate the total count of transactions matching the query
    const totalCount = await Transaction.countDocuments(query);

    // Find transactions with pagination and populate user, plan, and service information
    const transactions = await Transaction.find(query)
      .sort({ updatedAt: -1 }) // Sort by createdAt in descending order
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate("customerId", "firstName lastName email manager agent") // Populate user information
      .populate({
        path: "planId",
        select: "planName", // Select the fields you want to include from the plan document
        populate: {
          path: "planService",
          model: "PlanServices",
          select: "serviceName servicePrice", // Select the fields you want to include from the planService document
        },
      })
      .populate("serviceIds", "serviceName servicePrice"); // Populate service information

    res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      pageSize,
      page,
      transactions,
    });
  } catch (error) {
    next(error);
  }
});

// get all transactions inprogress status
exports.getAllTransactionsInProgress = asyncHandler(async (req, res, next) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;
    const searchTerm = req.query.searchTerm;

    // Parse the date range parameters from the request query
    const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
    const endDateParam = req.query.endDate; // Format: YYYY-MM-DD

    // Create the query object
    const query = { transactionStatus: "In progress" };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { "customerId.lastName": { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { transactionStatus: { $regex: searchTerm, $options: "i" } },
        { "planId.planName": { $regex: searchTerm, $options: "i" } },
        {
          $and: [
            { serviceIds: { $exists: true, $not: { $size: 0 } } },
            {
              serviceIds: {
                $elemMatch: {
                  serviceName: { $regex: searchTerm, $options: "i" },
                },
              },
            },
          ],
        },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Calculate the total count of transactions matching the query
    const totalCount = await Transaction.countDocuments(query);

    // Find transactions with pagination and populate user, plan, and service information
    const transactions = await Transaction.find(query)
      .sort({ updatedAt: -1 }) // Sort by createdAt in descending order
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate("customerId", "firstName lastName email") // Populate user information
      .populate({
        path: "planId",
        select: "planName", // Select the fields you want to include from the plan document
        populate: {
          path: "planService",
          model: "PlanServices",
          select: "serviceName servicePrice", // Select the fields you want to include from the planService document
        },
      })
      .populate("serviceIds", "serviceName servicePrice"); // Populate service information

    res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      pageSize,
      page,
      transactions,
    });
  } catch (error) {
    next(error);
  }
});

// get all transactions in Pending status
exports.getAllTransactionsPending = asyncHandler(async (req, res, next) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;
    const searchTerm = req.query.searchTerm;

    // Parse the date range parameters from the request query
    const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
    const endDateParam = req.query.endDate; // Format: YYYY-MM-DD

    // Create the query object
    const query = { transactionStatus: "Pending" };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { "customerId.lastName": { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { transactionStatus: { $regex: searchTerm, $options: "i" } },
        { "planId.planName": { $regex: searchTerm, $options: "i" } },
        {
          $and: [
            { serviceIds: { $exists: true, $not: { $size: 0 } } },
            {
              serviceIds: {
                $elemMatch: {
                  serviceName: { $regex: searchTerm, $options: "i" },
                },
              },
            },
          ],
        },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Calculate the total count of transactions matching the query
    const totalCount = await Transaction.countDocuments(query);

    // Find transactions with pagination and populate user, plan, and service information
    const transactions = await Transaction.find(query)
      .sort({ updatedAt: -1 }) // Sort by createdAt in descending order
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate("customerId", "firstName lastName email") // Populate user information
      .populate({
        path: "planId",
        select: "planName", // Select the fields you want to include from the plan document
        populate: {
          path: "planService",
          model: "PlanServices",
          select: "serviceName servicePrice", // Select the fields you want to include from the planService document
        },
      })
      .populate("serviceIds", "serviceName servicePrice"); // Populate service information

    res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      pageSize,
      page,
      transactions,
    });
  } catch (error) {
    next(error);
  }
});

// get all transactions in Aproved status
exports.getAllTransactionsAproved = asyncHandler(async (req, res, next) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;
    const searchTerm = req.query.searchTerm;

    // Parse the date range parameters from the request query
    const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
    const endDateParam = req.query.endDate; // Format: YYYY-MM-DD

    // Create the query object
    const query = { transactionStatus: "Aproved" };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { "customerId.lastName": { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { transactionStatus: { $regex: searchTerm, $options: "i" } },
        { "planId.planName": { $regex: searchTerm, $options: "i" } },
        {
          $and: [
            { serviceIds: { $exists: true, $not: { $size: 0 } } },
            {
              serviceIds: {
                $elemMatch: {
                  serviceName: { $regex: searchTerm, $options: "i" },
                },
              },
            },
          ],
        },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Calculate the total count of transactions matching the query
    const totalCount = await Transaction.countDocuments(query);

    // Find transactions with pagination and populate user, plan, and service information
    const transactions = await Transaction.find(query)
      .sort({ updatedAt: -1 }) // Sort by createdAt in descending order
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate("customerId", "firstName lastName email") // Populate user information
      .populate({
        path: "planId",
        select: "planName", // Select the fields you want to include from the plan document
        populate: {
          path: "planService",
          model: "PlanServices",
          select: "serviceName servicePrice", // Select the fields you want to include from the planService document
        },
      })
      .populate("serviceIds", "serviceName servicePrice"); // Populate service information

    res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      pageSize,
      page,
      transactions,
    });
  } catch (error) {
    next(error);
  }
});

// get all transactions in Completed status
exports.getAllTransactionsCompleted = asyncHandler(async (req, res, next) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;
    const searchTerm = req.query.searchTerm;

    // Parse the date range parameters from the request query
    const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
    const endDateParam = req.query.endDate; // Format: YYYY-MM-DD

    // Create the query object
    const query = { transactionStatus: "Completed" };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { "customerId.lastName": { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { transactionStatus: { $regex: searchTerm, $options: "i" } },
        { "planId.planName": { $regex: searchTerm, $options: "i" } },
        {
          $and: [
            { serviceIds: { $exists: true, $not: { $size: 0 } } },
            {
              serviceIds: {
                $elemMatch: {
                  serviceName: { $regex: searchTerm, $options: "i" },
                },
              },
            },
          ],
        },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Calculate the total count of transactions matching the query
    const totalCount = await Transaction.countDocuments(query);

    // Find transactions with pagination and populate user, plan, and service information
    const transactions = await Transaction.find(query)
      .sort({ updatedAt: -1 }) // Sort by createdAt in descending order
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate("customerId", "firstName lastName email") // Populate user information
      .populate({
        path: "planId",
        select: "planName", // Select the fields you want to include from the plan document
        populate: {
          path: "planService",
          model: "PlanServices",
          select: "serviceName servicePrice", // Select the fields you want to include from the planService document
        },
      })
      .populate("serviceIds", "serviceName servicePrice"); // Populate service information

    res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      pageSize,
      page,
      transactions,
    });
  } catch (error) {
    next(error);
  }
});

// get all transactions in Canceled status
exports.getAllTransactionsCanceled = asyncHandler(async (req, res, next) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;
    const searchTerm = req.query.searchTerm;

    // Parse the date range parameters from the request query
    const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
    const endDateParam = req.query.endDate; // Format: YYYY-MM-DD

    // Create the query object
    const query = { transactionStatus: "Canceled" };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { "customerId.lastName": { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { transactionStatus: { $regex: searchTerm, $options: "i" } },
        { "planId.planName": { $regex: searchTerm, $options: "i" } },
        {
          $and: [
            { serviceIds: { $exists: true, $not: { $size: 0 } } },
            {
              serviceIds: {
                $elemMatch: {
                  serviceName: { $regex: searchTerm, $options: "i" },
                },
              },
            },
          ],
        },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Calculate the total count of transactions matching the query
    const totalCount = await Transaction.countDocuments(query);

    // Find transactions with pagination and populate user, plan, and service information
    const transactions = await Transaction.find(query)
      .sort({ updatedAt: -1 }) // Sort by createdAt in descending order
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate("customerId", "firstName lastName email") // Populate user information
      .populate({
        path: "planId",
        select: "planName", // Select the fields you want to include from the plan document
        populate: {
          path: "planService",
          model: "PlanServices",
          select: "serviceName servicePrice", // Select the fields you want to include from the planService document
        },
      })
      .populate("serviceIds", "serviceName servicePrice"); // Populate service information

    res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      pageSize,
      page,
      transactions,
    });
  } catch (error) {
    next(error);
  }
});

// get all transactions in Revoked status
exports.getAllTransactionsRevoked = asyncHandler(async (req, res, next) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;
    const searchTerm = req.query.searchTerm;

    // Parse the date range parameters from the request query
    const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
    const endDateParam = req.query.endDate; // Format: YYYY-MM-DD

    // Create the query object
    const query = { transactionStatus: "Revoked" };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { "customerId.lastName": { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { transactionStatus: { $regex: searchTerm, $options: "i" } },
        { "planId.planName": { $regex: searchTerm, $options: "i" } },
        {
          $and: [
            { serviceIds: { $exists: true, $not: { $size: 0 } } },
            {
              serviceIds: {
                $elemMatch: {
                  serviceName: { $regex: searchTerm, $options: "i" },
                },
              },
            },
          ],
        },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Calculate the total count of transactions matching the query
    const totalCount = await Transaction.countDocuments(query);

    // Find transactions with pagination and populate user, plan, and service information
    const transactions = await Transaction.find(query)
      .sort({ updatedAt: -1 }) // Sort by createdAt in descending order
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate("customerId", "firstName lastName email") // Populate user information
      .populate({
        path: "planId",
        select: "planName", // Select the fields you want to include from the plan document
        populate: {
          path: "planService",
          model: "PlanServices",
          select: "serviceName servicePrice", // Select the fields you want to include from the planService document
        },
      })
      .populate("serviceIds", "serviceName servicePrice"); // Populate service information

    res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      pageSize,
      page,
      transactions,
    });
  } catch (error) {
    next(error);
  }
});
exports.getTransactionsByCustomerId = asyncHandler(async (req, res, next) => {
  try {
    const customerId = req.params.customerId;
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;
    const searchTerm = req.query.searchTerm;

    // Check if the customerId is a valid ObjectId before querying the database
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid customerId" });
    }

    // Parse the date range parameters from the request query
    const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
    const endDateParam = req.query.endDate; // Format: YYYY-MM-DD

    // Create the query object
    const query = { customerId };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { transactionId: { $regex: searchTerm, $options: "i" } },
        { paymentMethod: { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Calculate the total count of transactions matching the query
    const totalCount = await Transaction.countDocuments(query);

    // Find transactions with pagination and populate user, plan, and service information
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate("customerId", "firstName lastName email") // Populate user information
      .populate({
        path: "planId",
        select: "planName", // Select the fields you want to include from the plan document
        populate: {
          path: "planService",
          model: "PlanServices",
          select: "serviceName servicePrice", // Select the fields you want to include from the planService document
        },
      })
      .populate("serviceIds", "serviceName servicePrice"); // Populate service information

    res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      pageSize,
      page,
      transactions,
    });
  } catch (error) {
    next(error);
  }
});

exports.getTransactionById = asyncHandler(async (req, res, next) => {
  try {
    const transactionID = req.params.id;

    // Find the transaction by transactionID and populate user, plan, and service information
    const transaction = await Transaction.findById(transactionID)
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order
      .populate(
        "customerId",
        "firstName lastName email contact1 contact2 address"
      ) // Populate user information
      .populate({
        path: "planId",
        select: "planName", // Select the fields you want to include from the plan document
        populate: {
          path: "planService",
          model: "PlanServices",
          select: "serviceName", // Select the fields you want to include from the planService document
        },
      })
      .populate({
        path: "user",
        select: "firstName lastName email profile contact1 contact2",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate(
        "serviceIds",
        "serviceName serviceDescription serviceAreaOfCover"
      ); // Populate service information

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    res.status(200).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
});

const { sendNotification } = require("../routes/sseRoutes");

// Transaction controller with SSE notification 2
exports.createTransaction = async (req, res) => {
  try {
    const { customerId, planId, serviceId, paymentMethod, amount } = req.body;

    const customer = await User.findById(customerId).populate({
      path: "plan",
      populate: {
        path: "planService",
        model: "PlanServices",
      },
    });

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, error: "Customer not found" });
    }

    if (!req.files || req.files.length === 0) {
      res.status(400).json({
        success: false,
        error: "No files were uploaded",
      });
      return;
    }

    const newFiles = req.files.map((file) => file.path.replace(/\\/g, "/"));

    let multipleFiles = ""; // Set default value as empty string if multipleFiles is undefined or null

    if (multipleFiles) {
      multipleFiles += ",";
    }

    multipleFiles += newFiles.join(",");

    const selectedPlan = customer.plan.find(
      (plan) => plan._id.toString() === planId
    );

    if (!selectedPlan || !selectedPlan.planService) {
      return res
        .status(404)
        .json({ success: false, error: "Plan not found for the customer" });
    }

    const selectedService = selectedPlan.planService.find(
      (service) => service._id.toString() === serviceId
    );

    if (!selectedService) {
      return res.status(404).json({
        success: false,
        error: "Service not found in the customer's plan",
      });
    }

    if (selectedService.remainingBalance === undefined) {
      return res.status(400).json({
        success: false,
        error: "Service does not have a remaining balance",
      });
    }

    const transactions = await Transaction.find({
      customerId,
      serviceIds: serviceId,
    }).lean();

    const totalAmountSpent = transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0
    );
    const availableBalance = selectedService.servicePrice - totalAmountSpent;

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        error: "Transaction amount exceeds available balance",
      });
    }

    let transactionStatus = "Pending";
    let remainingBalance = 0;

    if (selectedService.preAuthorization === "yes") {
      transactionStatus = "Pending";

      const notificationMessage = "Transaction requires pre-authorization";
      remainingBalance = availableBalance - amount; // Calculate the remaining balance after the transaction
      await selectedService.updateOne({ remainingBalance }); // Update the remaining balance in the database

      const newTransaction = await Transaction.create({
        customerId,
        planId,
        serviceIds: [serviceId],
        paymentMethod,
        amount,
        amountSpent: 0,
        remainingBalance,
        transactionStatus,
        multipleFiles,
        preAuthorization: selectedService.preAuthorization,
        adminApprovalStatus: false,
        companyPartner: req.user.partnerUser._id,
        user: req.user.id,
      });
      sendNotification(notificationMessage, newTransaction._id);

      res
        .status(201)
        .json({ success: true, remainingBalance, transaction: newTransaction });
    } else {
      remainingBalance = selectedService.remainingBalance - amount; // Calculate the remaining balance after the transaction
      await selectedService.updateOne({ remainingBalance }); // Update the remaining balance in the database

      transactionStatus = "Completed";

      const newTransaction = await Transaction.create({
        customerId,
        planId,
        serviceIds: [serviceId],
        paymentMethod,
        amount,
        amountSpent: amount,
        remainingBalance,
        transactionStatus,
        multipleFiles,
        preAuthorization: selectedService.preAuthorization,
        adminApprovalStatus: false,
        companyPartner: req.user.partnerUser._id,
        user: req.user.id,
      });

      res
        .status(201)
        .json({ success: true, remainingBalance, transaction: newTransaction });
    }
  } catch (error) {
    console.error("Error in createTransaction:", error);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
};

// create transction hospital
exports.createTransactionHospital = async (req, res) => {
  try {
    let {
      customerId,
      planId,
      serviceId,
      paymentMethod,
      amount,
      customerName,
      customerCompany,
    } = req.body;

    if (customerCompany === "") {
      customerCompany = null; // Set it to null if it's an empty string
    }

    console.log("Customer Company: ", customerCompany);
    const customer = await User.findById(customerId).populate({
      path: "plan",
      populate: {
        path: "planService",
        model: "PlanServices",
      },
    });

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, error: "Customer not found" });
    }

    if (!req.files || req.files.length === 0) {
      res.status(400).json({
        success: false,
        error: "No files were uploaded",
      });
      return;
    }

    let newFiles = req.files.map((file) => file.path.replace(/\\/g, "/"));

    let multipleFiles = ""; // Set default value as an empty string if multipleFiles is undefined or null

    if (multipleFiles) {
      multipleFiles += ",";
    }

    multipleFiles += newFiles.join(",");

    let selectedPlan = customer.plan.find(
      (plan) => plan._id.toString() === planId
    );

    if (!selectedPlan || !selectedPlan.planService) {
      return res
        .status(404)
        .json({ success: false, error: "Plan not found for the customer" });
    }

    let selectedService = selectedPlan.planService.find(
      (service) => service._id.toString() === serviceId
    );

    if (!selectedService) {
      return res.status(404).json({
        success: false,
        error: "Service not found in the customer's plan",
      });
    }

    if (selectedService.remainingBalance === undefined) {
      return res.status(400).json({
        success: false,
        error: "Service does not have a remaining balance",
      });
    }

    let transactions = await Transaction.find({
      customerId,
      serviceIds: serviceId,
    }).lean();

    let totalAmountSpent = transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0
    );
    let availableBalance = selectedService.servicePrice - totalAmountSpent;

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        error: "Transaction amount exceeds available balance",
      });
    }

    let transactionStatus = "In progress";
    let remainingBalance = 0;

    if (selectedService.preAuthorization === "yes") {
      // For pre-authorization, set the initial status to "Pending" in the status history
      transactionStatus = "Pending";
      let statusHistory = [
        {
          status: "Pending",
          changedBy: req.user.id, // You may need to adjust this depending on how you track who changed the status
        },
      ];

      let notificationMessage = "Transaction requires pre-authorization";
      remainingBalance = availableBalance - amount; // Calculate the remaining balance after the transaction

      await selectedService.updateOne({ remainingBalance }); // Update the remaining balance in the database

      let newTransaction = await Transaction.create({
        customerId,
        customerName,
        customerCompany,
        planId,
        serviceIds: [serviceId],
        paymentMethod,
        amount,
        amountSpent: 0,
        remainingBalance,
        transactionStatus,
        multipleFiles,
        preAuthorization: selectedService.preAuthorization,
        adminApprovalStatus: false,
        companyPartner: req.user.partnerUser._id,
        user: req.user.id,
        statusHistory: statusHistory, // Add the initial status history
      });
      sendNotification(notificationMessage, newTransaction._id);

      res
        .status(201)
        .json({ success: true, remainingBalance, transaction: newTransaction });
    } else {
      remainingBalance = selectedService.remainingBalance - amount; // Calculate the remaining balance after the transaction
      await selectedService.updateOne({ remainingBalance }); // Update the remaining balance in the database
      // For non-pre-authorization, set the initial status to "In progress" in the status history
      transactionStatus = "In progress";
      let statusHistory = [
        {
          status: "In progress",
          changedBy: req.user.id, // You may need to adjust this depending on how you track who changed the status
        },
      ];

      let newTransaction = await Transaction.create({
        customerId,
        customerName,
        customerCompany,
        planId,
        serviceIds: [serviceId],
        paymentMethod,
        amount,
        amountSpent: amount,
        remainingBalance,
        transactionStatus,
        multipleFiles,
        preAuthorization: selectedService.preAuthorization,
        adminApprovalStatus: false,
        companyPartner: req.user.partnerUser._id,
        user: req.user.id,
        statusHistory: statusHistory, // Add the initial status history
      });

      res
        .status(201)
        .json({ success: true, remainingBalance, transaction: newTransaction });
    }
  } catch (error) {
    console.error("Error in createTransaction:", error);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
};

// create transction farmacy
exports.createTransactionFarmacy = async (req, res) => {
  try {
    const {
      customerId,
      planId,
      serviceId,
      paymentMethod,
      amount,
      customerName,
      customerCompany,
    } = req.body;

    if (customerCompany === undefined) {
      return res.status(400).json({ error: "customerCompany is required" });
    }

    const customer = await User.findById(customerId).populate({
      path: "plan",
      populate: {
        path: "planService",
        model: "PlanServices",
      },
    });

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, error: "Customer not found" });
    }

    if (!req.files || req.files.length === 0) {
      res.status(400).json({
        success: false,
        error: "No files were uploaded",
      });
      return;
    }

    const newFiles = req.files.map((file) => file.path.replace(/\\/g, "/"));

    let multipleFiles = ""; // Set default value as empty string if multipleFiles is undefined or null

    if (multipleFiles) {
      multipleFiles += ",";
    }

    multipleFiles += newFiles.join(",");

    const selectedPlan = customer.plan.find(
      (plan) => plan._id.toString() === planId
    );

    if (!selectedPlan || !selectedPlan.planService) {
      return res
        .status(404)
        .json({ success: false, error: "Plan not found for the customer" });
    }

    const selectedService = selectedPlan.planService.find(
      (service) => service._id.toString() === serviceId
    );

    if (!selectedService) {
      return res.status(404).json({
        success: false,
        error: "Service not found in the customer's plan",
      });
    }

    if (selectedService.remainingBalance === undefined) {
      return res.status(400).json({
        success: false,
        error: "Service does not have a remaining balance",
      });
    }

    const transactions = await Transaction.find({
      customerId,
      serviceIds: serviceId,
    }).lean();

    const totalAmountSpent = transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0
    );
    const availableBalance = selectedService.servicePrice - totalAmountSpent;

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        error: "Transaction amount exceeds available balance",
      });
    }

    let transactionStatus = "Pending";
    let remainingBalance = 0;

    if (selectedService.preAuthorization === "yes") {
      transactionStatus = "Pending";

      const notificationMessage = "Transaction requires pre-authorization";
      remainingBalance = availableBalance - amount; // Calculate the remaining balance after the transaction
      await selectedService.updateOne({ remainingBalance }); // Update the remaining balance in the database

      const newTransaction = await Transaction.create({
        customerId,
        customerName,
        customerCompany,
        planId,
        serviceIds: [serviceId],
        paymentMethod,
        amount,
        amountSpent: 0,
        remainingBalance,
        transactionStatus,
        multipleFiles,
        preAuthorization: selectedService.preAuthorization,
        adminApprovalStatus: false,
        companyPartner: req.user.partnerUser._id,
        user: req.user.id,
      });
      sendNotification(notificationMessage, newTransaction._id);

      res
        .status(201)
        .json({ success: true, remainingBalance, transaction: newTransaction });
    } else {
      remainingBalance = selectedService.remainingBalance - amount; // Calculate the remaining balance after the transaction
      await selectedService.updateOne({ remainingBalance }); // Update the remaining balance in the database

      transactionStatus = "Completed";

      const newTransaction = await Transaction.create({
        customerId,
        customerName,
        customerCompany,
        planId,
        serviceIds: [serviceId],
        paymentMethod,
        amount,
        amountSpent: amount,
        remainingBalance,
        transactionStatus,
        multipleFiles,
        preAuthorization: selectedService.preAuthorization,
        adminApprovalStatus: false,
        companyPartner: req.user.partnerUser._id,
        user: req.user.id,
      });

      res
        .status(201)
        .json({ success: true, remainingBalance, transaction: newTransaction });
    }
  } catch (error) {
    console.error("Error in createTransaction:", error);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
};

// Revoke an transaction ?? Revert money

exports.revokeTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { revokeReason } = req.body;

    // Find the transaction by its ID
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    // Check if the transaction is in "Pending" status (Requires admin approval)
    if (transaction.transactionStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        error: "Cannot revoke a transaction that is not pending",
      });
    }

    // Create a status change object for the revocation
    const statusChange = {
      status: "Revoked",
      changedBy: req.user._id, // Assuming you have the user/admin ID who made the change
      date: new Date(), // Current date and time
    };

    // Push the revocation status change into the statusHistory array
    transaction.statusHistory.push(statusChange);

    // Find the associated plan service to update the remaining balance
    const selectedService = await PlanServices.findById(
      transaction.serviceIds[0]
    );

    // Store the previous remaining balance of the associated plan service
    const previousRemainingBalance = selectedService.remainingBalance;

    // Add the transaction amount back to the plan service's remaining balance
    selectedService.remainingBalance += transaction.amount;
    await selectedService.save();

    // Store the actual remaining balance of the associated plan service after revoking
    const actualRemainingBalance = selectedService.remainingBalance;

    // Calculate the difference in remaining balance and update the transaction's remaining balance
    const differenceInRemainingBalance =
      actualRemainingBalance - previousRemainingBalance;
    transaction.remainingBalance += differenceInRemainingBalance;

    // Set the transaction status to "Revoked"
    transaction.transactionStatus = "Revoked";
    transaction.revokedAmount = transaction.amount;
    transaction.amount = 0;
    // transaction.revokeReason = revokeReason;

    transaction.revokeReason = revokeReason; // Add the reason for revoking the transaction

    // Save the updated transaction
    await transaction.save();

    // Store the previous remaining balance of the transaction
    const previousTransactionRemainingBalance =
      previousRemainingBalance - transaction.amount;

    // Store the actual remaining balance of the transaction after revoking
    const actualTransactionRemainingBalance = transaction.remainingBalance;

    // Send notification
    const notificationMessage = "Your transaction has been revoked";
    sendNotification(notificationMessage, transactionId);

    res.status(200).json({
      success: true,
      message: "Transaction revoked successfully",
      previousRemainingBalance,
      actualRemainingBalance,
      previousTransactionRemainingBalance,
      actualTransactionRemainingBalance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
};

// Cancel an transaction ?? Revert money

exports.cancelTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { cancelReason } = req.body;

    console.log("Body: ", req.body);
    // validate if have cancelation Reason
    if (!cancelReason) {
      return res.status(400).json({
        success: false,
        error: "Cancelation reason is required",
      });
    }

    // Find the transaction by its ID
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    // Check if the transaction is in "Pending" status (Requires admin approval)
    // if (transaction.transactionStatus !== "Pending") {
    //   return res.status(400).json({
    //     success: false,
    //     error: "Cannot revoke a transaction that is not pending",
    //   });
    // }

    // Create a status change object for the revocation
    const statusChange = {
      status: "Canceled",
      changedBy: req.user._id, // Assuming you have the user/admin ID who made the change
      date: new Date(), // Current date and time
    };

    // Push the revocation status change into the statusHistory array
    transaction.statusHistory.push(statusChange);

    // Find the associated plan service to update the remaining balance
    const selectedService = await PlanServices.findById(
      transaction.serviceIds[0]
    );

    // Store the previous remaining balance of the associated plan service
    const previousRemainingBalance = selectedService.remainingBalance;

    // Add the transaction amount back to the plan service's remaining balance
    selectedService.remainingBalance += transaction.amount;
    await selectedService.save();

    // Store the actual remaining balance of the associated plan service after revoking
    const actualRemainingBalance = selectedService.remainingBalance;

    // Calculate the difference in remaining balance and update the transaction's remaining balance
    const differenceInRemainingBalance =
      actualRemainingBalance - previousRemainingBalance;
    transaction.remainingBalance += differenceInRemainingBalance;

    // Set the transaction status to "Revoked"
    transaction.transactionStatus = "Canceled";
    transaction.cancelReason = cancelReason; // Add the reason for revoking the transaction
    transaction.revokedAmount = transaction.amount;
    transaction.amount = 0;

    // Save the updated transaction
    await transaction.save();

    // Store the previous remaining balance of the transaction
    const previousTransactionRemainingBalance =
      previousRemainingBalance - transaction.amount;

    // Store the actual remaining balance of the transaction after revoking
    const actualTransactionRemainingBalance = transaction.remainingBalance;

    // Send notification
    const notificationMessage = "Your transaction has been canceled";
    sendNotification(notificationMessage, transactionId);

    res.status(200).json({
      success: true,
      message: "Transaction canceled successfully",
      previousRemainingBalance,
      actualRemainingBalance,
      previousTransactionRemainingBalance,
      actualTransactionRemainingBalance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
};

// controllers/transactionController.js

exports.approveTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Find the transaction by its ID
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    // Check if the transaction is in "Pending" status
    if (transaction.transactionStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        error: "Cannot approve a transaction that is not pending",
      });
    }

    // Create a status change object for the approval
    const statusChange = {
      status: "Aproved",
      changedBy: req.user._id, // Assuming you have the user/admin ID who made the change
      date: new Date(), // Current date and time
    };

    // Push the approval status change into the statusHistory array
    transaction.statusHistory.push(statusChange);

    // Update the transaction status to "Approved"
    transaction.transactionStatus = "Aproved";
    // Update the adminApprovalStatus status to "Approved"
    transaction.adminApprovalStatus = true;
    await transaction.save();

    // Send notification for transaction approval
    const notificationMessage = "Transaction approved";
    sendNotification(notificationMessage, transactionId);

    res.status(200).json({
      success: true,
      message: "Transaction approved successfully",
      transaction,
    });
  } catch (error) {
    console.error("Error in approveTransaction:", error);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
};

//get my transactions
// exports.getMyTransactions = asyncHandler(async (req, res, next) => {
//   try {
//     // Parse pagination parameters from the request query
//     const pageSize = Number(req.query.pageSize) || 10;
//     const page = Number(req.query.pageNumber) || 1;

//     // Parse the search term from the request query
//     const searchTerm = req.query.searchTerm;

//     // Create the query object
//     const query = { user: req.user.id };

//     // Add search criteria if searchTerm is provided
//     if (searchTerm) {
//       query.$or = [
//         { "customerId.firstName": { $regex: searchTerm, $options: "i" } },
//         { "customerId.lastName": { $regex: searchTerm, $options: "i" } },
//         { invoiceNumber: { $regex: searchTerm, $options: "i" } },
//         { transactionStatus: { $regex: searchTerm, $options: "i" } },
//         { "planId.planName": { $regex: searchTerm, $options: "i" } },
//         {
//           $and: [
//             { serviceIds: { $exists: true, $not: { $size: 0 } } },
//             {
//               serviceIds: {
//                 $elemMatch: {
//                   serviceName: { $regex: searchTerm, $options: "i" },
//                 },
//               },
//             },
//           ],
//         },
//       ];
//     }

//     // Count the total number of transactions that match the query
//     const totalCount = await Transaction.countDocuments(query);

//     // Find transactions with pagination and populate related information
//     const transactions = await Transaction.find(query)
//       .skip(pageSize * (page - 1))
//       .limit(pageSize)
//       .populate("customerId", "firstName lastName email")
//       .populate({
//         path: "planId",
//         select: "planName",
//       })
//       .populate({
//         path: "user",
//         select: "firstName lastName email profile",
//         populate: {
//           path: "partnerUser",
//           model: "Partner",
//           select: "partnerName email contact1 contact2 avatar status",
//         },
//       })
//       .populate({
//         path: "serviceIds",
//         select: "serviceName",
//       });

//     // Return the paginated and searched transactions
//     res.status(200).json({
//       success: true,
//       count: transactions.length,
//       total: totalCount,
//       pageSize,
//       page,
//       transactions,
//     });
//   } catch (error) {
//     next(error);
//   }
// });

exports.getMyTransactions = asyncHandler(async (req, res, next) => {
  try {
    // Parse pagination parameters from the request query
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;

    // Parse the search term from the request query
    const searchTerm = req.query.searchTerm;

    // Parse the date range parameters from the request query
    const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
    const endDateParam = req.query.endDate; // Format: YYYY-MM-DD

    // Create the query object
    const query = { user: req.user.id };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { "customerId.lastName": { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { transactionStatus: { $regex: searchTerm, $options: "i" } },
        { "planId.planName": { $regex: searchTerm, $options: "i" } },
        {
          $and: [
            { serviceIds: { $exists: true, $not: { $size: 0 } } },
            {
              serviceIds: {
                $elemMatch: {
                  serviceName: { $regex: searchTerm, $options: "i" },
                },
              },
            },
          ],
        },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Count the total number of transactions that match the query
    const totalCount = await Transaction.countDocuments(query);

    // Find transactions with pagination and populate related information
    const transactions = await Transaction.find(query)
      .sort({
        updatedAt: -1,
      }) // Sort by createdAt in descending order
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate("customerId", "firstName lastName email")
      .populate({
        path: "planId",
        select: "planName",
      })
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate({
        path: "serviceIds",
        select: "serviceName",
      })
      .populate({
        path: "customerId",
        select: "firstName lastName email",
        populate: {
          path: "company",
          model: "Company",
          select: "companyName contact1 contact2 avatar status",
        },
      });

    // Return the paginated and searched transactions
    res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      pageSize,
      page,
      transactions,
    });
  } catch (error) {
    next(error);
  }
});

//all transaction form a partner : get from partner user loged
exports.getTransactionsByPartnerUser = async (req, res, next) => {
  try {
    // Assuming req.user contains the authenticated user's information
    const partnerCompanyId = req.user.partnerUser._id;

    // Parse pagination parameters from the request query
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;

    // Parse the search term from the request query
    const searchTerm = req.query.searchTerm;

    // Parse the date range parameters from the request query
    const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
    const endDateParam = req.query.endDate; // Format: YYYY-MM-DD

    // Create the query object
    const query = { companyPartner: partnerCompanyId };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { "customerId.lastName": { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { transactionStatus: { $regex: searchTerm, $options: "i" } },
        { "planId.planName": { $regex: searchTerm, $options: "i" } },
        {
          $and: [
            { serviceIds: { $exists: true, $not: { $size: 0 } } },
            {
              serviceIds: {
                $elemMatch: {
                  serviceName: { $regex: searchTerm, $options: "i" },
                },
              },
            },
          ],
        },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Count the total number of transactions that match the query
    const totalCount = await Transaction.countDocuments(query);

    // Find transactions with pagination and populate related information
    const transactions = await Transaction.find(query)
      .sort({ updatedAt: -1 }) // Sort by createdAt in descending order
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate("companyPartner", "partnerName contact1 contact2 email")
      .populate({
        path: "customerId",
        select: "firstName lastName email",
      })
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate({
        path: "planId",
        select: "planName",
      })
      .populate({
        path: "serviceIds",
        select: "serviceName",
      })
      .populate({
        path: "customerId",
        select: "firstName lastName email",
        populate: {
          path: "company",
          model: "Company",
          select: "companyName contact1 contact2 avatar status",
        },
      });

    // Return the paginated and searched transactions
    res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      pageSize,
      page,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

//all transaction form a customer for a especific partner
exports.getTransactionsHistory = async (req, res, next) => {
  try {
    // Assuming req.user contains the authenticated user's information
    const partnerCompanyId = req.user.partnerUser._id;

    // Parse pagination parameters from the request query
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;

    // Parse the search term from the request query
    const searchTerm = req.query.searchTerm;
    const userId = req.params.id;

    // Parse the date range parameters from the request query
    const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
    const endDateParam = req.query.endDate; // Format: YYYY-MM-DD

    // Create the query object
    const query = {
      $and: [
        { companyPartner: partnerCompanyId }, // Filter by companyPartner
        { customerId: userId }, // Filter by customerId
      ],
    };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { "customerId.lastName": { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { transactionStatus: { $regex: searchTerm, $options: "i" } },
        { "planId.planName": { $regex: searchTerm, $options: "i" } },
        {
          $and: [
            { serviceIds: { $exists: true, $not: { $size: 0 } } },
            {
              serviceIds: {
                $elemMatch: {
                  serviceName: { $regex: searchTerm, $options: "i" },
                },
              },
            },
          ],
        },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Count the total number of transactions that match the query
    const totalCount = await Transaction.countDocuments(query);

    // Find transactions with pagination and populate related information
    const transactions = await Transaction.find(query)
      .sort({ updatedAt: -1 }) // Sort by createdAt in descending order
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate("companyPartner", "partnerName contact1 contact2 email")
      .populate({
        path: "customerId",
        select: "firstName lastName email",
      })
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate({
        path: "planId",
        select: "planName",
      })
      .populate({
        path: "serviceIds",
        select: "serviceName",
      })
      .populate({
        path: "customerId",
        select: "firstName lastName email",
        populate: {
          path: "company",
          model: "Company",
          select: "companyName contact1 contact2 avatar status",
        },
      });

    // Return the paginated and searched transactions
    res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      pageSize,
      page,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteFile = async (req, res, next) => {
  try {
    const { transactionId } = req.body;
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
      const trans = await Transaction.findById(transactionId);
      if (!trans) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      // Remove the file name from the user's file string
      const files = trans.multipleFiles.split(",");
      const fileIndex = files.indexOf(fileName);
      if (fileIndex !== -1) {
        files.splice(fileIndex, 1);
        trans.multipleFiles = files.join(",");
        await trans.save();
      }

      res.status(200).json({
        success: true,
        message: "File deleted",
      });
    } catch (error) {
      console.error("Error deleting file from Transaction table:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete the file from the Transaction table",
      });
    }
  } catch (error) {
    return next(error);
  }
};

exports.uploadTransactionMultipleFiles = async (req, res, next) => {
  try {
    const id = req.params.id;
    const existingUser = await Transaction.findById(id);

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

    const fileUpload = await Transaction.findByIdAndUpdate(
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

exports.getLogedPartnetCompany = async (req, res, next) => {
  try {
    // Retrieve the PartnerCompanyId from the authenticated user object
    const partnerCompanyId = req.user.partnerUser._id;

    // Convert the ObjectId to a string
    const partnerCompanyIdStr = partnerCompanyId.toString();

    // Log the retrieved PartnerCompanyId
    // console.log(partnerCompanyIdStr);

    // Send the PartnerCompanyId as a response to the client
    res.status(200).json({ partnerCompanyId: partnerCompanyIdStr });
  } catch (error) {
    // Handle errors if needed
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getLogedCustomerTransactions = asyncHandler(async (req, res, next) => {
  try {
    // Parse pagination parameters from the request query
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;

    // Parse the search term from the request query
    const searchTerm = req.query.searchTerm;

    // Parse the date range parameters from the request query
    const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
    const endDateParam = req.query.endDate; // Format: YYYY-MM-DD

    // Create the query object
    const query = { customerId: req.user.id };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { "customerId.lastName": { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { transactionStatus: { $regex: searchTerm, $options: "i" } },
        { "planId.planName": { $regex: searchTerm, $options: "i" } },
        {
          $and: [
            { serviceIds: { $exists: true, $not: { $size: 0 } } },
            {
              serviceIds: {
                $elemMatch: {
                  serviceName: { $regex: searchTerm, $options: "i" },
                },
              },
            },
          ],
        },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Count the total number of transactions that match the query
    const totalCount = await Transaction.countDocuments(query);

    // Find transactions with pagination and populate related information
    const transactions = await Transaction.find(query)
      .sort({ updatedAt: -1 }) // Sort by createdAt in descending order
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate("customerId", "firstName lastName email")
      .populate({
        path: "planId",
        select: "planName",
      })
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate({
        path: "serviceIds",
        select: "serviceName",
      })
      .populate({
        path: "customerId",
        select: "firstName lastName email",
        populate: {
          path: "company",
          model: "Company",
          select: "companyName contact1 contact2 avatar status",
        },
      });

    // Return the paginated and searched transactions
    res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      pageSize,
      page,
      transactions,
    });
  } catch (error) {
    next(error);
  }
});

exports.getTransactionsFromCompany = asyncHandler(async (req, res, next) => {
  try {
    // Parse pagination parameters from the request query
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.pageNumber) || 1;

    // Parse the search term from the request query
    const searchTerm = req.query.searchTerm;

    // Parse the date range parameters from the request query
    const startDateParam = req.query.startDate; // Format: YYYY-MM-DD
    const endDateParam = req.query.endDate; // Format: YYYY-MM-DD

    // Create the query object const transactionID = req.params.id;
    const query = {
      customerCompany: req.params.id,
    };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      query.$or = [
        {
          customerName: { $regex: searchTerm, $options: "i" },
        },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { transactionStatus: { $regex: searchTerm, $options: "i" } },
        { "planId.planName": { $regex: searchTerm, $options: "i" } },
        {
          $and: [
            { serviceIds: { $exists: true, $not: { $size: 0 } } },
            {
              serviceIds: {
                $elemMatch: {
                  serviceName: { $regex: searchTerm, $options: "i" },
                },
              },
            },
          ],
        },
      ];
    }

    // Add date range criteria if both startDate and endDate are provided
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Only add date range criteria if startDate and endDate are valid dates
        query.createdAt = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    // Count the total number of transactions that match the query
    const totalCount = await Transaction.countDocuments(query);

    // Find transactions with pagination and populate related information
    const transactions = await Transaction.find(query)
      .sort({ updatedAt: -1 }) // Sort by createdAt in descending order
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate("customerId", "firstName lastName email")
      .populate({
        path: "planId",
        select: "planName",
      })
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate({
        path: "serviceIds",
        select: "serviceName",
      })
      .populate({
        path: "customerId",
        select: "firstName lastName email",
        populate: {
          path: "company",
          model: "Company",
          select: "companyName contact1 contact2 avatar status",
        },
      });

    // Return the paginated and searched transactions
    res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      pageSize,
      page,
      transactions,
    });
  } catch (error) {
    next(error);
  }
});

exports.generateInvoicePDF1 = asyncHandler(async (req, res, next) => {
  try {
    const transactionID = req.params.transactionID;

    // Fetch the transaction by its ID
    const transaction = await Transaction.findById(transactionID)
      .populate("customerId")
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate(
        "serviceIds",
        "serviceName serviceDescription serviceAreaOfCover"
      );

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    const formattedAmount = transaction.amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD", // Change the currency code as needed
      minimumFractionDigits: 2, // Adjust to control the number of decimal places
    });

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 600]); // Define page size (width x height)

    // Set the Content-Disposition header to prompt download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${transaction._id}.pdf`
    );
    res.setHeader("Content-type", "application/pdf");

    // Define custom styles
    const text = "Payment to:";
    const text2 = "Amount:";
    const textSize = 11;
    const fontSize = 12;
    const fontColor = rgb(0, 0, 0); // Black color
    const mainFontColor = rgb(241 / 255, 95 / 255, 30 / 255); // RGB color for #f15f1e
    const textWidth = textSize * text.length; // Calculate the width based on font size and text length

    // Load and embed the logo image
    const logoImageBytes = fs.readFileSync("controllers/logo.png"); // Replace 'logo.png' with the actual path to your logo
    const logoImage = await pdfDoc.embedPng(logoImageBytes);
    const topSpace = 20; // Adjust the space as needed
    // Add content to the PDF with custom styles
    const { width, height } = page.getSize();

    // Draw the logo image
    // page.drawImage(logoImage, {
    //   x: 50, // X-coordinate for the logo position
    //   y: height - 50, // Y-coordinate for the logo position
    //   width: 50, // Width of the logo image
    //   height: 50, // Height of the logo image
    // });

    // Continue adding other content as before
    page.drawText("Invoice", {
      // x: width / 2,
      x: 50,
      y: height - 80,
      size: 16,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica-Bold"),
      align: "center",
    });

    page.drawText(`Receipt: ${transaction.invoiceNumber}`, {
      x: 50,
      y: height - 100,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.updatedAt.toLocaleDateString()}`, {
      x: 50,
      y: height - 120,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText("Client Details:", {
      x: 50,
      y: height - 160,
      size: 11,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica-Bold"),
    });

    page.drawText(`${transaction.customerName}`, {
      x: 50,
      y: height - 180,
      size: 13,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.customerId.email}`, {
      x: 50,
      y: height - 200,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.customerId.address}`, {
      x: 50,
      y: height - 220,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(
      `${transaction.customerId.contact1} , ${transaction.customerId.contact2}`,
      {
        x: 50,
        y: height - 240,
        size: 10,
        color: fontColor,
        font: await pdfDoc.embedFont("Helvetica"),
      }
    );

    // Payment to
    page.drawText(text, {
      x: width - textWidth - 20, // Align to the right by subtracting the text width from the page width
      y: height - 160,
      size: textSize,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica-Bold"),
    });

    page.drawText(`${transaction.user.partnerUser.partnerName}`, {
      x: width - textWidth - 20,
      y: height - 180,
      size: 13,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.user.partnerUser.email}`, {
      x: width - textWidth - 20,
      y: height - 200,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(
      `${transaction.user.partnerUser.contact1} , ${transaction.user.partnerUser.contact2}`,
      {
        x: width - textWidth - 20,
        y: height - 220,
        size: 10,
        color: fontColor,
        font: await pdfDoc.embedFont("Helvetica"),
      }
    );

    page.drawText("Service:", {
      x: 50,
      y: height - 300,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawLine({
      start: { x: 50, y: height - 305 },
      end: { x: 50 + 500, y: height - 305 },
      thickness: 1, // Adjust line thickness as needed
      color: fontColor, // Specify the color for the line
    });

    page.drawText(`${transaction.serviceIds[0].serviceName}`, {
      x: 50,
      y: height - 320,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.serviceIds[0].serviceDescription}`, {
      x: 50,
      y: height - 340,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.serviceIds[0].serviceAreaOfCover}`, {
      x: 50,
      y: height - 360,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });
    page.drawLine({
      start: { x: 50, y: height - 370 },
      end: { x: 50 + 500, y: height - 370 },
      thickness: 1, // Adjust line thickness as needed
      color: fontColor, // Specify the color for the line
    });

    page.drawText("Processed by:", {
      x: 50,
      y: height - 410,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(
      `${transaction.user.firstName} ${transaction.user.lastName}`,
      {
        x: 50,
        y: height - 430,
        size: 13,
        color: mainFontColor,
        font: await pdfDoc.embedFont("Helvetica"),
      }
    );
    page.drawText(
      `${transaction.user.partnerUser.contact1} , ${transaction.user.partnerUser.contact2}`,
      {
        x: 50,
        y: height - 450,
        size: 11,
        color: fontColor,
        font: await pdfDoc.embedFont("Helvetica"),
      }
    );

    page.drawText(text2, {
      x: width - textWidth - 50, // Align to the right by subtracting the text width from the page width
      y: height - 410,
      size: 11,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(formattedAmount, {
      x: width - textWidth - 50,
      y: height - 430,
      size: 10,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText("Taxes included", {
      x: width - textWidth - 50, // Align to the right by subtracting the text width from the page width
      y: height - 450,
      size: 11,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });
    // Draw lines or shapes as needed
    // "  "

    // Serialize the PDF document to a buffer
    const pdfBytes = await pdfDoc.save();

    // Send the generated PDF buffer in the response
    res.end(pdfBytes);
  } catch (error) {
    next(error);
  }
});

exports.generateInvoicePDF = asyncHandler(async (req, res, next) => {
  try {
    const transactionID = req.params.transactionID;

    const transaction = await Transaction.findById(transactionID)
      .populate("customerId")
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate(
        "serviceIds",
        "serviceName serviceDescription serviceAreaOfCover"
      );

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    const formattedAmount = transaction.amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD", // Change the currency code as needed
      minimumFractionDigits: 2, // Adjust to control the number of decimal places
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 600]);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${transaction._id}.pdf`
    );
    res.setHeader("Content-type", "application/pdf");

    const text = "Payment to:";
    const text2 = "Amount:";
    const textSize = 11;
    const fontColor = rgb(0, 0, 0);
    const mainFontColor = rgb(241 / 255, 95 / 255, 30 / 255);

    // Calculate the width based on font size and text length
    const textWidth = textSize * text.length;

    const logoImageBytes = fs.readFileSync("controllers/logo.png");
    const logoImage = await pdfDoc.embedPng(logoImageBytes);

    const { width, height } = page.getSize();

    page.drawText("Invoice", {
      x: 50,
      y: height - 80,
      size: 16,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica-Bold"),
      align: "center",
    });

    page.drawText(`Receipt: ${transaction.invoiceNumber}`, {
      x: 50,
      y: height - 100,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.updatedAt.toLocaleDateString()}`, {
      x: 50,
      y: height - 120,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText("Client Details:", {
      x: 50,
      y: height - 160,
      size: 11,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica-Bold"),
    });

    page.drawText(`${transaction.customerName}`, {
      x: 50,
      y: height - 180,
      size: 13,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.customerId.email}`, {
      x: 50,
      y: height - 200,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.customerId.address}`, {
      x: 50,
      y: height - 220,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(
      `${transaction.customerId.contact1} , ${transaction.customerId.contact2}`,
      {
        x: 50,
        y: height - 240,
        size: 10,
        color: fontColor,
        font: await pdfDoc.embedFont("Helvetica"),
      }
    );

    page.drawText(text, {
      x: width - textWidth - 50,
      y: height - 160,
      size: textSize,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica-Bold"),
    });

    page.drawText(`${transaction.user.partnerUser.partnerName}`, {
      x: width - textWidth - 50,
      y: height - 180,
      size: 13,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.user.partnerUser.email}`, {
      x: width - textWidth - 50,
      y: height - 200,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(
      `${transaction.user.partnerUser.contact1} , ${transaction.user.partnerUser.contact2}`,
      {
        x: width - textWidth - 50,
        y: height - 220,
        size: 10,
        color: fontColor,
        font: await pdfDoc.embedFont("Helvetica"),
      }
    );

    page.drawText("Service:", {
      x: 50,
      y: height - 300,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawLine({
      start: { x: 50, y: height - 305 },
      end: { x: 50 + 500, y: height - 305 },
      thickness: 1,
      color: fontColor,
    });

    page.drawText(`${transaction.serviceIds[0].serviceName}`, {
      x: 50,
      y: height - 320,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.serviceIds[0].serviceDescription}`, {
      x: 50,
      y: height - 340,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.serviceIds[0].serviceAreaOfCover}`, {
      x: 50,
      y: height - 360,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });
    page.drawLine({
      start: { x: 50, y: height - 370 },
      end: { x: 50 + 500, y: height - 370 },
      thickness: 1,
      color: fontColor,
    });

    page.drawText("Processed by:", {
      x: 50,
      y: height - 410,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(
      `${transaction.user.firstName} ${transaction.user.lastName}`,
      {
        x: 50,
        y: height - 430,
        size: 13,
        color: mainFontColor,
        font: await pdfDoc.embedFont("Helvetica"),
      }
    );
    page.drawText(
      `${transaction.user.partnerUser.contact1} , ${transaction.user.partnerUser.contact2}`,
      {
        x: 50,
        y: height - 450,
        size: 11,
        color: fontColor,
        font: await pdfDoc.embedFont("Helvetica"),
      }
    );

    page.drawText(text2, {
      x: width - textWidth - 50,
      y: height - 410,
      size: 11,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(formattedAmount, {
      x: width - textWidth - 50,
      y: height - 430,
      size: 10,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText("Taxes included", {
      x: width - textWidth - 50,
      y: height - 450,
      size: 11,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    const pdfBytes = await pdfDoc.save();

    const pdfStream = new stream.PassThrough();
    pdfStream.end(pdfBytes);

    pdfStream.on("data", (chunk) => {
      res.write(chunk);
    });

    pdfStream.on("end", () => {
      res.end();
    });
  } catch (error) {
    next(error);
  }
});

exports.generateMobileInvoicePDF = asyncHandler(async (req, res, next) => {
  try {
    const transactionID = req.params.transactionID;

    const transaction = await Transaction.findById(transactionID)
      .populate("customerId")
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate(
        "serviceIds",
        "serviceName serviceDescription serviceAreaOfCover"
      );

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    const formattedAmount = transaction.amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD", // Change the currency code as needed
      minimumFractionDigits: 2, // Adjust to control the number of decimal places
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 600]);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${transaction._id}.pdf`
    );
    res.setHeader("Content-type", "application/pdf");

    const text = "Payment to:";
    const text2 = "Amount:";
    const textSize = 11;
    const fontColor = rgb(0, 0, 0);
    const mainFontColor = rgb(241 / 255, 95 / 255, 30 / 255);

    // Calculate the width based on font size and text length
    const textWidth = textSize * text.length;

    const logoImageBytes = fs.readFileSync("controllers/logo.png");
    const logoImage = await pdfDoc.embedPng(logoImageBytes);

    const { width, height } = page.getSize();

    page.drawText("Invoice", {
      x: 50,
      y: height - 80,
      size: 16,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica-Bold"),
      align: "center",
    });

    page.drawText(`Receipt: ${transaction.invoiceNumber}`, {
      x: 50,
      y: height - 100,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.updatedAt.toLocaleDateString()}`, {
      x: 50,
      y: height - 120,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText("Client Details:", {
      x: 50,
      y: height - 160,
      size: 11,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica-Bold"),
    });

    page.drawText(`${transaction.customerName}`, {
      x: 50,
      y: height - 180,
      size: 13,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.customerId.email}`, {
      x: 50,
      y: height - 200,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.customerId.address}`, {
      x: 50,
      y: height - 220,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(
      `${transaction.customerId.contact1} , ${transaction.customerId.contact2}`,
      {
        x: 50,
        y: height - 240,
        size: 10,
        color: fontColor,
        font: await pdfDoc.embedFont("Helvetica"),
      }
    );

    page.drawText(text, {
      x: width - textWidth - 50,
      y: height - 160,
      size: textSize,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica-Bold"),
    });

    page.drawText(`${transaction.user.partnerUser.partnerName}`, {
      x: width - textWidth - 50,
      y: height - 180,
      size: 13,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.user.partnerUser.email}`, {
      x: width - textWidth - 50,
      y: height - 200,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(
      `${transaction.user.partnerUser.contact1} , ${transaction.user.partnerUser.contact2}`,
      {
        x: width - textWidth - 50,
        y: height - 220,
        size: 10,
        color: fontColor,
        font: await pdfDoc.embedFont("Helvetica"),
      }
    );

    page.drawText("Service:", {
      x: 50,
      y: height - 300,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawLine({
      start: { x: 50, y: height - 305 },
      end: { x: 50 + 500, y: height - 305 },
      thickness: 1,
      color: fontColor,
    });

    page.drawText(`${transaction.serviceIds[0].serviceName}`, {
      x: 50,
      y: height - 320,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.serviceIds[0].serviceDescription}`, {
      x: 50,
      y: height - 340,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.serviceIds[0].serviceAreaOfCover}`, {
      x: 50,
      y: height - 360,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });
    page.drawLine({
      start: { x: 50, y: height - 370 },
      end: { x: 50 + 500, y: height - 370 },
      thickness: 1,
      color: fontColor,
    });

    page.drawText("Processed by:", {
      x: 50,
      y: height - 410,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(
      `${transaction.user.firstName} ${transaction.user.lastName}`,
      {
        x: 50,
        y: height - 430,
        size: 13,
        color: mainFontColor,
        font: await pdfDoc.embedFont("Helvetica"),
      }
    );
    page.drawText(
      `${transaction.user.partnerUser.contact1} , ${transaction.user.partnerUser.contact2}`,
      {
        x: 50,
        y: height - 450,
        size: 11,
        color: fontColor,
        font: await pdfDoc.embedFont("Helvetica"),
      }
    );

    page.drawText(text2, {
      x: width - textWidth - 50,
      y: height - 410,
      size: 11,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(formattedAmount, {
      x: width - textWidth - 50,
      y: height - 430,
      size: 10,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText("Taxes included", {
      x: width - textWidth - 50,
      y: height - 450,
      size: 11,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    const pdfBytes = await pdfDoc.save();

    const pdfStream = new stream.PassThrough();
    pdfStream.end(pdfBytes);

    pdfStream.on("data", (chunk) => {
      res.write(chunk);
    });

    pdfStream.on("end", () => {
      res.end();
    });
  } catch (error) {
    next(error);
  }
});

// Modified code to access transactions associated with the manager
exports.getLogedManagerTransactions = asyncHandler(async (req, res, next) => {
  let pageSize = Number(req.query.pageSize) || 10;
  let page = Number(req.query.pageNumber) || 1;
  const searchTerm = req.query.searchTerm;
  const managerId = req.user.id;

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
    // Step 1: Find customers associated with the manager
    const customerQuery = {
      'manager': managerId,
    };


    const customerIds = await User.find(customerQuery).distinct('_id');


    // Step 2: Find transactions for the customers
    let transactionQuery = {
      'customerId': { $in: customerIds },
    };

    // Add search criteria if searchTerm is provided
    if (searchTerm) {
      transactionQuery.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { "customerId.lastName": { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { transactionStatus: { $regex: searchTerm, $options: "i" } },
        { "planId.planName": { $regex: searchTerm, $options: "i" } },
        {
          "serviceIds.serviceName": { $regex: searchTerm, $options: "i" },
        },
      ];
    }

     // Add date range criteria if both startDate and endDate are provided
if (startDateParam && endDateParam) {
  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);

  if (!isNaN(startDate) && !isNaN(endDate) && startDate <= endDate) {
    // Only add date range criteria if startDate and endDate are valid dates
    transactionQuery.createdAt = {
      $gte: startDate,
      $lte: endDate,
    };
  }
}

    const totalCount = await Transaction.countDocuments(transactionQuery);

    const transactions = await Transaction.find(transactionQuery)
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize)
      .populate({
        path: "user",
        select: "firstName lastName email profile",
        populate: {
          path: "partnerUser",
          model: "Partner",
          select: "partnerName email contact1 contact2 avatar status",
        },
      })
      .populate("customerId", "firstName lastName email manager agent") // Populate user information
      .populate({
        path: "planId",
        select: "planName", // Select the fields you want to include from the plan document
        populate: {
          path: "planService",
          model: "PlanServices",
          select: "serviceName servicePrice", // Select the fields you want to include from the planService document
        },
      })
      .populate("serviceIds", "serviceName servicePrice"); // Populate service information

    res.status(200).json({
      success: true,
      transactions,
      page,
      pages: Math.ceil(totalCount / pageSize),
      count: totalCount,
    });
  } catch (error) {
    return next(error);
  }
});




exports.ussd = asyncHandler(async (req, res, next) => {
  const phoneNumber1 = "";

  const result = await User.findOne({ contact1: phoneNumber1 }).populate({
    path: "plan",
    populate: {
      path: "planService",
      select: "serviceName remainingBalance",
    },
  });

  console.log("Result:", result);
  const { sessionId, serviceCode, phoneNumber, text } = req.body;

  let response = "";
  let sessionState = {}; // Initialize the session state object

  if (text === "") {
    // This is the first request. Start the response with CON
    response = `CON Welcome to Mediplus ?\n
    1. My Transactions
    2. Benefits
    3. Get Code
    4. My Account
    0. Exit`;
  } else if (text === "1") {
    try {
      // Business logic for first level response
      const result = await User.findOne({ contact1: phoneNumber }, "_id");
      if (result) {
        const transUser = await Transaction.find(
          { customerId: result._id },
          "invoiceNumber amount transactionStatus"
        )
          .limit(10)
          .lean();
        response = `CON Your Transactions:\n`;
        transUser.forEach((transaction, index) => {
          response += `${index + 1}. Inv Number: ${
            transaction.invoiceNumber
          }\n   Amount: ${transaction.amount}\n   Status: ${
            transaction.transactionStatus
          }\n\n`;
        });
      } else {
        response = `END No transactions found for your number`;
      }
    } catch (error) {
      response = `END Error fetching transactions`;
    }
  } else if (text === "2") {
    // else if (text.startsWith("2")) {
    try {
      const result = await User.findOne({ contact1: phoneNumber }).populate({
        path: "plan",
        populate: {
          path: "planService",
          select: "serviceName remainingBalance",
        },
      });

      if (result && result.plan) {
        const plan = result.plan;
        const pageSize = 5;
        const startIndex = parseInt(text.split("*")[1]) || 0; // Extract start index from input text

        let response = `CON Your Plan Services:\n`;

        for (let planIndex = 0; planIndex < plan.length; planIndex++) {
          const planService = plan[planIndex].planService;

          for (
            let serviceIndex = startIndex;
            serviceIndex < planService.length;
            serviceIndex++
          ) {
            const service = planService[serviceIndex];
            const serviceNumber = serviceIndex + 1;

            response += `${serviceNumber}. Benefit: ${service.serviceName}\n`;
            response += `   Balance: ${service.remainingBalance}\n\n`;

            if (serviceNumber - startIndex >= pageSize) {
              // Limit reached, provide option to show more
              response += `99. Show more\n`;
              break;
            }
          }

          if (startIndex + pageSize >= planService.length) {
            break;
          }
        }

        // Send the response back to API
        res.set("Content-type: text/plain");
        res.send(response);
      } else {
        response = `END Plan Services not found for your number`;
        res.set("Content-type: text/plain");
        res.send(response);
      }
    } catch (error) {
      console.error("Error:", error);
      response = `END Error fetching Plan Benefits`;
      res.set("Content-type: text/plain");
      res.send(response);
    }
  } else if (text === "3") {
    // Terminal response
    response = `CON Select option ?\n
    1. Generate new code
    2. Recover last code
    0. Exit`;
  } else if (text == "3*1") {
    //Business for generate the transaction code
  } else if (text === "4") {
    // Terminal response
    response = `CON Select option ?\n
    1. My Name
    2. Contacts
    3. Date of birth
    4. MemberShip ID
    5. Dependents
    0. Exit`;
  } else if (text === "4*1") {
    try {
      const result = await User.findOne(
        { contact1: phoneNumber },
        "firstName lastName"
      );
      if (result) {
        const firstName = result.firstName;
        const lastName = result.lastName;
        response = `END Your Name is ${firstName} ${lastName}`;
      } else {
        response = `END Name not found for your number`;
      }
    } catch (error) {
      response = `END Error fetching name`;
    }
  } else if (text === "4*2") {
    try {
      const result = await User.findOne(
        { contact1: phoneNumber },
        "contact1 contact2"
      );
      if (result) {
        const contact1 = result.contact1;
        const contact2 = result.contact2;
        response = `END Your contacts is ${contact1} and ${contact2}`;
      } else {
        response = `END Contact not found for your account`;
      }
    } catch (error) {
      response = `END Error fetching contact`;
    }
  } else if (text === "4*3") {
    try {
      const result = await User.findOne({ contact1: phoneNumber }, "dob");
      if (result) {
        const dob = result.dob;

        const date = new Date(dob);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        response = `END Your Date of birth is: ${year}-${month}-${day}`;
      } else {
        response = `END Date of birth not found for your number`;
      }
    } catch (error) {
      response = `END Error fetching Date of birth`;
    }
  } else if (text === "4*4") {
    try {
      const result = await User.findOne(
        { contact1: phoneNumber },
        "memberShipID"
      );
      if (result) {
        const memberShipID = result.memberShipID;

        response = `END Your memberShip ID is: ${memberShipID}`;
      } else {
        response = `END MemberShip ID not found for your number`;
      }
    } catch (error) {
      response = `END Error fetching MemberShip ID`;
    }
  } else if (text === "4*5") {
    try {
      const result = await User.findOne({ contact1: phoneNumber }).populate(
        "myMembers",
        "firstName lastName memberShipID monthlyFee"
      );

      if (result) {
        response = `CON Your Dependents:\n`;

        for (let index = 0; index < result.myMembers.length; index++) {
          const dependent = result.myMembers[index];
          response += `${index + 1}. Name: ${dependent.firstName}\n ${
            dependent.lastName
          }\n  memberShipID: ${dependent.memberShipID}\n   Monthly Fee: ${
            dependent.monthlyFee
          }\n\n`;
        }
      } else {
        response = `END Dependents not found for your number`;
      }
    } catch (error) {
      response = `END Error fetching Dependents`;
    }
  } else if (text === "4*0") {
    response = `END Thank you for using Mediplus. Have a nice day!`;
  } else if (text === "0") {
    // Exit the session
    response = `END Thank you for using Mediplus. Have a nice day!`;
  }

  // Send the response back to API
  res.set("Content-type: text/plain");
  res.send(response);
});
