import mongoose, { Schema, models, model } from "mongoose";

// Reviews live in MongoDB deliberately: flexible shape (ratings, tags, photos),
// high write volume, no need for relational joins with the booking data in Postgres.
// We link back to Postgres records loosely by storing their string IDs.

const ReviewSchema = new Schema(
  {
    tripId: { type: String, required: true, index: true }, // Postgres Trip.id
    userId: { type: String, required: true, index: true }, // Postgres User.id
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000 },
    busNumber: { type: String },
    route: { type: String },
  },
  { timestamps: true }
);

export default models.Review || model("Review", ReviewSchema);
