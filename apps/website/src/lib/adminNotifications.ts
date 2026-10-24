import { prisma } from "@/lib/prisma";

type BookingAlert = {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  busNumber: string;
  busOwnerPhone: string | null;
  pickupLocation: string | null;
  dropLocation: string | null;
  departureTime: Date;
  source: string;
  destination: string;
};

export type NewBookingAlert = BookingAlert & {
  customerName: string;
  customerEmail: string;
};

function messageFor(alert: BookingAlert) {
  const lines = [
    `New booking ${alert.bookingId}`,
    `Customer: ${alert.customerName}`,
    `Customer phone: ${alert.customerPhone || "Not provided"}`,
    `Call the customer for further information: ${alert.customerPhone || "Phone number not provided"}`,
    `Bus: ${alert.busNumber}`,
  ];
  if (alert.busOwnerPhone) lines.push(`Bus Owner: ${alert.busOwnerPhone}`);
  if (alert.pickupLocation) lines.push(`Pickup: ${alert.pickupLocation}`);
  if (alert.dropLocation) lines.push(`Drop: ${alert.dropLocation}`);
  lines.push(`Time: ${alert.departureTime.toLocaleString()}`, `Route: ${alert.source} to ${alert.destination}`);
  return lines.join("\n");
}

async function sendEmail(to: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject: "New Rajveer Travels booking", text: body }) });
  return response.ok;
}

async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return false;
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  return response.ok;
}

export async function sendAdminBookingAlerts(alert: BookingAlert) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", notificationChannel: { not: null } }, select: { id: true, email: true, phone: true, notificationChannel: true } });
  const body = messageFor(alert);
  await Promise.all(admins.map(async (admin) => {
    const delivered = admin.notificationChannel === "EMAIL" ? await sendEmail(admin.email, body) : Boolean(admin.phone) && await sendSms(admin.phone as string, body);
    if (!delivered) console.warn(`Booking alert was not delivered to admin ${admin.id}.`);
  }));
}

export async function notifyAdminsByEmailAndSms(subject: string, body: string) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, phone: true },
  });

  await Promise.all(admins.flatMap((admin) => [
    sendEmail(admin.email, body).then((delivered) => {
      if (!delivered) console.warn(`Email alert was not delivered to admin ${admin.id}.`);
    }),
    admin.phone
      ? sendSms(admin.phone, `${subject}\n${body}`).then((delivered) => {
          if (!delivered) console.warn(`SMS alert was not delivered to admin ${admin.id}.`);
        })
      : Promise.resolve(),
  ]));
}

export async function notifyCancellationRequest({
  busOwnerPhone,
  bookingId,
  customerName,
  customerEmail,
  customerPhone,
  otp,
  busNumber,
  source,
  destination,
  departureTime,
}: {
  busOwnerPhone: string | null;
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  otp: string;
  busNumber: string;
  source: string;
  destination: string;
  departureTime: Date;
}) {
  const body = [
    `Cancellation request for booking ${bookingId}`,
    `Customer: ${customerName}`,
    `Customer email: ${customerEmail}`,
    `Customer phone: ${customerPhone || "Not provided"}`,
    `Bus: ${busNumber}`,
    `Route: ${source} to ${destination}`,
    `Departure: ${departureTime.toLocaleString()}`,
    `Cancellation OTP: ${otp}`,
    "Enter this OTP in the admin dashboard to complete cancellation.",
  ].join("\n");

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, email: true, phone: true } });
  const sms = `Cancellation OTP: ${otp}\nBooking: ${bookingId}\nCustomer: ${customerName}\nPhone: ${customerPhone || "Not provided"}`;
  await Promise.all([
    ...admins.flatMap((admin) => [
      sendEmail(admin.email, body),
      admin.phone ? sendSms(admin.phone, sms) : Promise.resolve(false),
    ]),
    busOwnerPhone ? sendSms(busOwnerPhone, sms) : Promise.resolve(false),
  ]);
}

export async function sendRefundEmail(to: string, customerName: string, amount: string, message: string) {
  return sendEmail(
    to,
    `Dear ${customerName},\n\nWe are sorry for the inconvenience. ${message}\n\nRefund amount: INR ${amount}\n\nRajveer Travels`,
  );
}

export async function notifyUserAdminCancellation({
  email,
  phone,
  name,
  bookingId,
  refundAmount,
}: {
  email: string;
  phone: string | null;
  name: string;
  bookingId: string;
  refundAmount: string;
}) {
  const message = `Dear ${name},\n\nYour booking ${bookingId} was cancelled by Rajveer Travels. Since your payment was received, your refund of INR ${refundAmount} will be processed soon.\n\nRajveer Travels`;
  await Promise.all([
    sendEmail(email, message),
    phone ? sendSms(phone, `Booking ${bookingId} was cancelled by Rajveer Travels. Your refund of INR ${refundAmount} will be processed soon.`) : Promise.resolve(false),
  ]);
}

export async function notifyUnpaidBookingCancellation({
  ownerPhone,
  bookingId,
  customerName,
  customerPhone,
  busNumber,
}: {
  ownerPhone: string | null;
  bookingId: string;
  customerName: string;
  customerPhone: string | null;
  busNumber: string;
}) {
  const message = `Booking ${bookingId} was cancelled by ${customerName} without contacting the bus owner. Customer phone: ${customerPhone || "Not provided"}. Bus: ${busNumber}.`;
  await Promise.all([
    notifyAdminsByEmailAndSms("Unpaid booking cancelled", message),
    ownerPhone ? sendSms(ownerPhone, `Booking ${bookingId} was cancelled by ${customerName} without contacting you. Customer phone: ${customerPhone || "Not provided"}.`) : Promise.resolve(false),
  ]);
}

export async function sendBookingCreatedAlerts(alert: NewBookingAlert) {
  const body = messageFor(alert);
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", notificationChannel: { not: null } },
    select: { id: true, email: true, phone: true, notificationChannel: true },
  });

  await Promise.all([
    ...admins.map(async (admin) => {
      const delivered = admin.notificationChannel === "EMAIL"
        ? await sendEmail(admin.email, body)
        : Boolean(admin.phone) && await sendSms(admin.phone as string, body);
      if (!delivered) console.warn(`Booking alert was not delivered to admin ${admin.id}.`);
    }),
    alert.busOwnerPhone
      ? sendSms(alert.busOwnerPhone, `New ticket booked for ${alert.busNumber}\n${body}`).then((delivered) => {
          if (!delivered) console.warn(`Booking alert was not delivered to bus owner for ${alert.busNumber}.`);
        })
      : Promise.resolve(),
  ]);
}