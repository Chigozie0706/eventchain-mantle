"use client";

import EventForm from "@/components/EventForm";

export default function CreateEvent() {
  return (
    <>
      {/* Page wrapper with top padding to prevent content from being hidden behind fixed headers */}
      <div className="pt-16">
        <EventForm />
      </div>
    </>
  );
}
