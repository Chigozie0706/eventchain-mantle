"use client";
import { useCallback, useEffect, useState } from "react";
import CreatorEventCard from "components/CreatorEventCard";
import {
  useReadContract,
  useWriteContract,
  useConnection,
  useBlockNumber,
} from "wagmi";
import contractABI from "contract/eventchainAbi.json";
import { toast, Toaster } from "react-hot-toast";
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

const CONTRACT_ADDRESS = "0x36faD67F403546f6c2947579a27d03bDAfe77d1a";

// Sweet toast configurations
const toastConfig = {
  success: {
    duration: 4000,
    icon: "✅",
    style: {
      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      color: "#fff",
      fontWeight: "600",
      padding: "16px 24px",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
    },
  },
  error: {
    duration: 5000,
    icon: "❌",
    style: {
      background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      color: "#fff",
      fontWeight: "600",
      padding: "16px 24px",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(239, 68, 68, 0.3)",
    },
  },
  loading: {
    icon: "⏳",
    style: {
      background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      color: "#fff",
      fontWeight: "600",
      padding: "16px 24px",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)",
    },
  },
  info: {
    duration: 3000,
    icon: "ℹ️",
    style: {
      background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
      color: "#fff",
      fontWeight: "600",
      padding: "16px 24px",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(99, 102, 241, 0.3)",
    },
  },
};

export default function MyEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address: connectedAddress, isConnected } = useConnection(); // v3: useAccount renamed to useConnection
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "ended" | "canceled">(
    "all"
  );
  const [pendingWithdrawal, setPendingWithdrawal] = useState(0);

  // v3: Separate hooks instead of destructuring
  const cancelEvent = useWriteContract();
  const claimFunds = useWriteContract();
  const deleteEvent = useWriteContract();
  const handleWithdraw = useWriteContract();

  const { data: blockNumber } = useBlockNumber({ watch: true });

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

  // Read pending withdrawal
  const { data: pendingWithdrawalData, refetch: refetchPendingWithdrawal } =
    useReadContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI.abi,
      functionName: "getPendingWithdrawal",
      args: [connectedAddress],
    });

  // Update pending withdrawal
  useEffect(() => {
    if (pendingWithdrawalData) {
      const withdrawal = Number(pendingWithdrawalData) / 1e18;
      setPendingWithdrawal(withdrawal);
    }
  }, [pendingWithdrawalData]);

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
      toast.error("Failed to load your events", toastConfig.error);
    }
  }, [isError, contractError]);

  useEffect(() => {
    if (isSuccess && data) {
      try {
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
          minimumAge: Number(event.minimumAge),
          maxCapacity: Number(event.maxCapacity),
          exists: event.exists,
          refundPolicy: Number(event.refundPolicy),
          refundBufferHours: Number(event.refundBufferHours),
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
        toast.error("Error processing event data", toastConfig.error);
      }
    }
  }, [isSuccess, data]);

  // Auto-refresh when block number changes
  useEffect(() => {
    if (blockNumber) {
      refetch();
      refetchPendingWithdrawal();
    }
  }, [blockNumber, refetch, refetchPendingWithdrawal]);

  const handleCancelEvent = useCallback(
    async (eventId: number) => {
      if (!isConnected || !connectedAddress) {
        toast.error("🔌 Please connect your wallet first", toastConfig.error);
        return;
      }

      setCancelingId(eventId);
      const toastId = toast.loading(
        "⏳ Preparing to cancel event...",
        toastConfig.loading
      );

      try {
        cancelEvent.mutate(
          {
            address: CONTRACT_ADDRESS,
            abi: contractABI.abi,
            functionName: "cancelEvent",
            args: [BigInt(eventId)],
          },
          {
            onSuccess: async () => {
              toast.dismiss(toastId);
              toast.success(
                "🎯 Event cancelled successfully!",
                toastConfig.success
              );

              await refetch();
              await refetchPendingWithdrawal();

              setTimeout(() => {
                toast.success(
                  "✅ Refunds will be processed for attendees",
                  toastConfig.info
                );
              }, 1000);
            },
            onError: (error: any) => {
              console.error("Cancel event error:", error);
              toast.dismiss(toastId);
              const errorMsg =
                error?.shortMessage ||
                error?.message ||
                "Failed to cancel event";
              toast.error(`❌ ${errorMsg}`, toastConfig.error);
            },
            onSettled: () => {
              setCancelingId(null);
            },
          }
        );
      } catch (error: any) {
        console.error("Cancel event error:", error);
        toast.dismiss(toastId);
        toast.error(
          `❌ ${error?.message || "Failed to cancel event"}`,
          toastConfig.error
        );
        setCancelingId(null);
      }
    },
    [
      isConnected,
      connectedAddress,
      cancelEvent,
      refetch,
      refetchPendingWithdrawal,
    ]
  );

  const handleDeleteEvent = useCallback(
    async (eventId: number) => {
      if (!isConnected || !connectedAddress) {
        toast.error("🔌 Please connect your wallet first", toastConfig.error);
        return;
      }

      setDeletingId(eventId);
      const toastId = toast.loading(
        "⏳ Deleting event...",
        toastConfig.loading
      );

      try {
        deleteEvent.mutate(
          {
            address: CONTRACT_ADDRESS,
            abi: contractABI.abi,
            functionName: "deleteEvent",
            args: [BigInt(eventId)],
          },
          {
            onSuccess: async () => {
              toast.dismiss(toastId);
              toast.success(
                "🗑️ Event deleted successfully!",
                toastConfig.success
              );

              await refetch();
            },
            onError: (error: any) => {
              console.error("Delete event error:", error);
              toast.dismiss(toastId);
              const errorMsg =
                error?.shortMessage ||
                error?.message ||
                "Failed to delete event";
              toast.error(`❌ ${errorMsg}`, toastConfig.error);
            },
            onSettled: () => {
              setDeletingId(null);
            },
          }
        );
      } catch (error: any) {
        console.error("Delete event error:", error);
        toast.dismiss(toastId);
        toast.error(
          `❌ ${error?.message || "Failed to delete event"}`,
          toastConfig.error
        );
        setDeletingId(null);
      }
    },
    [isConnected, connectedAddress, deleteEvent, refetch]
  );

  const handleClaimFunds = useCallback(
    async (eventId: number) => {
      if (!isConnected || !connectedAddress) {
        toast.error("🔌 Please connect your wallet first", toastConfig.error);
        return;
      }

      setClaimingId(eventId);
      const toastId = toast.loading(
        "⏳ Claiming event funds...",
        toastConfig.loading
      );

      try {
        claimFunds.mutate(
          {
            address: CONTRACT_ADDRESS,
            abi: contractABI.abi,
            functionName: "releaseFunds",
            args: [BigInt(eventId)],
          },
          {
            onSuccess: async () => {
              toast.dismiss(toastId);
              toast.success(
                "💰 Funds claimed successfully!",
                toastConfig.success
              );

              await refetch();
              await refetchPendingWithdrawal();

              setTimeout(() => {
                toast.success(
                  "✅ Funds added to pending withdrawal",
                  toastConfig.info
                );
              }, 1000);
            },
            onError: (error: any) => {
              console.error("Claim funds error:", error);
              toast.dismiss(toastId);
              const errorMsg =
                error?.shortMessage ||
                error?.message ||
                "Failed to claim funds";
              toast.error(`❌ ${errorMsg}`, toastConfig.error);
            },
            onSettled: () => {
              setClaimingId(null);
            },
          }
        );
      } catch (error: any) {
        console.error("Claim funds error:", error);
        toast.dismiss(toastId);
        toast.error(
          `❌ ${error?.message || "Failed to claim funds"}`,
          toastConfig.error
        );
        setClaimingId(null);
      }
    },
    [
      isConnected,
      connectedAddress,
      claimFunds,
      refetch,
      refetchPendingWithdrawal,
    ]
  );

  const handleWithdrawFunds = useCallback(async () => {
    if (!isConnected || !connectedAddress) {
      toast.error("🔌 Please connect your wallet first", toastConfig.error);
      return;
    }

    const toastId = toast.loading(
      "⏳ Withdrawing funds...",
      toastConfig.loading
    );

    try {
      handleWithdraw.mutate(
        {
          address: CONTRACT_ADDRESS,
          abi: contractABI.abi,
          functionName: "withdraw",
        },
        {
          onSuccess: async () => {
            toast.dismiss(toastId);
            toast.success("💸 Withdrawal successful!", toastConfig.success);

            await refetchPendingWithdrawal();

            setTimeout(() => {
              toast.success("✅ Funds sent to your wallet", toastConfig.info);
            }, 1000);
          },
          onError: (error: any) => {
            console.error("Withdrawal error:", error);
            toast.dismiss(toastId);
            const errorMsg =
              error?.shortMessage || error?.message || "Withdrawal failed";
            toast.error(`❌ ${errorMsg}`, toastConfig.error);
          },
        }
      );
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast.dismiss(toastId);
      toast.error(
        `❌ ${error?.message || "Withdrawal failed"}`,
        toastConfig.error
      );
    }
  }, [isConnected, connectedAddress, handleWithdraw, refetchPendingWithdrawal]);

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
        <Toaster position="top-right" />
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
        <Toaster position="top-right" />
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-900 mb-2">
              Error Loading Events
            </h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => {
                setError(null);
                refetch();
              }}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 pt-20 px-4 pb-12">
      <Toaster position="top-right" />
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
              onClick={handleWithdrawFunds}
              disabled={handleWithdraw.isPending}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {handleWithdraw.isPending ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet size={20} />
                  Withdraw {pendingWithdrawal.toFixed(2)} MNT
                </>
              )}
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
                onCancel={handleCancelEvent}
                onClaim={handleClaimFunds}
                onDelete={handleDeleteEvent}
                onWithdraw={handleWithdrawFunds}
                cancelLoading={cancelingId === event.index}
                claimLoading={claimingId === event.index}
                deleteLoading={deletingId === event.index}
                attendeeCount={0}
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
