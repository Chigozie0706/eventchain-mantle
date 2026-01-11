"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useConnection, useReadContract, useWriteContract } from "wagmi";
import {
  MapPin,
  Calendar,
  Clock,
  Ticket,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Wallet,
  DollarSign,
  Users,
  RefreshCw,
  ArrowRight,
  Shield,
  Gift,
} from "lucide-react";

import { toast } from "react-hot-toast";
import contractABI from "contract/eventchainAbi.json";

const CONTRACT_ADDRESS = "0x36faD67F403546f6c2947579a27d03bDAfe77d1a";

interface Event {
  id: string;
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
  refundPolicy: number;
  refundBufferHours: number;
}

const REFUND_POLICY_NAMES = {
  0: "No Refunds",
  1: "Before Event Start",
  2: "Custom Buffer Period",
};

export default function EventTickets() {
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<number>(0);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error" | "loading" | "info";
    message: string;
  } | null>(null);
  const { writeContractAsync } = useWriteContract();
  const { address, isConnected } = useConnection();
  const [refundLoading, setRefundLoading] = useState<Record<string, boolean>>(
    {}
  );

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
    functionName: "getUserEvents",
    args: [address],
  });

  const refundTicketWrite = useWriteContract();
  const withdrawFundsWrite = useWriteContract();

  // Read pending withdrawal
  const { data: pendingWithdrawalData, refetch: refetchPendingWithdrawal } =
    useReadContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI.abi,
      functionName: "getPendingWithdrawal",
      args: [address],
    });

  // Update pending withdrawal when data changes
  useEffect(() => {
    if (pendingWithdrawalData) {
      const withdrawal = Number(pendingWithdrawalData) / 1e18; // Convert from wei to ETH
      setPendingWithdrawal(withdrawal);
    }
  }, [pendingWithdrawalData]);

  useEffect(() => {
    if (isError) {
      console.error("🚨 Contract read error:", {
        error: contractError,
        contractAddress: CONTRACT_ADDRESS,
        functionName: "getUserEvents",
        timestamp: new Date().toISOString(),
      });
    }
  }, [isError, contractError]);

  // Add this to see what's actually being returned
  useEffect(() => {
    console.log("Contract read result:", {
      data,
      isSuccess,
      isError,
      error: contractError,
      address,
      contractAddress: CONTRACT_ADDRESS,
    });
  }, [data, isSuccess, isError, contractError, address]);

  useEffect(() => {
    if (isSuccess && data) {
      try {
        if (!Array.isArray(data) || data.length !== 2) {
          throw new Error("Unexpected data format from contract");
        }

        const [eventIds, userEvents] = data as [string[], any[]];

        console.log("Raw user events data received:", {
          data,
          timestamp: new Date().toISOString(),
        });
        const formattedEvents = userEvents.map((event, index) => ({
          id: eventIds[index],
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
          ticketPrice: Number(event.ticketPrice) / 1e18, // Convert from wei
          fundsHeld: Number(event.fundsHeld) / 1e18,
          minimumAge: Number(event.minimumAge),
          maxCapacity: Number(event.maxCapacity),
          isCanceled: event.isCanceled,
          fundsReleased: event.fundsReleased,
          exists: event.exists,
          refundPolicy: Number(event.refundPolicy),
          refundBufferHours: Number(event.refundBufferHours),
        }));

        setEvents(formattedEvents);
        console.log(formattedEvents);
      } catch (error) {
        console.error("🚨 Error processing user events data:", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          data,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, [isSuccess, data]);

  const requestRefund = async (id: string) => {
    if (!isConnected || !address) {
      toast.error("Connect wallet first");
      return;
    }

    setRefundLoading((prev) => ({ ...prev, [id]: true }));
    const toastId = toast.loading("Processing refund...");

    try {
      const tx = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: contractABI.abi,
        functionName: "requestRefund",
        args: [BigInt(id)],
      });

      toast.dismiss(toastId);
      toast.success("Refund requested successfully!");

      // Refetch data after successful refund
      await refetch();
      await refetchPendingWithdrawal();
    } catch (error: any) {
      console.error("Refund error:", error);
      toast.dismiss(toastId);
      toast.error(
        error?.shortMessage || error?.message || "Refund request failed"
      );
    } finally {
      setRefundLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const withdrawFunds = async () => {
    if (!address) {
      toast.error("Connect wallet first");
      return;
    }

    setWithdrawLoading(true);
    const toastId = toast.loading("Withdrawing funds...");

    try {
      const tx = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: contractABI.abi,
        functionName: "withdraw",
      });

      toast.dismiss(toastId);
      toast.success("Withdrawal successful!");

      await refetchPendingWithdrawal();
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast.dismiss(toastId);
      toast.error(error?.shortMessage || error?.message || "Withdrawal failed");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const getEventStatus = (event: Event) => {
    if (event.isCanceled)
      return {
        text: "Cancelled",
        color: "text-red-600",
        bg: "bg-red-50",
        borderColor: "border-red-200",
        icon: XCircle,
      };
    if (!event.isActive)
      return {
        text: "Inactive",
        color: "text-gray-600",
        bg: "bg-gray-50",
        borderColor: "border-gray-200",
        icon: AlertCircle,
      };

    const now = Date.now() / 1000;
    if (now < event.startTime)
      return {
        text: "Upcoming",
        color: "text-blue-600",
        bg: "bg-blue-50",
        borderColor: "border-blue-200",
        icon: Clock,
      };
    if (now >= event.startTime && now <= event.endTime)
      return {
        text: "Live Now",
        color: "text-green-600",
        bg: "bg-green-50",
        borderColor: "border-green-200",
        icon: CheckCircle,
      };
    return {
      text: "Ended",
      color: "text-gray-600",
      bg: "bg-gray-50",
      borderColor: "border-gray-200",
      icon: CheckCircle,
    };
  };

  const getRefundEligibility = (event: Event) => {
    if (event.isCanceled)
      return {
        eligible: true,
        reason: "Event cancelled - Full refund available",
      };

    const now = Date.now() / 1000;

    if (event.refundPolicy === 0) {
      return { eligible: false, reason: "No refunds for this event" };
    } else if (event.refundPolicy === 1) {
      if (now < event.startDate) {
        return {
          eligible: true,
          reason: "Refund available before event starts",
        };
      }
      return { eligible: false, reason: "Event has started" };
    } else if (event.refundPolicy === 2) {
      const refundDeadline = event.startDate - event.refundBufferHours * 3600;
      if (now < refundDeadline) {
        const hoursLeft = Math.floor((refundDeadline - now) / 3600);
        return {
          eligible: true,
          reason: `${hoursLeft}h until refund deadline`,
        };
      }
      return {
        eligible: false,
        reason: `${event.refundBufferHours}h buffer period expired`,
      };
    }

    return { eligible: false, reason: "Unknown refund policy" };
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-100">
            <Wallet className="w-20 h-20 mx-auto mb-6 text-indigo-600" />
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Access your event tickets and manage refunds
            </p>
            <button
              //   onClick={() => setIsConnected(true)}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-100">
            <Loader2 className="w-16 h-16 mx-auto mb-6 text-indigo-600 animate-spin" />
            <p className="text-gray-600 text-lg">Loading your tickets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in max-w-md">
          <div
            className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-2 ${
              toastMessage.type === "success"
                ? "bg-green-500 border-green-600"
                : toastMessage.type === "error"
                ? "bg-red-500 border-red-600"
                : toastMessage.type === "info"
                ? "bg-blue-500 border-blue-600"
                : "bg-indigo-500 border-indigo-600"
            } text-white`}
          >
            {toastMessage.type === "loading" && (
              <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
            )}
            {toastMessage.type === "success" && (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            )}
            {toastMessage.type === "error" && (
              <XCircle className="w-5 h-5 flex-shrink-0" />
            )}
            {toastMessage.type === "info" && (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium">{toastMessage.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">
              My Tickets
            </h1>
            <p className="text-gray-600 text-lg">
              Manage tickets and process refunds with pull payment
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-md border border-gray-200">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-700">
              Wallet Connected
            </span>
          </div>
        </div>

        {/* Pending Withdrawal Card */}
        {pendingWithdrawal > 0 && (
          <div className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-xl p-6 border-2 border-emerald-400">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <div className="text-white">
                  <p className="text-sm font-medium opacity-90 mb-1">
                    Pending Withdrawal
                  </p>
                  <p className="text-3xl font-bold">
                    {pendingWithdrawal.toFixed(4)} ETH
                  </p>
                  <p className="text-sm opacity-75 mt-1">
                    Pull payment pattern - withdraw when ready
                  </p>
                </div>
              </div>
              <button
                onClick={withdrawFunds}
                disabled={withdrawLoading}
                className="w-full sm:w-auto px-6 py-3 bg-white text-emerald-600 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {withdrawLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Withdraw Funds
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-100">
            <Ticket className="w-20 h-20 mx-auto mb-6 text-gray-400" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              No Tickets Yet
            </h2>
            <p className="text-gray-600 text-lg">
              Start exploring events and purchase your first ticket!
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {events.map((event) => {
              const status = getEventStatus(event);
              const StatusIcon = status.icon;
              const refundInfo = getRefundEligibility(event);

              return (
                <div
                  key={event.id}
                  className={`bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 ${status.borderColor}`}
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* Event Image */}
                    <div className="lg:w-80 h-56 lg:h-auto bg-gradient-to-br from-indigo-100 to-purple-100 flex-shrink-0 relative overflow-hidden">
                      <img
                        src={event.eventCardImgUrl}
                        alt={event.eventName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div
                        className={`absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md ${status.bg} border-2 ${status.borderColor}`}
                      >
                        <StatusIcon className={`w-5 h-5 ${status.color}`} />
                        <span className={`text-sm font-bold ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 p-6">
                      <div className="mb-4">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                          {event.eventName}
                        </h2>
                        <p className="text-gray-600 leading-relaxed">
                          {event.eventDetails}
                        </p>
                      </div>

                      {/* Event Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                              Location
                            </p>
                            <p className="text-gray-900 font-medium">
                              {event.eventLocation}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                              Dates
                            </p>
                            <p className="text-gray-900 font-medium">
                              {formatDate(event.startDate)} -{" "}
                              {formatDate(event.endDate)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                              Time
                            </p>
                            <p className="text-gray-900 font-medium">
                              {formatTime(event.startTime)} -{" "}
                              {formatTime(event.endTime)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Ticket className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                              Ticket Price
                            </p>
                            <p className="text-gray-900 font-bold text-xl">
                              {event.ticketPrice.toFixed(4)} ETH
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Users className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                              Capacity
                            </p>
                            <p className="text-gray-900 font-medium">
                              {event.maxCapacity} attendees
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-indigo-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
                              Refund Policy
                            </p>
                            <p className="text-gray-900 font-medium">
                              {
                                REFUND_POLICY_NAMES[
                                  event.refundPolicy as keyof typeof REFUND_POLICY_NAMES
                                ]
                              }
                            </p>
                            {event.refundPolicy === 2 && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {event.refundBufferHours}h buffer period
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Refund Status Banner */}
                      <div
                        className={`mb-4 p-4 rounded-xl border-2 ${
                          refundInfo.eligible
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {refundInfo.eligible ? (
                            <Gift className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0" />
                          )}
                          <p
                            className={`text-sm font-semibold ${
                              refundInfo.eligible
                                ? "text-green-700"
                                : "text-gray-700"
                            }`}
                          >
                            {refundInfo.reason}
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-4 border-t-2 border-gray-100">
                        <button
                          onClick={() => requestRefund(event.id)}
                          disabled={
                            refundLoading[event.id] || !refundInfo.eligible
                          }
                          className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                        >
                          {refundLoading[event.id] ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Processing Refund...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-5 h-5" />
                              Request Refund
                            </>
                          )}
                        </button>

                        {!refundInfo.eligible && !event.isCanceled && (
                          <p className="text-sm text-gray-500 italic mt-3">
                            Refunds are no longer available for this event
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
