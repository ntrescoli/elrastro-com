import type { NextFunction, Request, Response } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  const expected = process.env.ADMIN_TOKEN ?? "";
  const isAuthorized = scheme === "Bearer" && token === expected && token.length > 0;

  if (!isAuthorized) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  next();
}
