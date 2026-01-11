"use client";
import { useEffect, useState } from "react";
import EventCard from "@/components/EventCard";
import { useAccount, useReadContract } from "wagmi";
import contractABI from "contract/eventchainAbi.json";
import { RefreshCw, AlertCircle } from "lucide-react";

interface Event {
  index: number;
  owner: string;
  eventName: string;
  eventCardImgUrl: string;
  eventDetails: string;
  startDate: number;
  endDate: number;
  startTime: number;
  endTime: number;
  eventLocation: string;
  isActive: boolean;
  ticketPrice: number;
  fundsHeld: number;
  isCanceled: boolean;
  fundsReleased: boolean;
  paymentToken: string;
}

const CONTRACT_ADDRESS = "0x36faD67F403546f6c2947579a27d03bDAfe77d1a";

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();

  const {
    data,
    error: contractError,
    isLoading,
    isError,
    isSuccess,
    refetch,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI.abi,
    functionName: "getAllEvents",
  });

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (isError) {
      console.error("🚨 Contract read error:", {
        error: contractError,
        contractAddress: CONTRACT_ADDRESS,
        functionName: "getAllEvents",
        timestamp: new Date().toISOString(),
      });
      setError(contractError?.message || "Failed to load events");
    } else {
      setError(null);
    }
  }, [isError, contractError]);

  useEffect(() => {
    if (isSuccess && data) {
      try {
        console.log("ℹ️ Raw events data received:", {
          data,
          timestamp: new Date().toISOString(),
        });

        if (!Array.isArray(data) || data.length !== 2) {
          throw new Error("Unexpected data format from contract");
        }

        const [indexes, eventData] = data as [bigint[], any[]];

        console.log("ℹ️ Processing events data...", {
          indexesCount: indexes.length,
          eventsCount: eventData.length,
          timestamp: new Date().toISOString(),
        });

        const formattedEvents = eventData.map((event, idx) => ({
          index: Number(indexes[idx]),
          owner: event.owner,
          eventName: event.eventName,
          eventCardImgUrl: event.eventCardImgUrl,
          eventDetails: event.eventDetails,
          startDate: Number(event.startDate),
          endDate: Number(event.endDate), // Fixed: was using startTime
          startTime: Number(event.startTime),
          endTime: Number(event.endTime),
          eventLocation: event.eventLocation,
          isActive: event.isActive,
          ticketPrice: Number(event.ticketPrice),
          fundsHeld: Number(event.fundsHeld),
          isCanceled: event.isCanceled,
          fundsReleased: event.fundsReleased,
          paymentToken: event.paymentToken,
        }));

        // Filter out canceled events and sort by start date
        const activeEvents = formattedEvents
          .filter((event) => !event.isCanceled)
          .sort((a, b) => a.startDate - b.startDate);

        console.log("✅ Successfully formatted events:", {
          totalEvents: formattedEvents.length,
          activeEvents: activeEvents.length,
          sampleEvent: activeEvents[0],
          timestamp: new Date().toISOString(),
        });

        setEvents(activeEvents);
      } catch (error) {
        console.error("🚨 Error processing events data:", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          data,
          timestamp: new Date().toISOString(),
        });
        setError("Error processing event data. Please try again.");
      }
    }
  }, [isSuccess, data]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    await refetch();
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 mt-20">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                Featured & Upcoming Events
              </h3>
              {isConnected && address && (
                <p className="text-sm text-gray-500 mt-2">
                  Connected: {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh events"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {events.length > 0 ? (
              events.map((event) => (
                <EventCard
                  key={`event-${event.index}-${event.owner}`}
                  event={event}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
                  <div className="text-6xl mb-4">🎭</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    No Events Available
                  </h3>
                  <p className="text-gray-500">
                    There are currently no upcoming events. Check back soon!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
