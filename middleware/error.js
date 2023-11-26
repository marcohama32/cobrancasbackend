const ErrorResponse = require("../utils/errorResponse");

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  if (err.name === "CastError" && err.kind === "ObjectId") {
    const message = `Resource not found ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongose duplicate value
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => " " + val.message);
    error = new ErrorResponse(message, 400);
  }

  // Check if headers have already been sent
  if (!res.headersSent) {
    // Send the error response
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Server Error",
    });
  }
};

module.exports = { notFound, errorHandler };
