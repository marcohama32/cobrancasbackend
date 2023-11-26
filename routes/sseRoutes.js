// sseRoutes.js

const express = require("express");
const router = express.Router();

// Store clients that are connected to SSE
const clients = [];

// Route for SSE notifications
router.get("/notifications", (req, res) => {
  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send a comment to establish the connection
  res.write(": " + Array(2049).join(" ") + "\n\n");

  // Add the client to the clients array
  clients.push(res);

  // Remove the client from the clients array when the connection is closed
  req.on("close", () => {
    const index = clients.indexOf(res);
    if (index !== -1) {
      clients.splice(index, 1);
    }
  });
});

// Function to send notifications to all connected clients
const sendNotification = (message, transactionId) => {
  // Send the notification to the connected clients through SSE
  clients.forEach((client) => {
    client.write(`data: ${JSON.stringify({ message, transactionId })}\n\n`);
  });
};

module.exports = { router, sendNotification };
