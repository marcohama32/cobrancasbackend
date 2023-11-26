const Service = require("../../models/servicos/servicoModel");
const ErrorResponse = require("../../utils/errorResponse");
const asyncHandler = require("../../middleware/asyncHandler");

//create admin
exports.createService = asyncHandler(async (req, res, next) => {
  try {
    const { title, description, amount } = req.body;

    const requiredFields = [title, description, amount];

    if (requiredFields.some((field) => !field)) {
      return next(new ErrorResponse("Campos nao podem estar vazios", 400));
    }
    // Check if contact is a valid number
    if (isNaN(amount)) {
      return next(new ErrorResponse("Varificar todos os campos", 400));
    }

    const service = await Service.create({
      title,
      description,
      amount,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      service,
    });
  } catch (error) {
    next(error);
  }
});

//find customer by ID
exports.findServicoById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the customer by ID
    const service = await Service.findById(id);

    if (!service) {
      return res.status(404).json({ message: "Servico nao foi encontrado" });
    }

    res.status(200).json({
      success: true,
      service,
    });
  } catch (error) {
    next(error);
  }
});

//find all customers
exports.getAllServicos = asyncHandler(async (req, res, next) => {
    console.log("1")
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
    console.log("ogv")
    // Calculate the total count of transactions matching the query
    const totalCount = await Service.countDocuments(query);
    console.log(totalCount)
    // Find customer requests with pagination
    const service = await Service.find(query)
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    res.status(200).json({
      success: true,
      count: service.length,
      total: totalCount,
      pageSize,
      page,
      service,
    });
  } catch (error) {
    next(error);
  }
});

// edit customers
exports.editServico = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  console.log(id);

  // Find the customer by ID
  let checkService = await Service.findById(id);

  if (!checkService) {
    return res.status(404).json({ message: "Servico nao existe" });
  }
   const { title, description, amount } = req.body;

   const requiredFields = [title, description, amount];

  if (requiredFields.some((field) => !field)) {
    return next(new ErrorResponse("Campo nao pode ser nulo", 400));
  }
  // Check if contact is a valid number
  if (isNaN(amount)) {
    return next(new ErrorResponse("Verificar todos os campos", 400));
  }

  const updatedServico = await Service.findByIdAndUpdate(
    id,
    {
      title,
      description,
      amount,
      user: req.user.id,
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    service: updatedServico,
  });
});

//delete customer by ID
exports.deleteServicoById = asyncHandler(async (req, res) => {
  console.log("ogv");
  const { id } = req.params;

  try {
    // Find the chat message by ID and delete it
    const deleteservice = await Service.findByIdAndDelete(id);

    if (!deleteservice) {
      return res.status(404).json({ error: "Servico nao encontrado" });
    }

    // Emit an event indicating that the message was deleted
    // const io = req.app.locals.io; // Get the Socket.IO instance
    // io.emit("chat message deleted", messageId);

    res.status(200).json({ message: "Servico removido com sucesso" });
  } catch (err) {
    console.error("Ocorreu um erro removendo Servico:", err);
    res.status(500).json({ error: "Ocorreu um erro removendo Servico" });
  }
});
