const Transaction = require("../models/transaction")
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/asyncHandler");


//create service
exports.createTransaction = asyncHandler(async (req, res, next) => {
    try {
      const { customer, service, amount} = req.body;
  
      if (!customer || !service || !amount) {
        return next(new ErrorResponse("Fields cannot be null", 400));
      }
  
  
      const transaction = await Transaction.create({
        customer,
        service,
        amount,
        user: req.user.id,
      });
  
      res.status(201).json({
        success: true,
        transaction,
      });
    } catch (error) {
      next(error);
    }
  });
  