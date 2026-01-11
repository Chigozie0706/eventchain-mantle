"use client";
import { useCallback, useEffect, useState } from "react";
import CreatorEventCard from "components/CreatorEventCard";
import {
  useReadContract,
  useWriteContract,
  useConnection,
  useWaitForTransactionReceipt,
  useBlockNumber,
  useWalletClient,
} from "wagmi";
import contractABI from "contract/eventchainAbi.json";
import { toast } from "react-hot-toast";
import { ethers } from "ethers";
import { AlertCircle, RefreshCw, Users, Wallet } from "lucide-react";

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
  minimumAge: number;
  maxCapacity: number;
  isCanceled: boolean;
  fundsReleased: boolean;
  exists: boolean;
  refundPolicy: RefundPolicy;
  refundBufferHours: number;
}

enum RefundPolicy {
  NO_REFUND = 0,
  REFUND_BEFORE_START = 1,
  CUSTOM_BUFFER = 2,
}

const REFUND_POLICY_LABELS = {
  [RefundPolicy.NO_REFUND]: "No Refunds",
  [RefundPolicy.REFUND_BEFORE_START]: "Refund Before Start",
  [RefundPolicy.CUSTOM_BUFFER]: "Custom Buffer",
};

const CONTRACT_ADDRESS = "0x36faD67F403546f6c2947579a27d03bDAfe77d1a";

export default function MyEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const { address: connectedAddress } = useConnection();
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "ended" | "canceled">(
    "all"
  );
  const [pendingWithdrawal, setPendingWithdrawal] = useState(0);
  const cancelEventWrirte = useWriteContract();
  const claimFundsWrite = useWriteContract();
  const deleteEventWrite = useWriteContract();
  const handleWithdrawWrite = useWriteContract();

  const { data: walletClient } = useWalletClient();

  // Add this hook for transaction tracking
  const { data: hash, isPending: isWriting } = useWriteContract();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

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
    functionName: "getActiveEventsByCreator",
    account: connectedAddress,
  });

  useEffect(() => {
    if (isLoading) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (isError) {
      console.error("🚨 Contract read error:", {
        error: contractError,
        contractAddress: CONTRACT_ADDRESS,
        functionName: "getActiveEventsByCreator",
        timestamp: new Date().toISOString(),
      });
      setError("Failed to load your events");
    }
  }, [isError, contractError]);

  useEffect(() => {
    if (isSuccess && data) {
      try {
        console.log(" Raw creator events data received:", {
          data,
          timestamp: new Date().toISOString(),
        });

        if (!Array.isArray(data) || data.length !== 2) {
          throw new Error("Unexpected data format from contract");
        }

        const [eventIds, activeEvents] = data as [bigint[], any[]];

        const formattedEvents = activeEvents.map((event, idx) => ({
          index: Number(eventIds[idx]),
          owner: event.owner,
          eventName: event.eventName,
          eventCardImgUrl: event.eventCardImgUrl,
          eventDetails: event.eventDetails,
          startDate: Number(event.startDate),
          endDate: Number(event.endDate),
          startTime: Number(event.startTime),
          endTime: Number(event.endTime),
          eventLocation: event.eventLocation,
          isActive: event.isActive,
          ticketPrice: Number(ethers.formatUnits(event.ticketPrice, 18)),
          fundsHeld: Number(ethers.formatUnits(event.fundsHeld, 18)),
          isCanceled: event.isCanceled,
          fundsReleased: event.fundsReleased,
          minimumAge: event.minimumAge,
          maxCapacity: event.maxCapacity,
          exists: event.exists,
          refundPolicy: event.refundPolicy,
          refundBufferHours: event.refundBufferHours,
        }));

        setEvents(formattedEvents);
      } catch (error) {
        console.error("🚨 Error processing creator events data:", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          data,
          timestamp: new Date().toISOString(),
        });
        setError("Error processing your event data");
      }
    }
  }, [isSuccess, data]);

  // Auto-refresh when block number changes (new blocks mean state might have changed)
  useEffect(() => {
    refetch();
  }, [blockNumber, refetch]);

  const cancelEvent = useCallback(
    async (eventId: number) => {
      console.log("[Cancel] Starting event cancellation process");

      if (!connectedAddress || !walletClient) {
        console.log("[Cancel] Wallet not connected - aborting");
        toast.error("Please connect your wallet first");
        return;
      }

      setCancelingId(eventId);
      const toastId = toast.loading("Preparing cancellation...");

      try {
        toast.loading("Waiting for wallet confirmation...", { id: toastId });
        cancelEventWrirte.mutate({
          address: CONTRACT_ADDRESS,
          abi: contractABI.abi,
          functionName: "buyTicket",
          args: [eventId],
        });

        // Force a refresh after a short delay to account for block confirmation
        setTimeout(() => {
          refetch();
        }, 5000);
      } catch (error: any) {
        console.error("[Cancel] Transaction failed:", {
          error: error.message,
          stack: error.stack,
        });
        toast.error(error.message || "Failed to cancel event");
      } finally {
        setCancelingId(null);
      }
    },
    [connectedAddress, walletClient, refetch]
  );

  const deleteEvent = async (eventId: number) => {
    const toastId = toast.loading("Deleting event...");
    try {
      deleteEventWrite.mutate({
        address: CONTRACT_ADDRESS,
        abi: contractABI.abi,
        functionName: "buyTicket",
        args: [eventId],
      });

      toast.dismiss(toastId);
      toast.success("Event deleted successfully!");

      console.log(`🗑️ Event ${eventId} deleted. Refreshing events...`);
      await refetch();
    } catch (error) {
      console.error("🚨 Error deleting event:", {
        error,
        eventId,
        timestamp: new Date().toISOString(),
      });

      toast.dismiss(toastId);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete event"
      );
    }
  };

  const claimFunds = useCallback(
    async (eventId: number) => {
      console.log("[Claim] Starting claim process");

      if (!connectedAddress || !walletClient) {
        toast.error("Please connect your wallet first");
        return;
      }

      setClaimingId(eventId);
      const toastId = toast.loading("Preparing claim...");

      try {
        toast.loading("Waiting for wallet confirmation...", { id: toastId });
        claimFundsWrite.mutate({
          address: CONTRACT_ADDRESS,
          abi: contractABI.abi,
          functionName: "buyTicket",
          args: [eventId],
        });
        setTimeout(() => {
          refetch();
        }, 5000);
      } catch (error: any) {
        console.error("[Claim] Transaction failed:", error);
        toast.error(error.message || "Failed to claim funds");
      } finally {
        setClaimingId(null);
      }
    },
    [connectedAddress, walletClient, refetch]
  );

  const handleWithdraw = useCallback(async () => {
    console.log("[Claim] Starting claim process");

    if (!connectedAddress || !walletClient) {
      toast.error("Please connect your wallet first");
      return;
    }
    const toastId = toast.loading("Preparing claim...");

    try {
      toast.loading("Waiting for wallet confirmation...", { id: toastId });
      handleWithdrawWrite.mutate({
        address: CONTRACT_ADDRESS,
        abi: contractABI.abi,
        functionName: "buyTicket",
      });
      setTimeout(() => {
        refetch();
      }, 5000);
    } catch (error: any) {
      console.error("[Claim] Transaction failed:", error);
      toast.error(error.message || "Failed to claim funds");
    } finally {
      setClaimingId(null);
    }
  }, [connectedAddress, walletClient, refetch]);

  const filteredEvents = events.filter((event) => {
    if (filter === "all") return true;
    if (filter === "active") return event.isActive && !event.isCanceled;
    if (filter === "ended")
      return event.endDate < Math.floor(Date.now() / 1000);
    if (filter === "canceled") return event.isCanceled;
    return true;
  });

  const stats = {
    total: events.length,
    active: events.filter((e) => e.isActive && !e.isCanceled).length,
    ended: events.filter((e) => e.endDate < Math.floor(Date.now() / 1000))
      .length,
    canceled: events.filter((e) => e.isCanceled).length,
    totalFunds: events.reduce((sum, e) => sum + e.fundsHeld, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 pt-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <RefreshCw
            size={48}
            className="animate-spin text-purple-600 mx-auto mb-4"
          />
          <p className="text-lg text-gray-600">Loading your events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-900 mb-2">
              Error Loading Events
            </h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 pt-20 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Events</h1>
            <p className="text-gray-600">
              Manage your created events and track earnings
            </p>
          </div>

          {/* Pending Withdrawal */}
          {pendingWithdrawal > 0 && (
            <button
              onClick={handleWithdraw}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Wallet size={20} />
              Withdraw {pendingWithdrawal.toFixed(2)} MNT
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-sm text-gray-500 mb-1">Total Events</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-sm text-gray-500 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-sm text-gray-500 mb-1">Ended</p>
            <p className="text-2xl font-bold text-gray-600">{stats.ended}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-sm text-gray-500 mb-1">Canceled</p>
            <p className="text-2xl font-bold text-red-600">{stats.canceled}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md col-span-2 md:col-span-1">
            <p className="text-sm text-gray-500 mb-1">Total Held</p>
            <p className="text-2xl font-bold text-purple-600">
              {stats.totalFunds.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "active", "ended", "canceled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f
                  ? "bg-purple-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <CreatorEventCard
                key={event.index}
                event={event}
                onCancel={cancelEvent}
                onClaim={claimFunds}
                onDelete={deleteEvent}
                onWithdraw={handleWithdraw}
                cancelLoading={cancelingId === event.index}
                claimLoading={claimingId === event.index}
                deleteLoading={deletingId === event.index}
                attendeeCount={
                  // attendeeCounts[event.index as keyof typeof attendeeCounts] ||
                  0
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users size={64} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No events found
            </h3>
            <p className="text-gray-600">
              {filter === "all"
                ? "You haven't created any events yet."
                : `No ${filter} events found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
