import { NextResponse } from "next/server";
import type { PaginationMeta } from "@/types/api";

export function successResponse<T>(data: T, meta?: PaginationMeta, status = 200) {
  return NextResponse.json({ data, ...(meta && { meta }) }, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status }
  );
}

export function unauthorizedResponse() {
  return errorResponse("UNAUTHORIZED", "Authentication required", 401);
}

export function notFoundResponse(resource = "Resource") {
  return errorResponse("NOT_FOUND", `${resource} not found`, 404);
}

export function validationError(details: unknown) {
  return errorResponse("VALIDATION_ERROR", "Invalid request data", 400, details);
}
