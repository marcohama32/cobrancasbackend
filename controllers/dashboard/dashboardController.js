const Charge = require("../../models/charges/chargeModel");
const Expense = require("../../models/expenses/expenseModel");
const Customer = require("../../models/customer/customerModel");
const Service = require("../../models/servicos/servicoModel");
const moment = require("moment");

exports.getDashboardData = async (req, res) => {
  try {
    // Total amount charges
    const allCharges = await Charge.find();
    const totalAmountCharges = allCharges.reduce(
      (total, charge) => total + parseFloat(charge.amount),
      0
    );

    // Total amount charges for the current month
    const currentMonth = moment().month();
    const currentMonthCharges = allCharges.filter(
      (charge) => moment(charge.createdAt).month() === currentMonth
    );
    const totalAmountChargesCurrentMonth = currentMonthCharges.reduce(
      (total, charge) => total + parseFloat(charge.amount),
      0
    );

    // Calculate the date range for the current month and the previous month
    const currentMonthStart = moment().startOf("month");
    const previousMonthStart = moment(currentMonthStart)
      .subtract(1, "months")
      .startOf("month");

    // Filter charges for the current and previous month
    const currentMonthChargesList = allCharges.filter(
      (charge) =>
        moment(charge.createdAt).isSameOrAfter(currentMonthStart) &&
        moment(charge.createdAt).isBefore(previousMonthStart)
    );

    const previousMonthChargesList = allCharges.filter(
      (charge) =>
        moment(charge.createdAt).isSameOrAfter(previousMonthStart) &&
        moment(charge.createdAt).isBefore(currentMonthStart)
    );

    const totalAmountChargesPreviousMonth = previousMonthChargesList.reduce(
      (total, charge) => total + parseFloat(charge.amount),
      0
    );

    // Calculate the start date for six months ago
    const sixMonthsAgo = moment().subtract(6, "months").startOf("month");

    // Filter charges for the last six months
    const lastSixMonthsCharges = allCharges.filter((charge) =>
      moment(charge.createdAt).isSameOrAfter(sixMonthsAgo)
    );

    // Calculate the total amount of charges for the last six months
    const totalAmountLastSixMonthsCharges = lastSixMonthsCharges.reduce(
      (total, charge) => total + parseFloat(charge.amount),
      0
    );

    // Calculate the average amount of charges for the last six months
    const averageAmountChargesLastSixMonths =
      totalAmountLastSixMonthsCharges / lastSixMonthsCharges.length;

    // Recent charges (last 5)
    const recentCharges = await Charge.find()
      .limit(5)
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order
      .populate({
        path: "customer",
        select: "firstName lastName", // Include only the firstName field
      })
      .populate({
        path: "service",
        select: "title amount", // Include only the firstName field
      }); // Populate the 'customer' field

    // Recent expenses (last 5)
    const recentExpenses = await Expense.find()
      .sort({ createdAt: -1 })
      .limit(5);

    const currentDate = moment();

    // Calculate two weeks ago
    const twoWeeksAgo = currentDate.clone().subtract(2, "weeks");

    // Calculate last week (1 week before twoWeeksAgo)
    const lastWeek = twoWeeksAgo.clone().subtract(1, "week");

    // Calculate the week before last week (1 week before lastWeek)
    const weekBefore = lastWeek.clone().subtract(1, "week");

    // Calculate the week for the last 1 week
    const last1Week = currentDate.clone().subtract(1, "week");

    const weeklyChargesLastWeek = allCharges
      .filter(
        (charge) =>
          moment(charge.createdAt).isSameOrAfter(lastWeek) &&
          moment(charge.createdAt).isBefore(twoWeeksAgo)
      )
      .reduce((total, charge) => total + parseFloat(charge.amount), 0);

    const weeklyChargesWeekBefore = allCharges
      .filter(
        (charge) =>
          moment(charge.createdAt).isSameOrAfter(weekBefore) &&
          moment(charge.createdAt).isBefore(lastWeek)
      )
      .reduce((total, charge) => total + parseFloat(charge.amount), 0);

    const weeklyChargesLast1Week = allCharges
      .filter(
        (charge) =>
          moment(charge.createdAt).isSameOrAfter(last1Week) &&
          moment(charge.createdAt).isBefore(currentDate)
      )
      .reduce((total, charge) => total + parseFloat(charge.amount), 0);

    // Total amount expenses from the database
    const allExpenses = await Expense.find();
    const totalAmountExpenses = allExpenses.reduce(
      (total, expense) => total + parseFloat(expense.amount),
      0
    );

    // Total amount expenses for the current month
    const currentMonthExpenses = allExpenses.filter(
      (expense) =>
        moment(expense.createdAt).isSameOrAfter(currentMonthStart) &&
        moment(expense.createdAt).isBefore(moment().endOf("month"))
    );
    const totalCurrentMonthAmountExpenses = currentMonthExpenses.reduce(
      (total, expense) => total + parseFloat(expense.amount),
      0
    );

    const dashboardData = {
      totalAmountCharges,
      totalAmountChargesCurrentMonth,
      totalAmountChargesPreviousMonth,
      forecastAmountCurrentMonth: averageAmountChargesLastSixMonths,
      totalAmountExpenses,
      totalCurrentMonthAmountExpenses,
      recentCharges,
      recentExpenses,
      weeklyAnalysisCharges: [
        {
          weekStartDate: last1Week.format("YYYY-MM-DD"),
          weekEndDate: currentDate.format("YYYY-MM-DD"),
          totalAmount: weeklyChargesLast1Week,
        },
        {
          weekStartDate: lastWeek.format("YYYY-MM-DD"),
          weekEndDate: twoWeeksAgo.format("YYYY-MM-DD"),
          totalAmount: weeklyChargesLastWeek,
        },
        {
          weekStartDate: weekBefore.format("YYYY-MM-DD"),
          weekEndDate: lastWeek.format("YYYY-MM-DD"),
          totalAmount: weeklyChargesWeekBefore,
        },
      ],
    };

    res.json(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching dashboard data" });
  }
};















exports.populateLineChart = async (req, res) => {
  try {
    const allCharges = await Charge.find();
    const allCustomers = await Customer.find();
    const allExpenses = await Expense.find();
    const allServices = await Service.find();

    // Extracting payment methods from charges and counting occurrences
    const paymentMethodCounts = allCharges.reduce((methods, charge) => {
      const paymentMethod = charge.paymentMethod;
      if (methods[paymentMethod]) {
        methods[paymentMethod]++;
      } else {
        methods[paymentMethod] = 1;
      }
      return methods;
    }, {});

    const monthlyChartData = generateMonthlyChartData(allCharges, allCustomers);
    const dailyChartData = generateDailyChartData(allCharges, allCustomers);

    // Calculating totals
    const totalTransactions = allCharges.length;
    const totalCustomers = allCustomers.length;
    const totalExpenses = allExpenses.reduce(
      (total, expense) => total + parseFloat(expense.amount),
      0
    );
    const totalServices = allServices.length;

    res.json({
      monthlyChartData,
      dailyChartData,
      paymentMethodCounts, // Adding paymentMethodCounts to the response
      totalTransactions,
      totalCustomers,
      totalExpenses,
      totalServices,
    });
  } catch (error) {
    console.error("Error populating line chart data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while populating line chart data" });
  }
};

const generateMonthlyChartData = (charges = [], customers = []) => {
  const monthlyCharges = {};

  charges.forEach((charge) => {
    const month = moment(charge.createdAt).format("YYYY-MM");
    if (!monthlyCharges[month]) {
      monthlyCharges[month] = {
        transactionCount: 0,
        uniqueCustomers: new Set(),
        totalAmount: 0,
      };
    }
    monthlyCharges[month].transactionCount++;
    monthlyCharges[month].uniqueCustomers.add(charge.customer?.toString());
    monthlyCharges[month].totalAmount += parseFloat(charge.amount || 0);
  });

  return Object.keys(monthlyCharges).map((month) => ({
    month,
    transactionCount: monthlyCharges[month].transactionCount,
    uniqueCustomers: monthlyCharges[month].uniqueCustomers.size,
    totalAmount: monthlyCharges[month].totalAmount,
    totalCustomers: customers.length,
  }));
};

const generateDailyChartData = (charges = [], customers = []) => {
  const dailyCharges = {};

  charges.forEach((charge) => {
    const day = moment(charge.createdAt).format("YYYY-MM-DD");
    if (!dailyCharges[day]) {
      dailyCharges[day] = {
        transactionCount: 0,
        uniqueCustomers: new Set(),
        totalAmount: 0,
      };
    }
    dailyCharges[day].transactionCount++;
    dailyCharges[day].uniqueCustomers.add(charge.customer?.toString());
    dailyCharges[day].totalAmount += parseFloat(charge.amount || 0);
  });

  return Object.keys(dailyCharges).map((day) => ({
    day,
    transactionCount: dailyCharges[day].transactionCount,
    uniqueCustomers: dailyCharges[day].uniqueCustomers.size,
    totalAmount: dailyCharges[day].totalAmount,
    totalCustomers: customers.length,
  }));
};
