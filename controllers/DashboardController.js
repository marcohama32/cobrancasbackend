const express = require("express");
const router = express.Router();
const Transaction = require("../models/transaction");
const Message = require("../models/chatMessageModel");
const Company = require("../models/companyModel");
const User = require("../models/userModel");
const Partner = require("../models/partnerModel");
const PlanService = require("../models/serviceModel");
const Requests = require("../models/customerRequest");
const asyncHandler = require("../middleware/asyncHandler");

// Route to get dashboard data
exports.dashboardData = asyncHandler(async (req, res, next) => {
  try {
    const totalCustomers = await User.countDocuments({
      role: { $in: ["4", "5", "7", "8"] },
    });
    const totalIndivCustomers = await User.countDocuments({
      role: { $in: ["5", "8"] },
    });
    const totalCorpCustomers = await User.countDocuments({
      role: { $in: ["4", "7"] },
    });
    const totalTransactions = await Transaction.countDocuments();
    const totalPendingTransactions = await Transaction.countDocuments({
      transactionStatus: "Pending",
    });
    const totalMessages = await Message.countDocuments();
    const totalCompanies = await Company.countDocuments();
    const totalPartners = await Partner.countDocuments();
    const totalServices = await PlanService.countDocuments();
    const totalRequests = await Requests.countDocuments();

    // Fetch recentTransactions and populate service names
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(5);

    // Fetch recentPendingTransactions and populate service names
    const recentPendingTransactions = await Transaction.find({
      transactionStatus: "Pending",
    })
      .sort({ createdAt: -1 })
      .limit(5);
    const recentMessages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(5);
    const recentRequests = await Requests.find()
      .sort({ createdAt: -1 })
      .limit(5);

    const AllTransactions = await Transaction.find({
      transactionStatus: "Completed",
    });

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Calculate the last month and year
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastYear = lastMonth === 11 ? currentYear - 1 : currentYear;

    // Calculate current month's revenue and last month's revenue
    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;

    AllTransactions.forEach((transaction) => {
      const transactionDate = new Date(transaction.createdAt);
      const transactionMonth = transactionDate.getMonth();
      const transactionYear = transactionDate.getFullYear();

      if (transaction.transactionStatus === "Completed") {
        if (
          transactionYear === currentYear &&
          transactionMonth === currentMonth
        ) {
          currentMonthRevenue += transaction.amount;
        } else if (
          transactionYear === lastYear &&
          transactionMonth === lastMonth
        ) {
          lastMonthRevenue += transaction.amount;
        }
      }
    });

    // Calculate service popularity
    const servicePopularity = await calculateServicePopularity(
      recentTransactions
    );

    // Aggregating daily transaction amounts
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const interval = 2; // Set the desired interval for aggregation

    const dailyTransactionStats = {}; // Object to store daily transaction stats

    const allTransactions = await Transaction.find().sort({ createdAt: 1 });

    allTransactions.forEach((transaction) => {
      const transactionDate = new Date(transaction.createdAt);

      // Format the transaction date to include only day and month
      const formattedTransactionDate = `${
        transactionDate.getMonth() + 1
      }/${transactionDate.getDate()}`;

      // Check if the transaction is within the last 10 days
      if (new Date(transaction.createdAt) >= tenDaysAgo) {
        const isIntervalDate =
          dailyTransactionStats[formattedTransactionDate] !== undefined;

        // If the date is already in dailyTransactionStats, update the quantity and amount
        if (isIntervalDate) {
          dailyTransactionStats[formattedTransactionDate].quantity += 1;
          dailyTransactionStats[formattedTransactionDate].amount +=
            transaction.amount;
        } else {
          // Otherwise, initialize the date with the transaction stats
          dailyTransactionStats[formattedTransactionDate] = {
            quantity: 1,
            amount: transaction.amount,
          };
        }
      }
    });

    // Prepare the data for chart rendering
    const chartLabels = Object.keys(dailyTransactionStats);
    const chartData = chartLabels.map(
      (label) => dailyTransactionStats[label].amount
    );

    // Render the chart using chartLabels and chartData
    // ... (your chart rendering code)

    const dashboardData = {
      totalCustomers,
      totalIndivCustomers,
      totalCorpCustomers,
      totalTransactions,
      totalPendingTransactions,
      totalMessages,
      totalCompanies,
      totalPartners,
      totalServices,
      totalRequests,
      recentTransactions,
      recentPendingTransactions,
      recentMessages,
      recentRequests,
      currentMonthRevenue,
      lastMonthRevenue,
      dailyTransactionStats,
      servicePopularity, // Add the service popularity data
    };

    res.json(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching dashboard data." });
  }
});

// Function to calculate service popularity
async function calculateServicePopularity(transactions) {
  const serviceUsage = {};
  transactions.forEach((transaction) => {
    transaction.serviceIds.forEach((serviceId) => {
      if (serviceUsage[serviceId]) {
        serviceUsage[serviceId]++;
      } else {
        serviceUsage[serviceId] = 1;
      }
    });
  });

  const sortedServices = Object.keys(serviceUsage).sort(
    (a, b) => serviceUsage[b] - serviceUsage[a]
  );
  const topServices = sortedServices.slice(0, 10);

  const servicePopularity = await PlanService.find({
    _id: { $in: topServices },
  })
    .select("serviceName")
    .lean(); // Convert Mongoose document to plain JavaScript object

  // Add the count to each service popularity entry
  const servicePopularityWithCount = servicePopularity.map((service) => {
    return {
      ...service,
      count: serviceUsage[service._id],
    };
  });

  return servicePopularityWithCount;
}

//admin total transactions, total by status
exports.TransactionsTotals = asyncHandler(async (req, res, next) => {
  try {
    const transactionStatusCounts = await Transaction.aggregate([
      {
        $group: {
          _id: "$transactionStatus",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }, // Calculate total amount for each status
          responseTime: {
            $avg: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ["$transactionStatus", "Approved"] },
                    { $eq: ["$transactionStatus", "Pending"] },
                  ],
                },
                then: { $subtract: ["$updatedAt", "$createdAt"] },
                else: null,
              },
            },
          },
        },
      },
    ]);

    const dashboardTransaction = {
      totalTransactions: transactionStatusCounts.reduce(
        (total, statusCount) => total + statusCount.count,
        0
      ),
      statusCounts: transactionStatusCounts.reduce(
        (statusCounts, statusCount) => {
          statusCounts[statusCount._id] = {
            count: statusCount.count,
            totalAmount: statusCount.totalAmount,
            responseTime: statusCount.responseTime || 0, // Default to 0 if no response time calculated
          };
          return statusCounts;
        },
        {}
      ),
    };

    res.json(dashboardTransaction);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching dashboard data." });
  }
});

//manager total transactions, total by status
exports.TransactionsTotalsFromLogedManager = asyncHandler(
  async (req, res, next) => {
    try {
      const managerId = req.user.id;

      // Step 1: Find customer IDs based on the manager
      const customerQuery = {
        manager: managerId,
      };

      const customerIds = await User.find(customerQuery).distinct("_id");

      // Step 2: Find transactions for the customers
      const transactionQuery = {
        customerId: { $in: customerIds },
      };

      const transactions = await Transaction.find(transactionQuery)
        .sort({ updatedAt: -1 }) // Sort by updatedAt in descending order or any other desired sorting
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

      const transactionStatusCounts = await Transaction.aggregate([
        {
          $match: { customerId: { $in: customerIds } },
        },
        {
          $group: {
            _id: "$transactionStatus",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            responseTime: {
              $avg: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ["$transactionStatus", "Approved"] },
                      { $eq: ["$transactionStatus", "Pending"] },
                    ],
                  },
                  then: { $subtract: ["$updatedAt", "$createdAt"] },
                  else: null,
                },
              },
            },
          },
        },
      ]);

      const statusCounts = {
        totalTransactions: transactionStatusCounts.reduce(
          (total, statusCount) => total + statusCount.count,
          0
        ),
        statusCounts: transactionStatusCounts.reduce(
          (statusCounts, statusCount) => {
            statusCounts[statusCount._id] = {
              count: statusCount.count,
              totalAmount: statusCount.totalAmount,
              responseTime: statusCount.responseTime || 0,
            };
            return statusCounts;
          },
          {}
        ),
      };

      // res.json({
      //   success: true,
      //   statusCounts,
      //   transactions: {
      //     count: transactions.length,
      //     list: transactions,
      //   },
      // });
      res.json(statusCounts)
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching dashboard data." });
    }
  }
);

exports.dashboardDataFromLogedManager = asyncHandler(async (req, res, next) => {
  try {
    const managerId = req.user.id;

    // Step 1: Find customer IDs based on the manager
    const customerQuery = {
      'manager': managerId,
    };

    const customerIds = await User.find(customerQuery).distinct('_id');

    // Step 2: Find transactions for the customers
    const transactionQuery = {
      'customerId': { $in: customerIds },
    };

    // Fetch total customer counts
    const totalCustomers = await User.countDocuments({
      role: { $in: ["4", "5", "7", "8"] },
      _id: { $in: customerIds }, // Include customerIds in the condition
    });
    const totalIndivCustomers = await User.countDocuments({
      role: { $in: ["5", "8"] },
      _id: { $in: customerIds }, // Include customerIds in the condition
    });
    const totalCorpCustomers = await User.countDocuments({
      role: { $in: ["4", "7"] },
      _id: { $in: customerIds }, // Include customerIds in the condition
    });

    // Fetch total transaction counts for managed customers
    const totalTransactions = await Transaction.countDocuments(transactionQuery);

    // Fetch total pending transactions for managed customers
    const totalPendingTransactions = await Transaction.countDocuments({
      ...transactionQuery,
      transactionStatus: "Pending",
    });

    // Fetch total counts for other entities for managed customers
    const totalMessages = await Message.countDocuments({
      customerId: { $in: customerIds }, // Include customerIds in the condition
    });
    const totalCompanies = await Company.countDocuments({
      manager: managerId,
    });
    const totalPartners = await Partner.countDocuments();
    const totalServices = await PlanService.countDocuments();
    const totalRequests = await Requests.countDocuments({
      customerId: { $in: customerIds }, // Include customerIds in the condition
    });

    // ... your existing code for calculating statistics ...

    // Fetch recentTransactions and populate service names for managed customers
    const recentTransactions = await Transaction.find(transactionQuery)
      .sort({ createdAt: -1 })
      .limit(5);

    // Fetch recentPendingTransactions and populate service names for managed customers
    const recentPendingTransactions = await Transaction.find({
      ...transactionQuery,
      transactionStatus: "Pending",
    })
      .sort({ createdAt: -1 })
      .limit(5);

  
    const recentMessages = await Message.find({receiverId: { $in: customerIds }})
      .sort({ timestamp: -1 })
      .limit(5);
    const recentRequests = await Requests.find()
      .sort({ createdAt: -1 })
      .limit(5);

    const AllTransactions = await Transaction.find({
      transactionStatus: "Completed",
    });

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Calculate the last month and year
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastYear = lastMonth === 11 ? currentYear - 1 : currentYear;

    // Calculate current month's revenue and last month's revenue
    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;

    AllTransactions.forEach((transaction) => {
      const transactionDate = new Date(transaction.createdAt);
      const transactionMonth = transactionDate.getMonth();
      const transactionYear = transactionDate.getFullYear();

      if (transaction.transactionStatus === "Completed") {
        if (
          transactionYear === currentYear &&
          transactionMonth === currentMonth
        ) {
          currentMonthRevenue += transaction.amount;
        } else if (
          transactionYear === lastYear &&
          transactionMonth === lastMonth
        ) {
          lastMonthRevenue += transaction.amount;
        }
      }
    });

    // Calculate service popularity
    const servicePopularity = await calculateServicePopularity(
      recentTransactions
    );

    // Aggregating daily transaction amounts
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const interval = 2; // Set the desired interval for aggregation

    const dailyTransactionStats = {}; // Object to store daily transaction stats

    const allTransactions = await Transaction.find().sort({ createdAt: 1 });

    allTransactions.forEach((transaction) => {
      const transactionDate = new Date(transaction.createdAt);

      // Format the transaction date to include only day and month
      const formattedTransactionDate = `${
        transactionDate.getMonth() + 1
      }/${transactionDate.getDate()}`;

      // Check if the transaction is within the last 10 days
      if (new Date(transaction.createdAt) >= tenDaysAgo) {
        const isIntervalDate =
          dailyTransactionStats[formattedTransactionDate] !== undefined;

        // If the date is already in dailyTransactionStats, update the quantity and amount
        if (isIntervalDate) {
          dailyTransactionStats[formattedTransactionDate].quantity += 1;
          dailyTransactionStats[formattedTransactionDate].amount +=
            transaction.amount;
        } else {
          // Otherwise, initialize the date with the transaction stats
          dailyTransactionStats[formattedTransactionDate] = {
            quantity: 1,
            amount: transaction.amount,
          };
        }
      }
    });

    // Prepare the data for chart rendering
    const chartLabels = Object.keys(dailyTransactionStats);
    const chartData = chartLabels.map(
      (label) => dailyTransactionStats[label].amount
    );

    // Render the chart using chartLabels and chartData
    // ... (your chart rendering code)

    const dashboardData = {
      totalCustomers,
      totalIndivCustomers,
      totalCorpCustomers,
      totalTransactions,
      totalPendingTransactions,
      totalMessages,
      totalCompanies,
      totalPartners,
      totalServices,
      totalRequests,
      recentTransactions,
      recentPendingTransactions,
      recentMessages,
      recentRequests,
      currentMonthRevenue,
      lastMonthRevenue,
      dailyTransactionStats,
      servicePopularity, // Add the service popularity data
    };

    res.json(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ error: "An error occurred while fetching dashboard data." });
  }
});


// calculateAverageApprovalTime
exports.calculateAverageApprovalTime = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [
        { transactionStatus: "Approved" },
        { transactionStatus: "Aproved" }, // Include variations here
      ],
    });

    let totalApprovalTime = 0;
    let count = 0;

    transactions.forEach((transaction) => {
      const approvedTimestamp = transaction.statusHistory.find(
        (entry) => entry.status === "Approved" || entry.status === "Aproved"
      );

      const pendingTimestamp = transaction.statusHistory.find(
        (entry) => entry.status === "Pending"
      );

      if (approvedTimestamp && pendingTimestamp) {
        const approvalTime = approvedTimestamp.date - pendingTimestamp.date;
        totalApprovalTime += approvalTime;
        count++;
      }
    });

    const averageApprovalTime = count > 0 ? totalApprovalTime / count : 0;

    res.status(200).json({
      success: true,
      averageApprovalTime: averageApprovalTime,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
};
