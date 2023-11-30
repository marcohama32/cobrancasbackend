const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { errorHandler, notFound } = require("./middleware/error");
const websocketHandler = require("./middleware/websocketHandler");
const http = require("http");

// Import socket.io and initialize it with the http server
const socketIo = require("socket.io");

const app = express();

app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(
  bodyParser.urlencoded({
    limit: "30mb",
    extended: true,
  })
);
app.use(cookieParser());

mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB connected");
  })
  .catch((error) => {
    if (error.code === "ETIMEOUT" && error.syscall === "querySrv") {
      console.error("MongoDB connection timed out. Please try again later.");
    } else {
      console.error("MongoDB connection error:", error);
    }
  });

app.use("/uploads", express.static("uploads"));

app.use(cors());

const sseRoutes = require("./routes/sseRoutes");
app.use("/api", sseRoutes.router);

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

const Dashboard = require("./routes/dashboard/dashboardRoutes");
const Servico = require("./routes/servicos/servicoRoutes");
const Customer = require("./routes/customer/customerRoutes");
const Expense = require("./routes/expense/expenseRoutes")
const Charge = require("./routes/charges/chargesRoutes");

app.use("/api", authRoutes);
app.use("/api", userRoutes);

app.use("/api", Dashboard)
app.use("/api", Customer)
app.use("/api", Expense);
app.use("/api", Servico);
app.use("/api", Charge);

app.use(notFound);
app.use(errorHandler);

app.use((req, res, next) => {
  console.log("Received headers:", req.headers);
  next();
});

const server = http.createServer(app);

// Initialize socket.io with the server
const io = socketIo(server);

// Connect the websocketHandler
websocketHandler(io);

app.locals.io = io; // Store io instance for later use in your application

const port = process.env.PORT || 8000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
