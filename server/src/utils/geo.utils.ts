import axios from "axios";
import { GeoLocation } from "../types/global";

const EARTH_RADIUS_IN_KILOMETERS = 6371;
const FALLBACK_LOCATION: GeoLocation = {
  city: "Unknown",
  country: "Unknown",
  latitude: 0,
  longitude: 0,
};

/**
 * Retrieves the geo location associated with a given IP address.
 * If the IP address is invalid or cannot be resolved, returns a fallback location.
 * @param {string} ipAddress - The IP address to resolve.
 * @returns {Promise<GeoLocation>} A promise resolving to the geo location associated with the IP address.
 */
export const getGeoLocationFromIp = async (ipAddress: string): Promise<GeoLocation> => {
  if (!ipAddress || ipAddress === "::1" || ipAddress === "127.0.0.1") {
    return FALLBACK_LOCATION;
  }

  try {
    const response = await axios.get(`http://ip-api.com/json/${ipAddress}`, {
      timeout: 2000,
      validateStatus: () => true,
    });

    const data: any = response?.data;
    if (!data || data?.status !== "success") return FALLBACK_LOCATION;

    return {
      city: typeof data.city === "string" && data.city.trim() ? data.city : FALLBACK_LOCATION.city,
      country: typeof data.country === "string" && data.country.trim() ? data.country : FALLBACK_LOCATION.country,
      latitude: typeof data.lat === "number" ? data.lat : FALLBACK_LOCATION.latitude,
      longitude: typeof data.lon === "number" ? data.lon : FALLBACK_LOCATION.longitude,
    };
  } catch {
    return FALLBACK_LOCATION;
  }
};

/**
 * Calculates travel metrics between two geographic locations.
 * The metrics include the distance in kilometers, the travel speed in kilometers per hour, and the time difference in hours.
 * @param {number} startLatitude - The latitude of the starting location.
 * @param {number} startLongitude - The longitude of the starting location.
 * @param {number} endLatitude - The latitude of the ending location.
 * @param {number} endLongitude - The longitude of the ending location.
 * @param {Date} startTimestamp - The timestamp of the starting location.
 * @param {Date} endTimestamp - The timestamp of the ending location.
 * @returns {{
 *   distanceInKilometers: number,
 *   travelSpeedKilometersPerHour: number,
 *   timeDifferenceHours: number,
 * }} The travel metrics between the two locations.
 */
export const calculateTravelMetrics = (
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
  startTimestamp: Date,
  endTimestamp: Date
): {
  distanceInKilometers: number;
  travelSpeedKilometersPerHour: number;
  timeDifferenceHours: number;
} => {
  const convertDegreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const latDiff = convertDegreesToRadians(endLatitude - startLatitude);
  const lonDiff = convertDegreesToRadians(endLongitude - startLongitude);

  const haversineComponent =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(convertDegreesToRadians(startLatitude)) *
      Math.cos(convertDegreesToRadians(endLatitude)) *
      Math.sin(lonDiff / 2) ** 2;

  const centralAngle = 2 * Math.atan2(Math.sqrt(haversineComponent), Math.sqrt(1 - haversineComponent));
  const distanceInKilometers = EARTH_RADIUS_IN_KILOMETERS * centralAngle;

  const timeDifferenceMs = endTimestamp.getTime() - startTimestamp.getTime();
  const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);

  // Avoid division by zero
  if (timeDifferenceHours <= 0) {
    return {
      distanceInKilometers,
      travelSpeedKilometersPerHour: 0,
      timeDifferenceHours: 0,
    };
  }

  const travelSpeedKilometersPerHour = distanceInKilometers / timeDifferenceHours;

  return {
    distanceInKilometers,
    travelSpeedKilometersPerHour,
    timeDifferenceHours,
  };
};