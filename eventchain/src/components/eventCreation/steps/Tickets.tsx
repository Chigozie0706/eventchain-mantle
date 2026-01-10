import { useState } from "react";
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
  const [errors, setErrors] = useState("");

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Ticket Price (ETH)" error={errors} required>
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
                // errors.ticketPrice ? "border-red-500" :
                "border-gray-300"
              }`}
              placeholder="0.001"
            />
          </FormInput>

          <FormInput label="Max Capacity" error={errors} required>
            <input
              type="number"
              min="1"
              max="100000"
              name="maxCapacity"
              value={eventData.maxCapacity}
              // onChange={(e) => updateFormData("maxCapacity", e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition ${
                // errors.maxCapacity ? "border-red-500" :
                "border-gray-300"
              }`}
              placeholder="100"
              onChange={(e) =>
                setEventData({ ...eventData, maxCapacity: e.target.value })
              }
            />
          </FormInput>
        </div>

        <FormInput label="Refund Policy" error={errors} required>
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
          <FormInput label="Refund Buffer (Hours)" error={errors} required>
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
                  // errors.refundBufferHours ? "border-red-500" :
                  "border-gray-300"
                }`}
                placeholder="24"
              />
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
