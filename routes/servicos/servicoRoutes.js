const express = require("express");
const router = express.Router();
const {
  createService,
  editServico,
  findServicoById,
  getAllServicos,
  deleteServicoById,
} = require("../../controllers/servico/servicoController");
const {
  isAuthenticated,
  isAdmin,
  isTokenValid,
} = require("../../middleware/auth");

//@auth routes
// api/route
router.post("/service/create", isAuthenticated, createService);
router.put("/service/edit/:id", isAuthenticated, editServico);
router.get("/service/getbyid/:id", isAuthenticated, findServicoById);
router.get("/servicos/getall", isAuthenticated, getAllServicos);
router.delete("/servico/delete/:id", isAuthenticated, deleteServicoById);

module.exports = router;
