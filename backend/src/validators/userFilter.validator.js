// src/validators/userFilter.validator.js
import Joi from "joi";

/**
 * Allowed role & status enums (server-side source of truth)
 */
export const ROLE_ENUM = ["ADMIN", "ASSESSOR", "ENGINEER", "PLANNER", "BPLO"];
export const STATUS_ENUM = ["active", "pending", "disabled"];

/**
 * Pinapayagang sort keys (puwedeng may "-" prefix para DESC):
 * id | username | firstName | lastName | email | role | status | officeId | municipalityId | createdAt | updatedAt
 */
const SORT_REGEX =
  /^-?(id|username|firstName|lastName|email|role|status|officeId|municipalityId|createdAt|updatedAt)$/;

/* ============================================================================
 * 1) QUERY VALIDATOR – for GET /api/admin/users
 * ==========================================================================*/
const listQuerySchema = Joi.object({
  q: Joi.string().trim().max(100).allow(""),

  role: Joi.string()
    .trim()
    .uppercase()
    .valid(...ROLE_ENUM)
    .optional()
    .messages({
      "any.only": `role must be one of: ${ROLE_ENUM.join(", ")}`,
    }),

  status: Joi.string()
    .trim()
    .lowercase()
    .valid(...STATUS_ENUM)
    .optional()
    .messages({
      "any.only": `status must be one of: ${STATUS_ENUM.join(", ")}`,
    }),

  officeId: Joi.number().integer().positive().optional(),
  municipalityId: Joi.number().integer().positive().optional(),

  // YYYY-MM-DD
  dateFrom: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({ "string.pattern.base": "dateFrom must be YYYY-MM-DD" }),
  dateTo: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({ "string.pattern.base": "dateTo must be YYYY-MM-DD" }),

  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),

  sort: Joi.string().trim().pattern(SORT_REGEX).default("-createdAt"),
}).unknown(false);

export function validateUserFilters(req, res, next) {
  const { value, error } = listQuerySchema.validate(req.query, {
    abortEarly: false,
    convert: true, // "1" => 1 for numeric fields
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      result: 0,
      error: "Invalid query parameters",
      details: error.details.map((d) => ({
        path: d.path.join("."),
        message: d.message,
      })),
    });
  }

  req.query = value; // sanitized na
  return next();
}

/* ============================================================================
 * 2) CREATE BODY VALIDATOR – for POST /api/admin/users
 * ==========================================================================*/
const createBodySchema = Joi.object({
  username: Joi.string().trim().min(3).max(64).required(),
  first_name: Joi.string().trim().min(1).max(100).required(),
  last_name: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().trim().email().max(255).required(),

  // password required on create; 6+ chars
  password: Joi.string().trim().min(6).max(128).required(),

  role: Joi.string()
    .trim()
    .uppercase()
    .valid(...ROLE_ENUM)
    .default("BPLO")
    .messages({
      "any.only": `role must be one of: ${ROLE_ENUM.join(", ")}`,
    }),

  status: Joi.string()
    .trim()
    .lowercase()
    .valid(...STATUS_ENUM)
    .default("pending")
    .messages({
      "any.only": `status must be one of: ${STATUS_ENUM.join(", ")}`,
    }),

  office_id: Joi.number().integer().positive().allow(null).optional(),
  municipality_id: Joi.number().integer().positive().allow(null).optional(),
}).unknown(false);

export function validateUserCreateBody(req, res, next) {
  const { value, error } = createBodySchema.validate(req.body, {
    abortEarly: false,
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      result: 0,
      error: "Invalid request body",
      details: error.details.map((d) => ({
        path: d.path.join("."),
        message: d.message,
      })),
    });
  }

  req.body = value;
  return next();
}

/* ============================================================================
 * 3) UPDATE BODY VALIDATOR – for PATCH /api/admin/users/:id
 *    (At least one field must be present)
 * ==========================================================================*/
const updateBodySchema = Joi.object({
  username: Joi.string().trim().min(3).max(64), // kung papayagan mong i-edit
  first_name: Joi.string().trim().min(1).max(100),
  last_name: Joi.string().trim().min(1).max(100),
  email: Joi.string().trim().email().max(255),

  // password optional sa edit; 6+ chars if present
  password: Joi.string().trim().min(6).max(128),

  role: Joi.string()
    .trim()
    .uppercase()
    .valid(...ROLE_ENUM)
    .messages({
      "any.only": `role must be one of: ${ROLE_ENUM.join(", ")}`,
    }),

  status: Joi.string()
    .trim()
    .lowercase()
    .valid(...STATUS_ENUM)
    .messages({
      "any.only": `status must be one of: ${STATUS_ENUM.join(", ")}`,
    }),

  office_id: Joi.number().integer().positive().allow(null),
  municipality_id: Joi.number().integer().positive().allow(null),
})
  .min(1) // at least one field dapat meron
  .unknown(false);

export function validateUserUpdateBody(req, res, next) {
  const { value, error } = updateBodySchema.validate(req.body, {
    abortEarly: false,
    convert: true,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      result: 0,
      error: "Invalid request body",
      details: error.details.map((d) => ({
        path: d.path.join("."),
        message: d.message,
      })),
    });
  }

  req.body = value;
  return next();
}

/* ============================================================================
 * Default export (for backward compatibility)
 * ==========================================================================*/
export default validateUserFilters;
