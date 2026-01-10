"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import EventCard from "components/EventCard";
import contractABI from "contract/eventchainAbi.json";
import { useConnection, useReadContract } from "wagmi";

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
  refundPolicy: number;
  refundBufferHours: number;
}

export default function HeroSection() {
  const { chain } = useConnection();
  const [events, setEvents] = useState<Event[]>([]);

  const { data, error, isLoading, isError, isSuccess } = useReadContract({
    abi: contractABI.abi,
    address: "0xDfb4FD0a6A526a2d1fE3c0dA77Be29ac20EE7967",
    functionName: "getAllEvents",
  });

  useEffect(() => {
    if (isSuccess && data) {
      const [indexes, activeEvents] = data as [bigint[], any[]];

      const formattedEvents: Event[] = activeEvents.map((event, idx) => ({
        index: Number(indexes[idx]),
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
        ticketPrice: Number(event.ticketPrice),
        fundsHeld: Number(event.fundsHeld),
        minimumAge: Number(event.minimumAge),
        maxCapacity: Number(event.maxCapacity),
        isCanceled: event.isCanceled,
        fundsReleased: event.fundsReleased,
        exists: event.exists,
        refundPolicy: Number(event.refundPolicy),
        refundBufferHours: Number(event.refundBufferHours),
      }));

      setEvents(formattedEvents);
      console.log("Formatted events:", formattedEvents);
    }
  }, [isSuccess, data]);

  return (
    <>
      <section className="relative w-full h-[70vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute inset-0 bg-black opacity-50"></div>{" "}
          {/* Dark Overlay */}
          <img
            src="/banner.png"
            alt="Event background"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Text Content */}
        <div className="relative z-10 max-w-3xl text-white">
          <h2 className="text-3xl font-extrabold sm:text-4xl md:text-5xl lg:text-6xl">
            Discover & Book Events Anywhere!
          </h2>
          <p className="mt-4 text-lg sm:text-xl md:text-2xl">
            Find exciting concerts, workshops, and conferences worldwide. Stay
            connected to what matters!
          </p>

          {/* Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center">
            <Link href="/create_event">
              <button className="bg-orange-500 px-6 py-3 rounded-md text-lg font-semibold hover:bg-orange-600 transition">
                Create an Event
              </button>
            </Link>
            <Link href="/view_events">
              <button className="bg-blue-600 px-6 py-3 rounded-md text-lg font-semibold hover:bg-blue-700 transition">
                View Events
              </button>
            </Link>
          </div>
        </div>
      </section>

      <div className="">
        <div className="">
          <h3 className="text-1xl md:text-2xl font-bold mt-20 m-5">
            Featured & Upcoming Events
          </h3>

          <div className="w-full px-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 justify-center">
              {events.length > 0 ? (
                events.map((event, index) => (
                  <EventCard key={index} event={event} />
                ))
              ) : (
                <p className="text-center text-gray-500 col-span-full">
                  No events found.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
