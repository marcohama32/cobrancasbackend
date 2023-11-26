const express = require("express");
const WebSocket = require('ws');
const app = express();
const mongoose = require("mongoose");
const morgan = require("morgan");
const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { errorHandler, notFound } = require('./middleware/error');
const websocketHandler = require('./middleware/websocketHandler');

// Import Socket.IO library
const http = require("http");

// Middleware
app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(
  bodyParser.urlencoded({
    limit: "30mb",
    extended: true,
  })
);
app.use(cookieParser());

mongoose.set('strictQuery', false);

// Database connection
mongoose
  .connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB connected"))
  .catch((error) => {
    // Handle the timeout error and send a custom error response
    if (error.code === 'ETIMEOUT' && error.syscall === 'querySrv') {
      console.error('MongoDB connection timed out. Please try again later.');
    } else {
      console.error('MongoDB connection error:', error);
    }
  });

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Enable CORS
app.use(cors());

// Import SSE router and use it
const sseRoutes = require("./routes/sseRoutes");
app.use("/api", sseRoutes.router);

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const jobTypeRoutes = require("./routes/jobsTypeRoutes");
const jobRoutes = require("./routes/jobRoutes");
const planRoutes = require("./routes/planRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const companyRoutes = require("./routes/companyRoutes");
const partnerRoutes = require("./routes/partnerRoutes");
const ctransationRoutes = require("./routes/customertransactionRoutes");
const chatMessageRoutes = require("./routes/chatMessageRoutes"); // Import chatMessageRoutes
const FilesTemplateRoutes = require("./routes/filesTemplateRoutes"); // Import FilesTemplateRoutes
const CustomerRequestRoutes = require("./routes/customerrequestRoutes"); // Import CustomerRequestRoutes
const ussdRoutes = require("./routes/ussdRoutes"); // Import ussdRoutes

// Routes middleware
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", jobTypeRoutes);
app.use("/api", jobRoutes);
app.use("/api", planRoutes)
app.use("/api", serviceRoutes)
app.use("/api", companyRoutes)
app.use("/api", partnerRoutes)
app.use("/api", ctransationRoutes);
app.use("/api", chatMessageRoutes); // Use chatMessageRoutes
app.use("/api", FilesTemplateRoutes); // Use FilesTemplateRoutes
app.use("/api", CustomerRequestRoutes); // Use CustomerRequestRoutes
app.use("/api", ussdRoutes); // Use ussdRoutes

// Error middleware
app.use(notFound);
app.use(errorHandler);

// Place the additional middleware here
app.use((req, res, next) => {
  console.log("Received headers:", req.headers);
  next();
});

// Create HTTP server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

websocketHandler(wss); // Pass the WebSocket.Server instance to the websocketHandler

app.locals.wss = wss;

// Port
const port = process.env.PORT || 8000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
