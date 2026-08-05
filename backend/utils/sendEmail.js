const nodemailer = require(
  "nodemailer"
);


// create transporter
const transporter =
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });


// send email function
const sendEmail = async (
  to,
  subject,
  text
) => {

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  });
};


module.exports = sendEmail;