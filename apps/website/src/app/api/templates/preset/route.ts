import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
export const dynamic = "force-dynamic";


/**
 * GET /api/templates/preset
 *
 * Returns a catalog of preset layouts (2+1 Sleeper, 2+2 Seater, etc.)
 * that admins can use as a starting point for building custom seat
 * arrangements.
 */
export async function GET() {
  const presets: Preset[] = [
    {
      id: "2plus1-sleeper",
      name: "2+1 Sleeper",
      description:
        "Classic sleeper layout — two lower berths + one upper bunk per row.",
      totalDecks: 2,
      seats: generate2Plus1Sleeper(),
    },
    {
      id: "2plus2-seater",
      name: "2+2 Seater",
      description: "Two seats on each side of the aisle — typical seater bus.",
      totalDecks: 1,
      seats: generate2Plus2Seater(),
    },
    {
      id: "3plus1-sleeper",
      name: "3+1 Sleeper",
      description:
        "Three lower berths on one side and one on the other per row.",
      totalDecks: 2,
      seats: generate3Plus1Sleeper(),
    },
  ];

  return NextResponse.json(presets);
}

interface Preset {
  id: string;
  name: string;
  description: string;
  totalDecks: number;
  seats: Array<{
    seatNumber: string;
    deck: "LOWER" | "UPPER";
    type: "SEAT" | "SLEEPER";
    rowSpan: number;
    colSpan: number;
    xPosition: number;
    yPosition: number;
  }>;
}

/**
 * Generates a 2+1 sleeper grid:
 * - Lower deck: seats 1A, 1B, 2A, 2B, ... (x: 0..2 pairs)
 * - Upper deck: beds A, B, C, ... (x: 0..2 triples)
 *
 * The grid uses five columns: two seats, an aisle, then two seats.
 */
function generate2Plus1Sleeper() {
  const seats: Preset["seats"] = [];
  let seatNum = 1;

  for (let row = 0; row < 5; row++) {
    // Lower deck — 2 seats per row
    seats.push({
      seatNumber: `${seatNum++}A`,
      deck: "LOWER",
      type: "SLEEPER",
      rowSpan: 1,
      colSpan: 1,
      xPosition: 0,
      yPosition: row,
    });
    seats.push({
      seatNumber: `${seatNum++}B`,
      deck: "LOWER",
      type: "SLEEPER",
      rowSpan: 1,
      colSpan: 1,
      xPosition: 1,
      yPosition: row,
    });

    // Upper deck — one bunk on the right side of the aisle.
    seats.push({
      seatNumber: `${seatNum++}U`,
      deck: "UPPER",
      type: "SLEEPER",
      rowSpan: 1,
      colSpan: 2,
      xPosition: 3,
      yPosition: row,
    });
  }

  return seats;
}

/**
 * Generates a 2+2 seater grid — 4 seats per row (2+2 layout).
 */
function generate2Plus2Seater() {
  const seats: Preset["seats"] = [];
  let seatNum = 1;

  for (let row = 0; row < 5; row++) {
    // Left side
    seats.push({
      seatNumber: `${seatNum++}A`,
      deck: "LOWER",
      type: "SEAT",
      rowSpan: 1,
      colSpan: 1,
      xPosition: 0,
      yPosition: row,
    });
    seats.push({
      seatNumber: `${seatNum++}B`,
      deck: "LOWER",
      type: "SEAT",
      rowSpan: 1,
      colSpan: 1,
      xPosition: 1,
      yPosition: row,
    });

    // Right side, with column 2 reserved for the aisle.
    seats.push({
      seatNumber: `${seatNum++}C`,
      deck: "LOWER",
      type: "SEAT",
      rowSpan: 1,
      colSpan: 1,
      xPosition: 3,
      yPosition: row,
    });
    seats.push({
      seatNumber: `${seatNum++}D`,
      deck: "LOWER",
      type: "SEAT",
      rowSpan: 1,
      colSpan: 1,
      xPosition: 4,
      yPosition: row,
    });
  }

  return seats;
}

/**
 * Generates a 3+1 sleeper grid.
 */
function generate3Plus1Sleeper() {
  const seats: Preset["seats"] = [];
  let seatNum = 1;

  for (let row = 0; row < 5; row++) {
    // Three lower berths
    seats.push({
      seatNumber: `${seatNum++}A`,
      deck: "LOWER",
      type: "SLEEPER",
      rowSpan: 1,
      colSpan: 1,
      xPosition: 0,
      yPosition: row,
    });
    seats.push({
      seatNumber: `${seatNum++}B`,
      deck: "LOWER",
      type: "SLEEPER",
      rowSpan: 1,
      colSpan: 1,
      xPosition: 1,
      yPosition: row,
    });
    seats.push({
      seatNumber: `${seatNum++}C`,
      deck: "LOWER",
      type: "SLEEPER",
      rowSpan: 1,
      colSpan: 1,
      xPosition: 2,
      yPosition: row,
    });

    // One upper bunk on the other side of the aisle.
    seats.push({
      seatNumber: `${seatNum++}U`,
      deck: "UPPER",
      type: "SLEEPER",
      rowSpan: 1,
      colSpan: 1,
      xPosition: 4,
      yPosition: row,
    });
  }

  return seats;
}