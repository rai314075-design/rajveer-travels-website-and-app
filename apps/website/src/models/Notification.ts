import mongoose, { Schema, models, model } from "mongoose";

// Notification / activity-log stream — MongoDB again, since these are
// append-mostly, schema-loose event records rather than transactional data.

const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["BOOKING_CONFIRMED", "BOOKING_CANCELLED", "PAYMENT_FAILED", "TRIP_REMINDER", "OTHER"],
      required: true,
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default models.Notification || model("Notification", NotificationSchema);
