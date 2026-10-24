import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCustomSession } from "@/lib/session";
import { connectMongo } from "@/lib/mongodb";
import Bus from "@/models/Bus";
import BusLayout from "@/models/BusLayout";

export const dynamic = "force-dynamic";

const seatSchema = z.object({
  seatNo: z.string().trim().min(1).max(12),
  row: z.number().int().min(0).max(19),
  col: z.number().int().min(0).max(11),
  deck: z.enum(["LOWER", "UPPER"]),
  type: z.enum(["SEATER", "SLEEPER"]),
  orientation: z.enum(["VERTICAL", "HORIZONTAL"]),
  price: z.number().min(0),
  genderRestriction: z.enum(["ANY", "FEMALE", "MALE"]),
  status: z.enum(["AVAILABLE", "LOCKED", "BOOKED"]),
});

const layoutSchema = z.object({
  busNumber: z.string().trim().min(2).max(40),
  operator: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional().default(""),
  rows: z.number().int().min(1).max(20),
  cols: z.number().int().min(1).max(12),
  decks: z.array(z.enum(["LOWER", "UPPER"])).min(1),
  seats: z.array(seatSchema).max(240),
});

async function ensureAdmin() {
  const sessionUser = await getCustomSession();
  if (!sessionUser) return false;
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { role: true } });
  return user?.role === "ADMIN";
}

export async function GET() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  await connectMongo();
  const buses = await Bus.find().sort({ createdAt: -1 }).lean();
  const layouts = await BusLayout.find({ busId: { $in: buses.map((bus) => bus._id) } }).lean();
  const layoutByBus = new Map(layouts.map((layout) => [layout.busId.toString(), layout]));

  return NextResponse.json(buses.map((bus) => {
    const busId = String(bus._id);
    const layout = layoutByBus.get(busId);
    return {
      id: busId,
      busNumber: bus.busNumber,
      operator: bus.operator,
      description: bus.description || "",
      layoutId: layout ? String(layout._id) : null,
      rows: layout?.rows || 0,
      cols: layout?.cols || 0,
      seatCount: layout?.seats.length || 0,
      decks: layout?.decks || [],
      seats: layout?.seats || [],
    };
  }));
}

export async function POST(req: NextRequest) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const parsed = layoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Seat numbers become the trip's public seat identifiers. They must be
  // unique across the whole vehicle because Trip.Seat has no deck column.
  const seenSeatNumbers = new Set<string>();
  const duplicateSeat = parsed.data.seats.find((seat) => {
    const normalizedSeatNumber = seat.seatNo.trim().toUpperCase();
    if (seenSeatNumbers.has(normalizedSeatNumber)) return true;
    seenSeatNumbers.add(normalizedSeatNumber);
    return false;
  });
  if (duplicateSeat) {
    return NextResponse.json({ error: `Seat number “${duplicateSeat.seatNo}” is used more than once. Give every seat a unique number across all decks.` }, { status: 400 });
  }

  try {
    let prismaVehicle = await prisma.vehicle.findFirst({ where: { name: parsed.data.busNumber } });
    if (prismaVehicle) {
      const [tripCount, reservationCount] = await Promise.all([
        prisma.trip.count({ where: { vehicleId: prismaVehicle.id } }),
        prisma.seatReservation.count({ where: { seatTemplate: { vehicleId: prismaVehicle.id } } }),
      ]);
      if (tripCount > 0 || reservationCount > 0) {
        return NextResponse.json({ error: "This bus layout is assigned to trips or seat reservations and cannot be changed. Remove those references first." }, { status: 409 });
      }
    }

    await connectMongo();
    const bus = await Bus.findOneAndUpdate(
      { busNumber: parsed.data.busNumber },
      {
        busNumber: parsed.data.busNumber,
        operator: parsed.data.operator,
        description: parsed.data.description,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const layout = await BusLayout.findOneAndUpdate(
      { busId: bus._id },
      {
        busId: bus._id,
        rows: parsed.data.rows,
        cols: parsed.data.cols,
        decks: parsed.data.decks,
        seats: parsed.data.seats,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!prismaVehicle) {
      prismaVehicle = await prisma.vehicle.create({
        data: {
          name: parsed.data.busNumber,
          totalDecks: parsed.data.decks.length,
          seatTemplates: {
            create: parsed.data.seats.map((seat) => ({
              seatNumber: seat.seatNo,
              deck: seat.deck,
              type: seat.type === "SEATER" ? "SEAT" : "SLEEPER",
              rowSpan: 1,
              colSpan: 1,
              xPosition: seat.col,
              yPosition: seat.row,
            })),
          },
        },
      });
    } else if (!prismaVehicle.isActive) {
      prismaVehicle = await prisma.$transaction(async (tx) => {
        await tx.seatTemplate.deleteMany({ where: { vehicleId: prismaVehicle!.id } });
        return tx.vehicle.update({
          where: { id: prismaVehicle!.id },
          data: {
            isActive: true,
            totalDecks: parsed.data.decks.length,
            seatTemplates: {
              create: parsed.data.seats.map((seat) => ({
                seatNumber: seat.seatNo,
                deck: seat.deck,
                type: seat.type === "SEATER" ? "SEAT" : "SLEEPER",
                rowSpan: 1,
                colSpan: 1,
                xPosition: seat.col,
                yPosition: seat.row,
              })),
            },
          },
        });
      });
    } else {
      // Keep the relational seat templates in sync with the edited Mongo layout.
      // A trip created from stale templates could otherwise reintroduce old or
      // duplicate seat numbers even after the admin fixes the layout.
      prismaVehicle = await prisma.$transaction(async (tx) => {
        await tx.seatTemplate.deleteMany({ where: { vehicleId: prismaVehicle!.id } });
        return tx.vehicle.update({
          where: { id: prismaVehicle!.id },
          data: {
            totalDecks: parsed.data.decks.length,
            seatTemplates: {
              create: parsed.data.seats.map((seat) => ({
                seatNumber: seat.seatNo,
                deck: seat.deck,
                type: seat.type === "SEATER" ? "SEAT" : "SLEEPER",
                rowSpan: 1,
                colSpan: 1,
                xPosition: seat.col,
                yPosition: seat.row,
              })),
            },
          },
        });
      });
    }

    return NextResponse.json({
      bus: { id: bus._id.toString(), busNumber: bus.busNumber, operator: bus.operator, description: bus.description || "" },
      layout: { id: layout._id.toString(), rows: layout.rows, cols: layout.cols, decks: layout.decks, seats: layout.seats },
      vehicle: { id: prismaVehicle.id, name: prismaVehicle.name, totalDecks: prismaVehicle.totalDecks },
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to save bus layout", error);
    return NextResponse.json({ error: "Could not save layout. Check the MongoDB connection." }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const busNumber = new URL(req.url).searchParams.get("busNumber")?.trim();
  if (!busNumber) {
    return NextResponse.json({ error: "Bus number is required" }, { status: 400 });
  }

  let deactivatedVehicleId: string | null = null;
  let mongoLayoutDeleted = false;
  try {
    await connectMongo();
    const [bus] = await Bus.find({ busNumber }).limit(1).lean();
    if (!bus) return NextResponse.json({ error: "Bus not found" }, { status: 404 });

    const layout = await BusLayout.findOne({ busId: bus._id });
    if (!layout) return NextResponse.json({ error: "This bus has no saved layout" }, { status: 404 });

    const vehicle = await prisma.vehicle.findFirst({ where: { name: busNumber } });
    if (vehicle) {
      if (vehicle.isActive) {
        await prisma.vehicle.update({ where: { id: vehicle.id }, data: { isActive: false } });
        deactivatedVehicleId = vehicle.id;
      }

      const [tripCount, reservationCount] = await Promise.all([
        prisma.trip.count({ where: { vehicleId: vehicle.id } }),
        prisma.seatReservation.count({ where: { seatTemplate: { vehicleId: vehicle.id } } }),
      ]);
      if (tripCount > 0 || reservationCount > 0) {
        if (deactivatedVehicleId) {
          await prisma.vehicle.update({ where: { id: deactivatedVehicleId }, data: { isActive: true } });
          deactivatedVehicleId = null;
        }
      }
      if (tripCount > 0) {
        return NextResponse.json({
          error: `Cannot delete this layout because ${tripCount} trip${tripCount === 1 ? " is" : "s are"} assigned to this bus. Remove or reassign those trips first.`,
        }, { status: 409 });
      }
      if (reservationCount > 0) {
        return NextResponse.json({ error: "Cannot delete this layout because seat reservations still use it." }, { status: 409 });
      }
    }

    try {
      const deleteResult = await BusLayout.deleteOne({ busId: bus._id });
      if (deleteResult.deletedCount !== 1) throw new Error("The saved layout was not found during deletion.");
      mongoLayoutDeleted = true;
      if (vehicle) {
        await prisma.$transaction(async (tx) => {
          await tx.seatTemplate.deleteMany({ where: { vehicleId: vehicle.id } });
          await tx.vehicle.delete({ where: { id: vehicle.id } });
        });
      }
    } catch (error) {
      // Restore the Mongo layout if the relational records could not be removed.
      if (mongoLayoutDeleted) await BusLayout.create(layout.toObject()).catch(() => undefined);
      throw error;
    }

    deactivatedVehicleId = null;
    return NextResponse.json({ success: true });
  } catch (error) {
    if (deactivatedVehicleId) {
      await prisma.vehicle.update({ where: { id: deactivatedVehicleId }, data: { isActive: true } }).catch(() => undefined);
    }
    console.error("Failed to delete bus layout", error);
    return NextResponse.json({ error: "Could not delete layout. Check the database connection and try again." }, { status: 503 });
  }
}
