import axios from "axios";

// Create a configured instance
export const client = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true, // allows sending/receiving cookies
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);
