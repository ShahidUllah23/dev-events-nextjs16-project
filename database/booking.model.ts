import mongoose, {
  Schema,
  Types,
  type HydratedDocument,
  type Model,
} from "mongoose";

import { Event } from "./event.model";

export type Booking = {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BookingDocument = HydratedDocument<Booking>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BookingSchema = new Schema<Booking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true, // speeds up lookups by event
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v: string) => EMAIL_REGEX.test(v),
        message: "Invalid email address.",
      },
    },
  },
  {
    timestamps: true,
  }
);

BookingSchema.pre("save", async function () {
  const doc = this as BookingDocument;

  // Only re-check the reference when it changes.
  if (!doc.isModified("eventId")) return;

  // Ensure we never persist a booking for a non-existent event.
  const exists = await Event.exists({ _id: doc.eventId });
  if (!exists) {
    throw new Error("Referenced event does not exist.");
  }
});

export const Booking: Model<Booking> =
  (mongoose.models.Booking as Model<Booking> | undefined) ??
  mongoose.model<Booking>("Booking", BookingSchema);
