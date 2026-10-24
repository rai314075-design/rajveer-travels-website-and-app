import mongoose, { Schema, models, model } from "mongoose";

const BusSchema = new Schema(
  {
    busNumber: { type: String, required: true, unique: true, trim: true, index: true },
    operator: { type: String, required: true, trim: true, default: "Rajveer Travels" },
    description: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

export default models.Bus || model("Bus", BusSchema);
