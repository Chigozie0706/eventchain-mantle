import GoogleMapWithSearch from "components/AutoPlace";
import { EventData } from "../types";
import { FormInput } from "@/components/FormInput";
import { useState } from "react";

interface Props {
  eventData: EventData;
  setEventData: React.Dispatch<React.SetStateAction<EventData>>;
}

export default function Location({ eventData, setEventData }: Props) {
  const [errors, setErrors] = useState("");
  return (
    <>
      <FormInput label="Location" error={errors} required>
        <GoogleMapWithSearch
          eventData={eventData}
          setEventData={setEventData}
        />
      </FormInput>
    </>
  );
}
