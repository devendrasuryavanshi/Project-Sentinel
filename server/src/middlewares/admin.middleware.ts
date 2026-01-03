import { Request, Response, NextFunction } from "express";

export const requireAdmin = (request: Request, response: Response, next: NextFunction) => {
  if (!request?.user || request.user.role !== "admin") {
    return response.status(403).json({ message: "Access Denied: Admins Only" });
  }
  next();
};