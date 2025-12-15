import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
} from "mongoose";

export type Event = {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type EventDocument = HydratedDocument<Event>;

function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .replace(/-{2,}/g, "-");
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function normalizeSingleTime(input: string): string {
  const trimmed = input.trim();

  // 24h format: HH:mm
  const hhmm = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (hhmm) return `${pad2(Number(hhmm[1]))}:${hhmm[2]}`;

  // 12h format: h:mm AM/PM
  const ampm = /^(1[0-2]|0?[1-9]):([0-5]\d)\s*([AaPp][Mm])$/.exec(trimmed);
  if (ampm) {
    const hour12 = Number(ampm[1]);
    const minute = ampm[2];
    const meridiem = ampm[3].toUpperCase();

    const hour24 =
      meridiem === "AM" ? (hour12 === 12 ? 0 : hour12) : hour12 === 12 ? 12 : hour12 + 12;

    return `${pad2(hour24)}:${minute}`;
  }

  throw new Error(`Invalid time format: "${input}". Use HH:mm or h:mm AM/PM.`);
}

function normalizeTime(input: string): string {
  // Supports either a single time ("10:00 AM") or a range ("10:00 AM - 12:00 PM").
  const parts = input
    .split("-")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 1) return normalizeSingleTime(parts[0]);
  if (parts.length === 2) return `${normalizeSingleTime(parts[0])}-${normalizeSingleTime(parts[1])}`;

  throw new Error(`Invalid time range: "${input}".`);
}

const nonEmptyTrimmedString = {
  trim: true,
  required: true,
  minlength: 1,
} as const;

const EventSchema = new Schema<Event>(
  {
    title: { type: String, ...nonEmptyTrimmedString },
    slug: { type: String, unique: true, index: true },
    description: { type: String, ...nonEmptyTrimmedString },
    overview: { type: String, ...nonEmptyTrimmedString },
    image: { type: String, ...nonEmptyTrimmedString },
    venue: { type: String, ...nonEmptyTrimmedString },
    location: { type: String, ...nonEmptyTrimmedString },
    date: { type: String, ...nonEmptyTrimmedString },
    time: { type: String, ...nonEmptyTrimmedString },
    mode: { type: String, ...nonEmptyTrimmedString },
    audience: { type: String, ...nonEmptyTrimmedString },
    agenda: {
      type: [{ type: String, ...nonEmptyTrimmedString }],
      required: true,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "Agenda must have at least one item.",
      },
    },
    organizer: { type: String, ...nonEmptyTrimmedString },
    tags: {
      type: [{ type: String, ...nonEmptyTrimmedString }],
      required: true,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "Tags must have at least one item.",
      },
    },
  },
  {
    timestamps: true, // auto-manages createdAt/updatedAt
  }
);

EventSchema.index({ slug: 1 }, { unique: true });

EventSchema.pre("save", function () {
  const doc = this as EventDocument;

  // Regenerate slug only when the title changes.
  if (doc.isModified("title")) {
    doc.slug = slugifyTitle(doc.title);
  }

  // Normalize date to ISO-8601 for consistent storage.
  const parsedDate = new Date(doc.date);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid date: "${doc.date}".`);
  }
  doc.date = parsedDate.toISOString();

  // Normalize time to a consistent 24h format (HH:mm or HH:mm-HH:mm).
  doc.time = normalizeTime(doc.time);

  // Guard against whitespace-only strings sneaking in.
  const requiredStringFields: Array<
    "title" |
      "description" |
      "overview" |
      "image" |
      "venue" |
      "location" |
      "date" |
      "time" |
      "mode" |
      "audience" |
      "organizer"
  > = [
    "title",
    "description",
    "overview",
    "image",
    "venue",
    "location",
    "date",
    "time",
    "mode",
    "audience",
    "organizer",
  ];

  for (const field of requiredStringFields) {
    if (doc[field].trim().length === 0) {
      throw new Error(`Field "${field}" cannot be empty.`);
    }
  }

  for (const item of doc.agenda) {
    if (item.trim().length === 0) throw new Error("Agenda items cannot be empty.");
  }

  for (const tag of doc.tags) {
    if (tag.trim().length === 0) throw new Error("Tags cannot be empty.");
  }
});

export const Event: Model<Event> =
  (mongoose.models.Event as Model<Event> | undefined) ??
  mongoose.model<Event>("Event", EventSchema);
