export interface EventData {
  eventName: string;
  eventDetails: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  eventLocation: string;
  ticketPrice: string;  
  minimumAge: string;
  maxCapacity: string; 
  refundPolicy: string; 
  refundBufferHours: string; 
  image?: string;  
}