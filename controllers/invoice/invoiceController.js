const Charge = require("../../models/charges/chargeModel");
const ErrorResponse = require("../../utils/errorResponse");
const asyncHandler = require("../../middleware/asyncHandler");
const axios = require("axios");
//
const { Printer, Types } = require("node-thermal-printer");
const { PDFDocument, rgb } = require("pdf-lib");
const fs = require("fs");
const pdfMake = require("pdfmake/build/pdfmake");
const vfsFonts = require("pdfmake/build/vfs_fonts");
const path = require("path");
const stream = require("stream");

exports.generateInvoicePDF = asyncHandler(async (req, res, next) => {
  try {
    const transactionID = req.params.id;

    // Fetch the transaction by its ID
    const transaction = await Charge.findById(transactionID)
      .populate("customer", "firstName lastName email contact1")
      .populate("service", "title")
      .populate("user", "firstName lastName");

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }
    const formattedDate = transaction.createdAt.toLocaleDateString("en-GB"); // 'en-GB' for DD/MM/YYYY format
    const formattedAmount = transaction.amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD", // Change the currency code as needed
      minimumFractionDigits: 2, // Adjust to control the number of decimal places
    });

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 600]); // Define page size (width x height)

    // Set the Content-Disposition header to prompt download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${transaction._id}.pdf`
    );
    res.setHeader("Content-type", "application/pdf");

    // Define custom styles
    const text = "Cliente:";
    const text2 = "Amount:";
    const textSize = 11;
    const fontSize = 12;
    const fontColor = rgb(0, 0, 0); // Black color
    const mainFontColor = rgb(0, 0, 0); // RGB color
    const textWidth = textSize * text.length; // Calculate the width based on font size and text length

    // Load and embed the logo image
    // const logoImageBytes = fs.readFileSync("controllers/logo.png"); // Replace 'logo.png' with the actual path to your logo
    // const logoImage = await pdfDoc.embedPng(logoImageBytes);
    // const topSpace = 20; // Adjust the space as needed
    // Add content to the PDF with custom styles
    const { width, height } = page.getSize();

    // Draw the logo image
    // page.drawImage(logoImage, {
    //   x: 50, // X-coordinate for the logo position
    //   y: height - 50, // Y-coordinate for the logo position
    //   width: 50, // Width of the logo image
    //   height: 50, // Height of the logo image
    // });

    // Continue adding other content as before
    page.drawText("Factura", {
      // x: width / 2,
      x: 50,
      y: height - 80,
      size: 16,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica-Bold"),
      align: "center",
    });

    // page.drawText(`Receipt: ${transaction.invoice}`, {
    //   x: 50,
    //   y: height - 100,
    //   size: 10,
    //   color: fontColor,
    //   font: await pdfDoc.embedFont("Helvetica"),
    // });

    page.drawText(`${transaction.updatedAt.toLocaleDateString()}`, {
      x: 50,
      y: height - 100,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText("De:", {
      x: 50,
      y: height - 160,
      size: 11,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica-Bold"),
    });

    page.drawText("Governo de Magude", {
      x: 50,
      y: height - 180,
      size: 13,
      color: mainFontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText("+258 84 02 62 320", {
      x: 50,
      y: height - 200,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    // Payment to
    page.drawText(text, {
      x: width - textWidth - 100, // Align to the right by subtracting the text width from the page width
      y: height - 160,
      size: textSize,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica-Bold"),
    });

    page.drawText(
      `${transaction.customer.firstName} ${transaction.customer.firstName}`,
      {
        x: width - textWidth - 100,
        y: height - 180,
        size: 13,
        color: mainFontColor,
        font: await pdfDoc.embedFont("Helvetica"),
      }
    );

    page.drawText(`${transaction.msisdn}`, {
      x: width - textWidth - 100,
      y: height - 200,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    // page.drawText(`${transaction.invoice} , ${transaction.invoice}`, {
    //   x: width - textWidth - 100,
    //   y: height - 220,
    //   size: 10,
    //   color: fontColor,
    //   font: await pdfDoc.embedFont("Helvetica"),
    // });

    // tabela
    const lineY = height - 300;
    const textWidth1 = 50; // Adjust the width as needed for proper alignment

    page.drawText("Factura", {
      x: 50,
      y: lineY,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    const serviceTextWidth = width - textWidth1 - 20;
    page.drawText("Servico", {
      x: serviceTextWidth - 120,
      y: lineY,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText("Valor", {
      x: textWidth1 * 5, // Adjust the width for proper alignment
      y: lineY,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    const dataTextWidth = width - textWidth1 * 3 - 20;

    page.drawText("Data", {
      x: 320,
      y: lineY,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawLine({
      start: { x: 50, y: height - 305 },
      end: { x: 50 + 500, y: height - 305 },
      thickness: 1, // Adjust line thickness as needed
      color: fontColor, // Specify the color for the line
    });

    page.drawText(`${transaction.invoice}`, {
      x: 50,
      y: height - 330,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(formattedAmount, {
      x: textWidth1 * 5, // Adjust the width for proper alignment
      y: height - 330,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawText(`${transaction.service.title}`, {
      x: serviceTextWidth - 120,
      y: height - 330,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });
    page.drawText(formattedDate, {
      x: 320,
      y: height - 330,
      size: 10,
      color: fontColor,
      font: await pdfDoc.embedFont("Helvetica"),
    });

    page.drawLine({
      start: { x: 50, y: height - 370 },
      end: { x: 50 + 500, y: height - 370 },
      thickness: 1, // Adjust line thickness as needed
      color: fontColor, // Specify the color for the line
    });

    // Serialize the PDF document to a buffer
    // const pdfBytes = await pdfDoc.save();
    const pdfBytesUint8Array = await pdfDoc.save();
    const pdfBytes = Buffer.from(pdfBytesUint8Array);


    // Send the generated PDF buffer in the response
    res.end(pdfBytes);
  } catch (error) {
    next(error);
  }
});

exports.generateInvoicePDFThermal = asyncHandler(async (req, res, next) => {
  try {
    const transactionID = req.params.id;
    const transaction = await Charge.findById(transactionID)
      .populate("customer", "firstName lastName email contact1")
      .populate("service", "title")
      .populate("user", "firstName lastName");

    // Check if transaction exists
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }

    // Initialize the printer here
    const printer = new Printer({
      type: Types.EPSON,
      interface: "bluetooth://<printer_bluetooth_address>", // Replace with your Bluetooth printer's address
      characterSet: "SLOVENIA",
      // other configurations...
    });

    try {
      await printer.init();
      // ... (printing logic)
      // After finishing printing, execute and close the printer
      await printer.execute();
      console.log("Invoice printed successfully");
      res.status(200).json({ success: true, message: "Invoice printed" });
    } catch (error) {
      console.error("Error printing invoice:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to print invoice" });
    } finally {
      printer.close(); // Close the printer connection
    }
  } catch (error) {
    next(error);
  }
});

exports.generateInvoiceForThermalPrinter = asyncHandler(
  async (req, res, next) => {
    try {
      const transactionID = req.params.id;

      // Fetch the transaction by its ID
      const transaction = await Charge.findById(transactionID)
        .populate("customer", "firstName lastName email contact1")
        .populate("service", "title")
        .populate("user", "firstName lastName");

      if (!transaction) {
        return res
          .status(404)
          .json({ success: false, error: "Transaction not found" });
      }

      const formattedAmount = transaction.amount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD", // Change the currency code as needed
        minimumFractionDigits: 2, // Adjust to control the number of decimal places
      });

      // Prepare content specifically formatted for thermal printer
      const content = `
      Governo de Magude
      258 84 02 62 320
          Factura
  --------------------
  Numero: ${transaction.invoice}
  Cliente: ${transaction.customer.firstName} ${transaction.customer.lastName}
  Servico: ${transaction.service.title}
  Valor: ${formattedAmount} MT
  Data: ${transaction.createdAt.toLocaleDateString("en-GB")}
  --------------------
          Obrigado!
`;

      // Define the file path
      const filePath = `invoice_${transaction._id}.pdf`;

      // Write the content to the file
      fs.writeFileSync(filePath, content);

      // Set the appropriate response headers
      res.setHeader("Content-Disposition", `attachment; filename=${filePath}`);
      res.setHeader("Content-type", "text/plain");

      // Read the file and send it in the response
      const fileContents = fs.readFileSync(filePath);
      res.send(fileContents);

      // Remove the file after sending
      fs.unlinkSync(filePath);
    } catch (error) {
      next(error);
    }
  }
);
