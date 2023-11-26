const nodemailer = require("nodemailer")
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/asyncHandler");

exports.sendEmail = asyncHandler(async(data, req, res)=>{
    const transporter = nodemailer.createTransport({
        host: "smtp.freesmtpservers.com",
        port: 25,
        secure: true,
        // auth: {
        //   // TODO: replace `user` and `pass` values from <https://forwardemail.net>
        //   user: 'REPLACE-WITH-YOUR-ALIAS@YOURDOMAIN.COM',
        //   pass: 'REPLACE-WITH-YOUR-GENERATED-PASSWORD'
        // }
      });
      
      // async..await is not allowed in global scope, must use a wrapper
      async function main() {
        // send mail with defined transport object
        const info = await transporter.sendMail({
          from: '"Fred Foo 👻" <marcohama32@gmail.com>', // sender address
          to: data.to, // list of receivers
          subject: data.subject, // Subject line
          text: data.html, // html body
        });
      
        console.log("Message sent: %s", info.messageId);
        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
      
        //
        // NOTE: You can go to https://forwardemail.net/my-account/emails to see your email delivery status and preview
        //       Or you can use the "preview-email" npm package to preview emails locally in browsers and iOS Simulator
        //       <https://github.com/forwardemail/preview-email>
        //
      }
      
})