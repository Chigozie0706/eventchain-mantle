"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import {
  useConnection,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";

import contractABI from "@/contract/eventchainAbi.json";
import EventPage from "@/components/EventPage";

export interface Event {
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

const CONTRACT_ADDRESS = "0x36faD67F403546f6c2947579a27d03bDAfe77d1a";

// Sweet notification configurations
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

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [eventDetails, setEventDetails] = useState<{
    event: Event;
    attendees: string[];
  } | null>(null);

  const { id } = useParams<{ id: string }>();
  const eventId = id ? BigInt(id) : BigInt(0);
  const { address, isConnected } = useConnection();

  const buyTicket = useWriteContract();
  const refundTicket = useWriteContract();

  // Contract data fetching
  const {
    data: rawData,
    isError: isEventError,
    error: eventError,
    refetch: refetchEvent,
  } = useReadContract({
    abi: contractABI.abi,
    address: CONTRACT_ADDRESS,
    functionName: "getEventById",
    args: [eventId],
  });

  // Buy ticket transaction status
  const { isLoading: isBuyConfirming, isSuccess: isBuyConfirmed } =
    useWaitForTransactionReceipt({ hash: buyTicket.data });

  // Refund transaction status
  const { isLoading: isRefundConfirming, isSuccess: isRefundConfirmed } =
    useWaitForTransactionReceipt({ hash: refundTicket.data });

  // Parse event data
  useEffect(() => {
    if (rawData) {
      const [eventData, attendees] = rawData as any;
      setEventDetails({
        event: {
          owner: eventData.owner,
          eventName: eventData.eventName,
          eventCardImgUrl: eventData.eventCardImgUrl,
          eventDetails: eventData.eventDetails,
          startDate: Number(eventData.startDate),
          endDate: Number(eventData.endDate),
          startTime: Number(eventData.startTime),
          endTime: Number(eventData.endTime),
          eventLocation: eventData.eventLocation,
          isActive: eventData.isActive,
          ticketPrice: Number(eventData.ticketPrice),
          fundsHeld: Number(eventData.fundsHeld),
          minimumAge: Number(eventData.minimumAge),
          maxCapacity: Number(eventData.maxCapacity),
          isCanceled: eventData.isCanceled,
          fundsReleased: eventData.fundsReleased,
          exists: eventData.exists,
          refundPolicy: Number(eventData.refundPolicy),
          refundBufferHours: Number(eventData.refundBufferHours),
        },
        attendees: attendees || [],
      });
    }
  }, [rawData]);

  // Buy ticket transaction notifications
  useEffect(() => {
    let toastId: string | undefined;

    if (buyTicket.isPending) {
      toastId = toast.loading(
        "🔐 Please confirm the transaction in your wallet...",
        toastConfig.loading
      );
    } else if (isBuyConfirming) {
      if (toastId) toast.dismiss(toastId);
      toastId = toast.loading(
        "⛓️ Transaction submitted! Waiting for confirmation...",
        toastConfig.loading
      );
    } else if (isBuyConfirmed) {
      if (toastId) toast.dismiss(toastId);

      toast.success("🎉 Ticket purchased successfully!", {
        ...toastConfig.success,
        duration: 5000,
      });

      // Refetch event data to update attendees
      refetchEvent();
      setLoading(false);

      // Show additional success message
      setTimeout(() => {
        toast.success("🎫 Check your wallet for the ticket!", {
          ...toastConfig.info,
          duration: 3000,
        });
      }, 1000);
    } else if (buyTicket.error) {
      if (toastId) toast.dismiss(toastId);
      const errorMessage = parseErrorMessage(buyTicket.error.message);
      toast.error(errorMessage, {
        ...toastConfig.error,
        duration: 6000,
      });
      setLoading(false);
    }

    return () => {
      if (toastId) toast.dismiss(toastId);
    };
  }, [
    buyTicket.isPending,
    isBuyConfirming,
    isBuyConfirmed,
    buyTicket.error,
    refetchEvent,
  ]);

  // Refund transaction notifications
  useEffect(() => {
    let toastId: string | undefined;

    if (refundTicket.isPending) {
      toastId = toast.loading(
        "🔐 Confirming refund request in your wallet...",
        toastConfig.loading
      );
    } else if (isRefundConfirming) {
      if (toastId) toast.dismiss(toastId);
      toastId = toast.loading(
        "⛓️ Processing refund on blockchain...",
        toastConfig.loading
      );
    } else if (isRefundConfirmed) {
      if (toastId) toast.dismiss(toastId);

      toast.success("💰 Refund processed successfully!", {
        ...toastConfig.success,
        duration: 5000,
      });

      // Refetch event data to update attendees
      refetchEvent();
      setLoading(false);

      // Show refund details
      setTimeout(() => {
        toast.success("✅ Funds have been returned to your wallet", {
          ...toastConfig.info,
          duration: 3000,
        });
      }, 1000);
    } else if (refundTicket.error) {
      if (toastId) toast.dismiss(toastId);
      const errorMessage = parseErrorMessage(refundTicket.error.message);
      toast.error(errorMessage, {
        ...toastConfig.error,
        duration: 6000,
      });
      setLoading(false);
    }

    return () => {
      if (toastId) toast.dismiss(toastId);
    };
  }, [
    refundTicket.isPending,
    isRefundConfirming,
    isRefundConfirmed,
    refundTicket.error,
    refetchEvent,
  ]);

  // Helper function to parse error messages
  const parseErrorMessage = (message: string): string => {
    if (
      message.includes("User rejected") ||
      message.includes("user rejected")
    ) {
      return "❌ Transaction was cancelled by user";
    }
    if (message.includes("insufficient funds")) {
      return "💸 Insufficient funds for gas fees";
    }
    if (message.includes("transfer amount exceeds balance")) {
      return "💳 Insufficient token balance";
    }
    if (
      message.includes("Already purchased") ||
      message.includes("already registered")
    ) {
      return "🎫 You already own a ticket for this event";
    }
    if (message.includes("Event expired") || message.includes("ended")) {
      return "⏰ This event has already started or ended";
    }
    if (message.includes("Event inactive") || message.includes("not active")) {
      return "🚫 This event is no longer active";
    }
    if (message.includes("Event at capacity") || message.includes("sold out")) {
      return "😞 Sorry, this event is sold out";
    }
    if (
      message.includes("Refund period ended") ||
      message.includes("too late")
    ) {
      return "⏱️ Refund period has expired for this event";
    }
    if (
      message.includes("No ticket purchased") ||
      message.includes("not registered")
    ) {
      return "🎫 You don't have a ticket to refund";
    }
    if (message.includes("Insufficient allowance")) {
      return "🔐 Token approval failed - please try again";
    }

    // Generic fallback
    return message.length > 100
      ? "⚠️ Transaction failed - please try again"
      : `⚠️ ${message}`;
  };

  // Buy ticket function
  const buyTicketHandler = useCallback(async () => {
    if (!isConnected) {
      toast.error("🔌 Please connect your wallet first", toastConfig.error);
      return;
    }

    if (!eventDetails) {
      toast.error("⚠️ Event details not loaded", toastConfig.error);
      return;
    }

    // Check if user already has a ticket
    if (address && eventDetails.attendees.includes(address)) {
      toast("🎫 You already have a ticket for this event!", {
        icon: "⚠️",
        duration: 4000,
        style: {
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          color: "#fff",
          fontWeight: "600",
          padding: "16px 24px",
          borderRadius: "12px",
          boxShadow: "0 10px 25px rgba(245, 158, 11, 0.3)",
        },
      });
      return;
    }

    // Check if event is sold out
    if (eventDetails.attendees.length >= eventDetails.event.maxCapacity) {
      toast.error("😞 Sorry, this event is sold out!", toastConfig.error);
      return;
    }

    try {
      setLoading(true);

      buyTicket.mutate({
        address: CONTRACT_ADDRESS,
        abi: contractABI.abi,
        functionName: "buyTicket",
        args: [eventId],
        value: BigInt(eventDetails.event.ticketPrice),
      });
    } catch (error: any) {
      toast.error(parseErrorMessage(error.message), toastConfig.error);
      setLoading(false);
    }
  }, [isConnected, eventDetails, eventId, address, buyTicket]);

  // Request refund function
  const requestRefundHandler = useCallback(async () => {
    if (!isConnected) {
      toast.error("🔌 Please connect your wallet first", toastConfig.error);
      return;
    }

    if (!eventDetails) {
      toast.error("⚠️ Event details not loaded", toastConfig.error);
      return;
    }

    // Check if user has a ticket
    if (!address || !eventDetails.attendees.includes(address)) {
      toast("🎫 You don't have a ticket for this event", {
        icon: "⚠️",
        duration: 4000,
        style: {
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          color: "#fff",
          fontWeight: "600",
          padding: "16px 24px",
          borderRadius: "12px",
          boxShadow: "0 10px 25px rgba(245, 158, 11, 0.3)",
        },
      });
      return;
    }

    // Check refund eligibility
    const currentTime = Math.floor(Date.now() / 1000);
    const eventStartTime = eventDetails.event.startDate;
    const refundDeadline =
      eventStartTime - eventDetails.event.refundBufferHours * 3600;

    if (currentTime > refundDeadline) {
      toast.error(
        `⏱️ Refund deadline has passed. Must request ${eventDetails.event.refundBufferHours} hours before event.`,
        toastConfig.error
      );
      return;
    }

    try {
      setLoading(true);
      refundTicket.mutate({
        address: CONTRACT_ADDRESS,
        abi: contractABI.abi,
        functionName: "requestRefund",
        args: [eventId],
      });
    } catch (error: any) {
      toast.error(parseErrorMessage(error.message), toastConfig.error);
      setLoading(false);
    }
  }, [isConnected, eventDetails, eventId, address, refundTicket]);

  // Loading and error states
  if (isEventError) {
    const errorMsg = eventError?.message || "Failed to load event";
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Unable to Load Event
          </h2>
          <p className="text-red-600 mb-6 bg-red-50 p-4 rounded-lg border border-red-200">
            {parseErrorMessage(errorMsg)}
          </p>
          <button
            onClick={() => {
              refetchEvent();
              toast.success("🔄 Refreshing event data...", toastConfig.info);
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!eventDetails) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Loading Event Details...
          </h2>
          <p className="text-gray-600">Please wait a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16">
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          // Default options
          duration: 4000,
          style: {
            fontSize: "14px",
          },
        }}
      />
      <EventPage
        event={eventDetails.event}
        attendees={eventDetails.attendees}
        buyTicket={buyTicketHandler}
        id={id}
        loading={loading}
        registering={buyTicket.isPending || isBuyConfirming}
        requestRefund={requestRefundHandler}
        refunding={refundTicket.isPending || isRefundConfirming}
      />
    </div>
  );
}
