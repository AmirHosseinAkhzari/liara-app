import nodemailer from "nodemailer";
const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: 587, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
export function sendOrderConfirmation(to: string, orderId: string) {
  return transport.sendMail({ from: "orders@shop.example.ir", to, subject: `Order ${orderId}`, text: "Thanks for your order!" });
}
