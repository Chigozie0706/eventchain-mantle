"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { formatUnits, parseUnits } from "ethers";
import {
  useConnection,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWalletClient,
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

// Enhanced toast configurations
const toastConfig = {
  success: {
    duration: 4000,
    icon: "✅",
    style: {
      background: "#10b981",
      color: "#fff",
      fontWeight: "500",
    },
  },
  error: {
    duration: 5000,
    icon: "❌",
    style: {
      background: "#ef4444",
      color: "#fff",
      fontWeight: "500",
    },
  },
  loading: {
    icon: "⏳",
    style: {
      background: "#3b82f6",
      color: "#fff",
      fontWeight: "500",
    },
  },
  warning: {
    duration: 4000,
    icon: "⚠️",
    style: {
      background: "#f59e0b",
      color: "#fff",
      fontWeight: "500",
    },
  },
  info: {
    duration: 3000,
    icon: "ℹ️",
    style: {
      background: "#6366f1",
      color: "#fff",
      fontWeight: "500",
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
  const { data: walletClient } = useWalletClient();

  const buyTicketWrite = useWriteContract();
  const refundTicketWrite = useWriteContract();
  // Contract data fetching with refetch capability
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

  // Transaction handling
  const {
    data: hash,
    isPending: isWriting,
    error: writeError,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  // Refund transaction handling
  const {
    data: refundHash,
    isPending: isRefundWriting,
    error: refundWriteError,
  } = useWriteContract();
  const { isLoading: isRefundConfirming, isSuccess: isRefundConfirmed } =
    useWaitForTransactionReceipt({ hash: refundHash });

  useEffect(() => {
    if (rawData) {
      const [eventData, attendees] = rawData as any;
      setEventDetails({
        event: {
          owner: eventData.owner,
          eventName: eventData.eventName,
          eventCardImgUrl: eventData.eventCardImgUrl,
          eventDetails: eventData.eventDetails,
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          eventLocation: eventData.eventLocation,
          isActive: eventData.isActive,
          ticketPrice: eventData.ticketPrice,
          fundsHeld: eventData.fundsHeld,
          minimumAge: eventData.minimumAge,
          maxCapacity: eventData.maxCapacity,
          isCanceled: eventData.isCanceled,
          fundsReleased: eventData.fundsReleased,
          exists: eventData.exists,
          refundPolicy: eventData.refundPolicy,
          refundBufferHours: eventData.refundBufferHours,
        },
        attendees: attendees || [],
      });
    }
  }, [rawData]);

  // Enhanced transaction status handling
  useEffect(() => {
    let toastId: string | undefined;

    if (isWriting) {
      toastId = toast.loading(
        "🔐 Please confirm the transaction in your wallet...",
        toastConfig.loading
      );
    } else if (isConfirming) {
      toastId = toast.loading(
        "⏳ Waiting for blockchain confirmation...",
        toastConfig.loading
      );
    } else if (isConfirmed) {
      toast.success("🎉 Ticket purchased successfully!", {
        ...toastConfig.success,
        duration: 5000,
      });

      // Show additional success info
      setTimeout(() => {
        toast.success("Check your wallet for the ticket!", {
          ...toastConfig.info,
          duration: 3000,
        });
      }, 1000);
    } else if (writeError) {
      const errorMessage = parseErrorMessage(writeError.message);
      toast.error(errorMessage, {
        ...toastConfig.error,
        duration: 6000,
      });
    }

    return () => {
      if (toastId) toast.dismiss(toastId);
    };
  }, [isWriting, isConfirming, isConfirmed, writeError]);

  // Enhanced refund status handling
  useEffect(() => {
    let toastId: string | undefined;

    if (isRefundWriting) {
      toastId = toast.loading(
        "🔐 Confirming refund request...",
        toastConfig.loading
      );
    } else if (isRefundConfirming) {
      toastId = toast.loading(
        "⏳ Processing refund on blockchain...",
        toastConfig.loading
      );
    } else if (isRefundConfirmed) {
      toast.success("💰 Refund processed successfully!", {
        ...toastConfig.success,
        duration: 5000,
      });

      // Show refund details
      setTimeout(() => {
        toast.success("Funds have been returned to your wallet", {
          ...toastConfig.info,
          duration: 3000,
        });
      }, 1000);
    } else if (refundWriteError) {
      const errorMessage = parseErrorMessage(refundWriteError.message);
      toast.error(errorMessage, {
        ...toastConfig.error,
        duration: 6000,
      });
    }

    return () => {
      if (toastId) toast.dismiss(toastId);
    };
  }, [
    isRefundWriting,
    isRefundConfirming,
    isRefundConfirmed,
    refundWriteError,
  ]);

  // Helper function to parse error messages
  const parseErrorMessage = (message: string): string => {
    if (
      message.includes("User rejected") ||
      message.includes("user rejected")
    ) {
      return "Transaction was cancelled";
    }
    if (message.includes("insufficient funds")) {
      return "Insufficient funds for gas fees";
    }
    if (message.includes("transfer amount exceeds balance")) {
      return "Insufficient token balance";
    }
    if (message.includes("Already purchased")) {
      return "You already own a ticket for this event";
    }
    if (message.includes("Event expired")) {
      return "This event has already started or ended";
    }
    if (message.includes("Event inactive")) {
      return "This event is no longer active";
    }
    if (message.includes("Event at capacity")) {
      return "Sorry, this event is sold out";
    }
    if (message.includes("Refund period ended")) {
      return "Refund period has expired for this event";
    }
    if (message.includes("No ticket purchased")) {
      return "You don't have a ticket to refund";
    }
    if (message.includes("Insufficient allowance")) {
      return "Token approval failed - please try again";
    }

    // Generic fallback
    return message.length > 100
      ? "Transaction failed - please try again"
      : message;
  };

  const buyTicket = useCallback(async () => {
    if (!isConnected || !eventDetails) {
      toast.error("Connect wallet first", toastConfig.error);
      return;
    }

    try {
      setLoading(true);

      buyTicketWrite.mutate({
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
  }, [isConnected, eventDetails, eventId]);

  const requestRefund = useCallback(async () => {
    if (!isConnected || !eventDetails) {
      toast.error("Connect wallet first", toastConfig.error);
      return;
    }

    try {
      setLoading(true);
      refundTicketWrite.mutate({
        address: CONTRACT_ADDRESS,
        abi: contractABI.abi,
        functionName: "requestRefund",
        args: [eventId],
      });
    } catch (error: any) {
      toast.error(parseErrorMessage(error.message), toastConfig.error);
      setLoading(false);
    }
  }, [isConnected, eventDetails, eventId]);

  // Loading and error states with better UX
  if (isEventError) {
    const errorMsg = eventError?.message || "Failed to load event";
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Unable to Load Event
          </h2>
          <p className="text-red-500 mb-4">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!eventDetails) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          {/* <div className="animate-spin text-6xl mb-4">⏳</div> */}
          <h2 className="text-2xl font-bold text-gray-800">
            Loading Event Details...
          </h2>
          <p className="text-gray-600 mt-2">Please wait a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16">
      <EventPage
        event={eventDetails.event}
        attendees={eventDetails.attendees}
        buyTicket={buyTicket}
        id={id}
        loading={loading}
        registering={isWriting || isConfirming}
        requestRefund={requestRefund}
        refunding={isRefundWriting || isRefundConfirming}
      />
    </div>
  );
}
