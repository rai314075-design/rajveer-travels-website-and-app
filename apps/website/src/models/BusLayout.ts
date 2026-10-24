import mongoose, { Schema, models, model } from "mongoose";

export const BUS_DECKS = ["LOWER", "UPPER"] as const;
export const BUS_SEAT_TYPES = ["SEATER", "SLEEPER"] as const;
export const BUS_ORIENTATIONS = ["VERTICAL", "HORIZONTAL"] as const;
export const BUS_GENDER_RESTRICTIONS = ["ANY", "FEMALE", "MALE"] as const;
export const BUS_SEAT_STATUSES = ["AVAILABLE", "LOCKED", "BOOKED"] as const;

const SeatConfigurationSchema = new Schema(
  {
    seatNo: { type: String, required: true, trim: true },
    row: { type: Number, required: true, min: 0 },
    col: { type: Number, required: true, min: 0 },
    deck: { type: String, enum: BUS_DECKS, required: true },
    type: { type: String, enum: BUS_SEAT_TYPES, required: true },
    orientation: { type: String, enum: BUS_ORIENTATIONS, required: true },
    price: { type: Number, required: true, min: 0 },
    genderRestriction: { type: String, enum: BUS_GENDER_RESTRICTIONS, default: "ANY" },
    status: { type: String, enum: BUS_SEAT_STATUSES, default: "AVAILABLE" },
  },
  { _id: false }
);

const BusLayoutSchema = new Schema(
  {
    busId: { type: Schema.Types.ObjectId, ref: "Bus", required: true, unique: true, index: true },
    rows: { type: Number, required: true, min: 1, max: 20 },
    cols: { type: Number, required: true, min: 1, max: 12 },
    decks: [{ type: String, enum: BUS_DECKS }],
    seats: { type: [SeatConfigurationSchema], default: [] },
  },
  { timestamps: true }
);

export default models.BusLayout || model("BusLayout", BusLayoutSchema);
