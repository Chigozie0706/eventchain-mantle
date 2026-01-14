"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import { parseUnits } from "ethers";
import axios from "axios";
import MultiStep from "./MultiStep";
import {
  useConnection,
  useWriteContract,
  useWaitForTransactionReceipt,
  type BaseError,
} from "wagmi";
import contractABI from "../contract/eventchainAbi.json";
import { EventData } from "./eventCreation/types";

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

const EventForm = () => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useConnection();

  const createEventWrite = useWriteContract();

  const [eventData, setEventData] = useState<EventData>({
    eventName: "",
    eventDetails: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    eventLocation: "",
    ticketPrice: "",
    minimumAge: "0",
    maxCapacity: "",
    refundPolicy: "1",
    refundBufferHours: "",
    image: "",
  });

  // Transaction status monitoring
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: createEventWrite.data,
    });

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      toast.success(`🎉 Event "${eventData.eventName}" created successfully!`, {
        ...toastConfig.success,
        duration: 5000,
      });

      // Reset form
      setEventData({
        eventName: "",
        eventDetails: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        eventLocation: "",
        ticketPrice: "",
        minimumAge: "0",
        maxCapacity: "",
        refundPolicy: "1",
        refundBufferHours: "",
        image: "",
      });
      setFile(null);
      setPreview(null);

      // Redirect after delay
      setTimeout(() => {
        toast.success("✅ Redirecting to events page...", toastConfig.info);
        router.push("/view_events");
      }, 1500);
    }
  }, [isConfirmed, eventData.eventName, router]);

  const validateForm = () => {
    try {
      // Step 1: Event Details validation
      if (!eventData.eventName.trim()) {
        throw new Error("Please enter an event name");
      }

      if (!eventData.eventDetails.trim()) {
        throw new Error("Please provide event details");
      }

      if (!file) {
        throw new Error("Please upload an event image");
      }

      const minAge = parseInt(eventData.minimumAge);
      if (isNaN(minAge) || minAge < 0 || minAge > 120) {
        throw new Error("Please enter a valid minimum age (0-120)");
      }

      // Step 2: Location validation
      if (!eventData.eventLocation.trim()) {
        throw new Error("Please enter event location");
      }

      // Step 3: Date & Time validation
      if (!eventData.startDate || !eventData.startTime) {
        throw new Error("Please select start date and time");
      }

      if (!eventData.endDate || !eventData.endTime) {
        throw new Error("Please select end date and time");
      }

      const startDateTime = new Date(
        `${eventData.startDate}T${eventData.startTime}`
      );
      const endDateTime = new Date(`${eventData.endDate}T${eventData.endTime}`);

      if (startDateTime.getTime() < Date.now()) {
        throw new Error("The event must start in the future");
      }

      if (endDateTime.getTime() <= startDateTime.getTime()) {
        throw new Error("End date/time must be after start date/time");
      }

      // Validate minimum duration (1 hour)
      const durationMs = endDateTime.getTime() - startDateTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      if (durationHours < 1) {
        throw new Error("Event must be at least 1 hour long");
      }

      // Validate maximum duration (365 days)
      const durationDays = durationHours / 24;
      if (durationDays > 365) {
        throw new Error("Event duration cannot exceed 365 days");
      }

      // Step 4: Tickets & Capacity validation
      if (!eventData.ticketPrice) {
        throw new Error("Please enter ticket price");
      }

      const price = parseFloat(eventData.ticketPrice);
      if (isNaN(price)) {
        throw new Error("Please enter a valid number for price");
      }
      if (price < 0) {
        throw new Error("Price cannot be negative");
      }
      if (price > 1000000) {
        throw new Error("Price seems unusually high");
      }

      if (!eventData.maxCapacity) {
        throw new Error("Please enter max capacity");
      }

      const capacity = parseInt(eventData.maxCapacity);
      if (isNaN(capacity) || capacity <= 0) {
        throw new Error("Please enter a valid capacity greater than 0");
      }
      if (capacity > 100000) {
        throw new Error("Capacity cannot exceed 100,000");
      }

      // Validate refund buffer if custom policy
      if (eventData.refundPolicy === "2") {
        if (!eventData.refundBufferHours) {
          throw new Error("Please enter refund buffer hours");
        }

        const bufferHours = parseInt(eventData.refundBufferHours);
        if (isNaN(bufferHours) || bufferHours <= 0) {
          throw new Error("Refund buffer must be greater than 0");
        }
        if (bufferHours > 720) {
          throw new Error("Refund buffer cannot exceed 720 hours (30 days)");
        }

        // Check if buffer exceeds time until event
        const hoursUntilEvent = durationMs / (1000 * 60 * 60);
        if (bufferHours >= hoursUntilEvent) {
          throw new Error("Refund buffer exceeds time until event starts");
        }
      }

      return true;
    } catch (error: any) {
      toast.error(error.message, toastConfig.error);
      return false;
    }
  };

  const handleFileChange = useCallback(
    (fileOrEvent: File | React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      let selectedFile: File | null = null;

      if (fileOrEvent instanceof File) {
        selectedFile = fileOrEvent;
      } else if (fileOrEvent.target.files?.[0]) {
        selectedFile = fileOrEvent.target.files[0];
      }

      if (!selectedFile) return;

      // Validate file type
      if (!selectedFile.type.startsWith("image/")) {
        const errorMsg = "Only image files are allowed (JPG, PNG, GIF, etc.)";
        setError(errorMsg);
        toast.error(errorMsg, toastConfig.error);
        return;
      }

      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        const errorMsg = "File size must be less than 10MB";
        setError(errorMsg);
        toast.error(errorMsg, toastConfig.error);
        return;
      }

      setFile(selectedFile);
      toast.success(`🖼️ Image "${selectedFile.name}" selected successfully`, {
        ...toastConfig.success,
        duration: 2000,
      });

      // Create preview
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    },
    []
  );

  const uploadToIPFS = async (file: File): Promise<string> => {
    const uploadToastId = toast.loading(
      "Uploading image to IPFS...",
      toastConfig.loading
    );

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "pinataMetadata",
        JSON.stringify({ name: `event-image-${Date.now()}` })
      );

      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to upload image to IPFS");
      }

      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;

      toast.success("Image uploaded to IPFS successfully", {
        ...toastConfig.success,
        id: uploadToastId,
      });

      return ipfsUrl;
    } catch (error: any) {
      console.error("IPFS upload error:", error);

      toast.error("Failed to upload image. Please try again.", {
        ...toastConfig.error,
        id: uploadToastId,
      });

      throw error;
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileChange(e.dataTransfer.files[0]);
      }
    },
    [handleFileChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const createEvent = async () => {
    // Validate form first
    if (!validateForm()) return;

    // Check wallet connection
    if (!isConnected || !address) {
      toast.error(
        "🔌 Please connect your wallet to continue",
        toastConfig.error
      );
      return;
    }

    const mainToastId = toast.loading(
      "⏳ Preparing your event...",
      toastConfig.loading
    );

    try {
      // Step 1: Upload image to IPFS
      toast.loading("📤 Uploading image to IPFS...", {
        ...toastConfig.loading,
        id: mainToastId,
      });

      const ipfsHash = await uploadToIPFS(file!);

      toast.success("✅ Image uploaded to IPFS!", {
        ...toastConfig.success,
        id: mainToastId,
        duration: 2000,
      });

      // Step 2: Prepare transaction data
      setTimeout(() => {
        toast.loading("📝 Preparing transaction data...", {
          ...toastConfig.loading,
          id: mainToastId,
        });
      }, 500);

      const startDateTime = new Date(
        `${eventData.startDate}T${eventData.startTime}`
      );
      const endDateTime = new Date(`${eventData.endDate}T${eventData.endTime}`);

      const minimumAge = BigInt(eventData.minimumAge);
      const startDate = BigInt(Math.floor(startDateTime.getTime() / 1000));
      const endDate = BigInt(Math.floor(endDateTime.getTime() / 1000));
      const startTime = BigInt(
        startDateTime.getHours() * 3600 + startDateTime.getMinutes() * 60
      );
      const endTime = BigInt(
        endDateTime.getHours() * 3600 + endDateTime.getMinutes() * 60
      );

      const priceInWei = parseUnits(eventData.ticketPrice, 18);
      const maxCapacity = BigInt(eventData.maxCapacity);
      const refundPolicy = BigInt(eventData.refundPolicy || "1");

      let refundBufferHours = BigInt(0);
      if (eventData.refundPolicy === "2" && eventData.refundBufferHours) {
        refundBufferHours = BigInt(eventData.refundBufferHours);
      }

      // Step 3: Send transaction
      setTimeout(() => {
        toast.loading("🔐 Please confirm transaction in your wallet...", {
          ...toastConfig.loading,
          id: mainToastId,
        });
      }, 1000);

      createEventWrite.mutate(
        {
          address: CONTRACT_ADDRESS,
          abi: contractABI.abi,
          functionName: "createEvent",
          args: [
            eventData.eventName,
            ipfsHash,
            eventData.eventDetails,
            startDate,
            endDate,
            startTime,
            endTime,
            eventData.eventLocation,
            priceInWei,
            minimumAge,
            maxCapacity,
            refundPolicy,
            refundBufferHours,
          ],
        },
        {
          onSuccess: () => {
            toast.loading(
              "⛓️ Transaction submitted! Waiting for confirmation...",
              {
                ...toastConfig.loading,
                id: mainToastId,
              }
            );
          },
          onError: (error: any) => {
            console.error("Event creation failed:", error);

            let errorMessage = "Failed to create event";

            if (
              error.message?.includes("User rejected") ||
              error.message?.includes("user rejected")
            ) {
              errorMessage = "❌ Transaction was rejected";
              toast.error(errorMessage, {
                ...toastConfig.error,
                id: mainToastId,
              });
            } else if (error.message?.includes("insufficient funds")) {
              errorMessage = "💸 Insufficient funds for gas fees";
              toast.error(errorMessage, {
                ...toastConfig.error,
                id: mainToastId,
              });
            } else {
              errorMessage =
                error.shortMessage || error.message || "Unknown error occurred";
              toast.error(`❌ ${errorMessage}`, {
                ...toastConfig.error,
                id: mainToastId,
              });
            }
          },
        }
      );
    } catch (error: any) {
      console.error("Event creation failed:", error);

      let errorMessage = "Failed to create event";

      if (error.message?.includes("IPFS")) {
        errorMessage = "Failed to upload image. Please try again.";
      } else {
        errorMessage = error.message || "Unknown error occurred";
      }

      toast.error(`❌ ${errorMessage}`, {
        ...toastConfig.error,
        id: mainToastId,
      });
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="max-w-2xl mx-auto p-6 rounded-lg my-20">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
          Create Your Event
        </h2>

        <MultiStep
          eventData={eventData}
          setEventData={setEventData}
          file={file}
          setFile={setFile}
          preview={preview}
          setPreview={setPreview}
          error={error}
          setError={setError}
          handleFileChange={handleFileChange}
          handleDrop={handleDrop}
          handleDragOver={handleDragOver}
          createEvent={createEvent}
          loading={createEventWrite.isPending || isConfirming}
        />
      </div>
    </>
  );
};

export default EventForm;
