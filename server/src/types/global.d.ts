export interface EmailTask {
  to: string;
  subject: string;
  html: string;
  retries: number;
}

export interface GeoLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}