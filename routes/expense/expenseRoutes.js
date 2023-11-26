const express = require("express");
const router = express.Router();
const {
  createExpense,
  editExpense,
  findExpenseById,
  getAllExpenses,
  deleteExpenseById,
} = require("../../controllers/expense/expenseController");
const {
  isAuthenticated,
  isAdmin,
  isTokenValid,
} = require("../../middleware/auth");

//@auth routes
// api/route
router.post("/expense/create", isAuthenticated, createExpense);
router.put("/expense/edit/:id", isAuthenticated, editExpense);
router.get("/expense/getbyid/:id", isAuthenticated, findExpenseById);
router.get("/expense/getall", isAuthenticated, getAllExpenses);
router.delete("/expense/delete/:id", isAuthenticated, deleteExpenseById);

module.exports = router;
