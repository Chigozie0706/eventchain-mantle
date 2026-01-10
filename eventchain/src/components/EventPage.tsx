"use client";
import AttendeeList from "./AttendeeList";
import {
  MapPin,
  CalendarDays,
  Ticket,
  Handshake,
  UsersRound,
  Check,
  Info,
  Shield,
  Sparkles,
  ChevronDown,
  Clock,
} from "lucide-react";
import { formatEventDate, formatEventTime, formatPrice } from "../utils/format";
import { useConnection } from "wagmi";
import { useEffect, useState } from "react";
import { formatUnits } from "ethers";
import { useParams, useRouter } from "next/navigation";
import { ethers, formatEther } from "ethers";

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

export interface EventPageProps {
  event: Event;
  attendees: string[];
  buyTicket: () => Promise<void>;
  requestRefund: () => Promise<void>;
  loading: boolean;
  registering: boolean;
  refunding: boolean;
  id: string;
}

export default function EventPage({
  event,
  attendees,
  buyTicket,
  requestRefund,
  loading,
  registering,
  refunding,
  id,
}: EventPageProps) {
  const { address } = useConnection();
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const { id: eventId } = useParams<{ id: string }>();
  const [showToast, setShowToast] = useState(false);
  const [showRefundDetails, setShowRefundDetails] = useState(false);
  const { isConnected } = useConnection();

  const formatEventDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatEventTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formattedStartDate = formatEventDate(Number(event.startDate));
  const formattedEndDate = formatEventDate(Number(event.endDate));
  const formattedStartTime = formatEventTime(Number(event.startTime));
  const formattedEndTime = formatEventTime(Number(event.endTime));

  const getImageUrl = () => {
    if (!event.eventCardImgUrl) return "/default-event.jpg";
    return event.eventCardImgUrl.startsWith("http")
      ? event.eventCardImgUrl
      : `https://ipfs.io/ipfs/${event.eventCardImgUrl}`;
  };

  const displayToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Check if current user is registered
  const isRegistered = address && attendees.includes(address);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 mt-3">
      {/* Hero Banner with Parallax Effect */}
      <div className="relative w-full h-[60vh] overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-transparent z-10" />

        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={imgError ? "/api/placeholder/1200/600" : event.eventCardImgUrl}
            alt="Event Banner"
            className="w-full h-full object-cover transform scale-105 hover:scale-100 transition-transform duration-[3000ms]"
            onError={() => setImgError(true)}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 container mx-auto px-6 h-full flex flex-col justify-end pb-12">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-4 py-1.5 bg-emerald-500/90 backdrop-blur-sm text-white text-sm font-semibold rounded-full flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Featured Event
              </span>
              <span className="px-4 py-1.5 bg-white/90 backdrop-blur-sm text-gray-800 text-sm font-semibold rounded-full">
                {attendees.length}/{event.maxCapacity} Spots
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
              {event.eventName}
            </h1>
            <div className="flex flex-wrap gap-4 text-white/90">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-lg">
                <CalendarDays className="w-5 h-5" />
                <span className="font-medium">{formattedStartDate}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-lg">
                <MapPin className="w-5 h-5" />
                <span className="font-medium">San Francisco, CA</span>
              </div>
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-lg">
                <Ticket className="w-5 h-5" />
                <span className="font-medium">{event.ticketPrice} ETH</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-1 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                About This Event
              </h2>
              <p className="text-gray-700 leading-relaxed text-lg">
                {event.eventDetails}
              </p>
            </div>

            {/* Date & Time Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-xl p-8 border border-emerald-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-lg">
                  <CalendarDays className="w-6 h-6 text-white" />
                </div>
                Date & Time
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">
                    Start
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {formattedStartDate}
                  </p>
                  <p className="text-emerald-600 font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {formattedStartTime}
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">
                    End
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {formattedEndDate}
                  </p>
                  <p className="text-emerald-600 font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {formattedEndTime}
                  </p>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="p-2 bg-rose-500 rounded-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                Location
              </h3>
              <p className="text-gray-700 text-lg mb-4">
                {event.eventLocation}
              </p>
              <div className="rounded-xl overflow-hidden h-64 border-2 border-gray-200">
                <iframe
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    event.eventLocation
                  )}&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Attendees Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg">
                  <UsersRound className="w-6 h-6 text-white" />
                </div>
                Attendees
              </h3>
              <AttendeeList
                attendees={attendees}
                // maxCapacity={event.maxCapacity}
                maxCapacity={Number(event.maxCapacity)} // Explicitly convert to Number
              />
            </div>

            {/* Refund Policy Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl p-8 border border-blue-100">
              <button
                // onClick={() => setShowRefundDetails(!showRefundDetails)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Handshake className="w-6 h-6 text-white" />
                  </div>
                  Refund Policy
                </h3>
                <ChevronDown
                  className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${
                    showRefundDetails ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  showRefundDetails ? "max-h-96 mt-6" : "max-h-0"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg">
                    <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">
                        Full Refund Available
                      </p>
                      <p className="text-sm text-gray-700">
                        Request a refund up to {event.refundBufferHours} hours
                        before the event starts.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">
                        Automatic Processing
                      </p>
                      <p className="text-sm text-gray-700">
                        Refunds are processed automatically and returned to your
                        wallet in the same token.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Ticket Purchase */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* Ticket Card */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-8 text-white">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">Get Your Ticket</h3>
                    <Sparkles className="w-8 h-8" />
                  </div>

                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 mb-6">
                    <p className="text-white/80 text-sm mb-2">
                      Price per ticket
                    </p>
                    <p className="text-4xl font-bold">
                      {event.ticketPrice} ETH
                    </p>
                    <p className="text-white/80 text-sm mt-2">≈ $150 USD</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/80">Available Spots</span>
                      {/* <span className="font-bold">
                        {event.maxCapacity - attendees.length} /{" "}
                        {event.maxCapacity}
                      </span> */}

                      <span className="font-bold">
                        {Number(event.maxCapacity) - attendees.length} /{" "}
                        {Number(event.maxCapacity)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/80">Event Status</span>
                      <span className="font-bold flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Active
                      </span>
                    </div>
                  </div>

                  {!isConnected ? (
                    <button className="w-full bg-white text-emerald-600 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                      Connect Wallet
                    </button>
                  ) : isRegistered ? (
                    <div className="space-y-3">
                      <div className="bg-white text-emerald-600 py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 shadow-lg">
                        <Check className="w-6 h-6" />
                        You're Registered!
                      </div>
                      <button
                        onClick={requestRefund}
                        disabled={loading}
                        className="w-full bg-red-500 text-white py-3 rounded-xl text-base font-semibold hover:bg-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? "Processing..." : "Request Refund"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={buyTicket}
                      disabled={loading}
                      className="w-full bg-white text-emerald-600 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        "Complete Registration"
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">
                      All Ages Welcome
                    </h4>
                    <p className="text-sm text-blue-700">
                      This event has no minimum age requirement. Everyone is
                      welcome to attend!
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Badge */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-purple-900 mb-2">
                      Secure Blockchain Ticketing
                    </h4>
                    <p className="text-sm text-purple-700">
                      Your ticket is secured on the blockchain with transparent
                      refund policies.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
