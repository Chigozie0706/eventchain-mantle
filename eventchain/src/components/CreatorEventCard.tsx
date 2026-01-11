import {
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  MapPin,
  RefreshCw,
  Shield,
  Ticket,
  Trash2,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useState } from "react";

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

const CreatorEventCard = ({
  event,
  onCancel,
  onClaim,
  onDelete,
  onWithdraw,
  cancelLoading,
  claimLoading,
  deleteLoading,
  attendeeCount,
}: {
  event: Event;
  onCancel: (id: number) => void;
  onClaim: (id: number) => void;
  onDelete: (id: number) => void;
  onWithdraw: () => void;
  cancelLoading: boolean;
  claimLoading: boolean;
  deleteLoading: boolean;
  attendeeCount: number;
}) => {
  const [imgError, setImgError] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isEventEnded = event.endDate < Math.floor(Date.now() / 1000);
  const canClaimFunds =
    isEventEnded &&
    !event.isCanceled &&
    !event.fundsReleased &&
    event.fundsHeld > 0;
  const canCancel =
    event.isActive &&
    !event.isCanceled &&
    event.startDate > Math.floor(Date.now() / 1000);
  const capacityPercent = (attendeeCount / Number(event.maxCapacity)) * 100;

  const getImageUrl = () => {
    if (!event.eventCardImgUrl) return "/default-event.jpg";
    return event.eventCardImgUrl.startsWith("http")
      ? event.eventCardImgUrl
      : `https://ipfs.io/ipfs/${event.eventCardImgUrl}`;
  };

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden ${
        event.isCanceled ? "opacity-75 ring-2 ring-red-300" : ""
      }`}
    >
      {/* Status Badge */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {event.isCanceled && (
          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
            <XCircle size={14} />
            CANCELED
          </span>
        )}
        {!event.isCanceled && event.isActive && (
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
            <CheckCircle size={14} />
            ACTIVE
          </span>
        )}
        {isEventEnded && !event.isCanceled && (
          <span className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            ENDED
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {canCancel && (
          <button
            onClick={() => onCancel(event.index)}
            disabled={cancelLoading}
            className="bg-yellow-500 hover:bg-yellow-600 text-white p-2.5 rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110"
            title="Cancel event"
          >
            {cancelLoading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <XCircle size={16} />
            )}
          </button>
        )}

        <button
          onClick={() => onDelete(event.index)}
          disabled={deleteLoading}
          className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110"
          title="Delete event"
        >
          {deleteLoading ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      </div>

      {/* Event Image */}
      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100">
        <img
          src={
            imgError
              ? "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400"
              : event.eventCardImgUrl
          }
          alt={event.eventName}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Event Details */}
      <div className="p-5 space-y-4">
        <h3 className="text-xl font-bold text-gray-900 line-clamp-2 min-h-[3.5rem]">
          {event.eventName}
        </h3>

        <div className="space-y-2.5">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-purple-500 flex-shrink-0" />
            <span className="line-clamp-1">{formatDate(event.startDate)}</span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
            <span className="line-clamp-1">
              {formatTime(event.startTime)} - {formatTime(event.endTime)}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2 text-red-500 flex-shrink-0" />
            <span className="line-clamp-1">{event.eventLocation}</span>
          </div>

          {/* Capacity Bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span className="flex items-center gap-1">
                <Users size={14} />
                Capacity
              </span>
              <span className="font-semibold">
                {attendeeCount} / {event.maxCapacity}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  capacityPercent >= 90
                    ? "bg-red-500"
                    : capacityPercent >= 70
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(capacityPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Age Restriction & Refund Policy */}
          <div className="flex gap-2 pt-2">
            {event.minimumAge > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                <Shield size={12} />
                {event.minimumAge}+
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              <Ticket size={12} />
              {REFUND_POLICY_LABELS[event.refundPolicy]}
            </span>
          </div>
        </div>

        {/* Financials */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-xs text-gray-500">Ticket Price</p>
              <p className="text-lg font-bold text-gray-900">
                {event.ticketPrice.toFixed(2)} MNT
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Funds Held</p>
              <p className="text-lg font-bold text-green-600">
                {event.fundsHeld.toFixed(2)} MNT
              </p>
            </div>
          </div>

          {/* Claim Funds Button */}
          {canClaimFunds && (
            <button
              onClick={() => onClaim(event.index)}
              disabled={claimLoading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {claimLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet size={18} />
                  Release Funds ({event.fundsHeld.toFixed(2)} MNT)
                </>
              )}
            </button>
          )}

          {event.fundsReleased && (
            <div className="w-full bg-gray-100 text-gray-600 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2">
              <CheckCircle size={18} />
              Funds Released
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorEventCard;
