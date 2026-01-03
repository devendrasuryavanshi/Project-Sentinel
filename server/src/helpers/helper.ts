import { UAParser } from "ua-parser-js";
import { logger } from "../utils/logger";

/**
 * Returns a human-readable device name based on the user agent string.
 * @param {string} userAgent - The user agent string from the HTTP request.
 * @returns {string} A human-readable device name.
 */

export const getDeviceName = (userAgent: string) => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const osName = result.os.name;
  const osVersion = result.os.version;

  const vendor = result.device.vendor;
  const model = result.device.model;
  const type = result.device.type;

  logger.info(`OS Name: ${osName}`);
  logger.info(`OS Version: ${osVersion}`);
  logger.info(`Vendor: ${vendor}`);
  logger.info(`Model: ${model}`);
  logger.info(`Type: ${type}`);

  if (vendor && model) {
    return `${vendor} ${model}`;
  }

  if (type === "mobile") {
    return "Mobile Device";
  }

  if (type === "tablet") {
    return "Tablet Device";
  }

  if (osName === "Mac OS") {
    return "Apple Mac";
  }

  if (osName === "iOS") {
    return "Apple iPhone / iPad";
  }

  if (osName === "Windows") {
    return "Windows PC";
  }

  if (osName === "Linux") {
    return "Linux Machine";
  }

  if (osName && osVersion) {
    return `${osName} ${osVersion}`;
  }

  return "Unknown Device";
};
