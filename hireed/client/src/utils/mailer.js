import nodemailer from "nodemailer";

export async function sendLoginCode(email, code) {
  // Dev: use Ethereal so you don’t need real SMTP creds
  const transporter = await nodemailer.createTestAccount().then(acc =>
    nodemailer.createTransport({
      host: acc.smtp.host,
      port: acc.smtp.port,
      secure: acc.smtp.secure,
      auth: { user: acc.user, pass: acc.pass }
    })
  );

  const info = await transporter.sendMail({
    from: '"HireEd" <no-reply@hireed.local>',
    to: email,
    subject: "Your login code",
    text: `Your HireEd login code is ${code}`,
    html: `<p>Your HireEd login code is <b>${code}</b>. It expires in 10 minutes.</p>`
  });

  // Log preview URL so you can click in dev
  console.log("Login email preview:", nodemailer.getTestMessageUrl(info));
}
