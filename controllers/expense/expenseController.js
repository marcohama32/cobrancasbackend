const Expense = require("../../models/expenses/expenseModel");
const ErrorResponse = require("../../utils/errorResponse");
const asyncHandler = require("../../middleware/asyncHandler");

//create admin
exports.createExpense = asyncHandler(async (req, res, next) => {
  try {
    const {
      title,
      date,
      description,
      amount,
      category,
      paymentMethod,
      notes,
    } = req.body;

    const requiredFields = [
      title,
      date,
      description,
      amount,
      category,
      paymentMethod,
    ];

    if (requiredFields.some((field) => !field)) {
      return next(new ErrorResponse("Campos nao podem estar vazios", 400));
    }
    // Check if contact is a valid number
    if (isNaN(amount)) {
      return next(new ErrorResponse("Varificar todos os campos", 400));
    }

    const expense = await Expense.create({
      title,
      date,
      description,
      amount,
      category,
      paymentMethod,
      notes,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      expense,
    });
  } catch (error) {
    next(error);
  }
});

//find customer by ID
exports.findExpenseById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the customer by ID
    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({ message: "Despesa nao foi encontrada" });
    }

    res.status(200).json({
      success: true,
      expense,
    });
  } catch (error) {
    next(error);
  }
});

//find all customers
exports.getAllExpenses = asyncHandler(async (req, res, next) => {
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
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { amount: { $regex: searchTerm, $options: "i" } },
        { category: { $regex: searchTerm, $options: "i" } },
        { paymentMethod: { $regex: searchTerm, $options: "i" } },
        { notes: { $regex: searchTerm, $options: "i" } },
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
    const totalCount = await Expense.countDocuments(query);
    // Find customer requests with pagination
    const expense = await Expense.find(query)
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.status(200).json({
      success: true,
      count: expense.length,
      total: totalCount,
      pageSize,
      page,
      expense,
    });
  } catch (error) {
    next(error);
  }
});

// edit customers
exports.editExpense = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  console.log(id);

  // Find the customer by ID
  let checkCustomer = await Expense.findById(id);

  if (!checkCustomer) {
    return res.status(404).json({ message: "Cliente nao existe" });
  }
  const { title, date, description, amount, category, paymentMethod, notes } =
    req.body;

  const requiredFields = [
    title,
    date,
    description,
    amount,
    category,
    paymentMethod,
  ];

  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Campo nao pode ser nulo", 400));
  }
  // Check if contact is a valid number
  if (isNaN(amount)) {
    return next(new ErrorResponse("Verificar todos os campos", 400));
  }

  const updatedExpense = await Expense.findByIdAndUpdate(
    id,
    {
      title,
      date,
      description,
      amount,
      category,
      paymentMethod,
      notes,
      user: req.user.id,
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    expense: updatedExpense,
  });
});

//delete customer by ID
exports.deleteExpenseById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Find the chat message by ID and delete it
    const deleteexpense = await Expense.findByIdAndDelete(id);

    if (!deleteexpense) {
      return res.status(404).json({ error: "Despesa nao encontrada" });
    }

    // Emit an event indicating that the message was deleted
    // const io = req.app.locals.io; // Get the Socket.IO instance
    // io.emit("chat message deleted", messageId);

    res.status(200).json({ message: "Despesa removida com sucesso" });
  } catch (err) {
    console.error("Ocorreu um erro removendo Despesa:", err);
    res.status(500).json({ error: "Ocorreu um erro removendo Despesa" });
  }
});
