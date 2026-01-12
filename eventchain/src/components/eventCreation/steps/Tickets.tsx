"use client";

import { useState, useEffect } from "react";
import { EventData } from "../types";
import { FormInput } from "@/components/FormInput";

export type Token = {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
};

interface Props {
  eventData: EventData;
  setEventData: React.Dispatch<React.SetStateAction<EventData>>;
}

export default function Tickets({ eventData, setEventData }: Props) {
  const [errors, setErrors] = useState({
    ticketPrice: "",
    maxCapacity: "",
    refundBufferHours: "",
  });

  // Validate inputs in real-time
  useEffect(() => {
    const newErrors = {
      ticketPrice: "",
      maxCapacity: "",
      refundBufferHours: "",
    };

    // Validate ticket price
    if (eventData.ticketPrice) {
      const price = parseFloat(eventData.ticketPrice);
      if (isNaN(price) || price < 0) {
        newErrors.ticketPrice = "Price must be 0 or greater";
      } else if (price > 1000000) {
        newErrors.ticketPrice = "Price seems unusually high";
      }
    }

    // Validate max capacity
    if (eventData.maxCapacity) {
      const capacity = parseInt(eventData.maxCapacity);
      if (isNaN(capacity) || capacity <= 0) {
        newErrors.maxCapacity = "Capacity must be greater than 0";
      } else if (capacity > 100000) {
        newErrors.maxCapacity = "Capacity cannot exceed 100,000";
      }
    }

    // Validate refund buffer hours
    if (eventData.refundPolicy === "2" && eventData.refundBufferHours) {
      const bufferHours = parseInt(eventData.refundBufferHours);

      if (isNaN(bufferHours) || bufferHours <= 0) {
        newErrors.refundBufferHours = "Buffer must be greater than 0";
      } else if (bufferHours > 720) {
        newErrors.refundBufferHours =
          "Buffer cannot exceed 720 hours (30 days)";
      } else if (eventData.startDate && eventData.startTime) {
        // Check if refund buffer exceeds time until event
        const startDateTime = new Date(
          `${eventData.startDate}T${eventData.startTime}`
        );
        const now = new Date();
        const hoursUntilEvent =
          (startDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (bufferHours >= hoursUntilEvent) {
          newErrors.refundBufferHours =
            "Refund buffer exceeds time until event starts";
        }
      }
    }

    setErrors(newErrors);
  }, [
    eventData.ticketPrice,
    eventData.maxCapacity,
    eventData.refundBufferHours,
    eventData.refundPolicy,
    eventData.startDate,
    eventData.startTime,
  ]);

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Ticket Price (MNT)" required>
            <>
              <input
                type="number"
                name="ticketPrice"
                value={eventData.ticketPrice}
                min="0"
                step="0.001"
                onChange={(e) =>
                  setEventData({ ...eventData, ticketPrice: e.target.value })
                }
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition ${
                  errors.ticketPrice ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="0.001"
              />
              {errors.ticketPrice && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.ticketPrice}
                </p>
              )}
            </>
          </FormInput>

          <FormInput label="Max Capacity" required>
            <>
              <input
                type="number"
                min="1"
                max="100000"
                name="maxCapacity"
                value={eventData.maxCapacity}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition ${
                  errors.maxCapacity ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="100"
                onChange={(e) =>
                  setEventData({ ...eventData, maxCapacity: e.target.value })
                }
              />
              {errors.maxCapacity && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.maxCapacity}
                </p>
              )}
            </>
          </FormInput>
        </div>

        <FormInput label="Refund Policy" required>
          <select
            value={eventData.refundPolicy}
            onChange={(e) =>
              setEventData({ ...eventData, refundPolicy: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
          >
            <option value="0">No Refunds</option>
            <option value="1">Refund Before Event Start</option>
            <option value="2">Custom Refund Buffer</option>
          </select>
        </FormInput>

        {eventData.refundPolicy === "2" && (
          <FormInput label="Refund Buffer (Hours)" required>
            <>
              <input
                type="number"
                min="1"
                max="720"
                value={eventData.refundBufferHours}
                name="refundBufferHours"
                onChange={(e) =>
                  setEventData({
                    ...eventData,
                    refundBufferHours: e.target.value,
                  })
                }
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition ${
                  errors.refundBufferHours
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="24"
              />
              {errors.refundBufferHours && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.refundBufferHours}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Refunds allowed until this many hours before event start (max
                720 hours / 30 days)
              </p>
            </>
          </FormInput>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">
            Refund Policy Guide
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • <strong>No Refunds:</strong> Tickets cannot be refunded
            </li>
            <li>
              • <strong>Before Start:</strong> Refunds allowed anytime before
              event starts
            </li>
            <li>
              • <strong>Custom Buffer:</strong> Refunds allowed until X hours
              before event
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
