// src/validators/userCreate.validator.js
import Joi from "joi";

// Enums (server-side source of truth for creates)
export const ROLE_ENUM = ["ADMIN", "ASSESSOR", "ENGINEER", "PLANNER", "BPLO"];
export const STATUS_ENUM = ["active", "pending", "disabled"];

/**
 * Body validator for POST /api/admin/users
 * Required:
 *  - username, first_name, last_name, email, password(>=6)
 * Optional:
 *  - role (default 'BPLO'), status (default 'pending'),
 *  - office_id, municipality_id (ints or null)
 */
const createBodySchema = Joi.object({
  username: Joi.string().trim().min(3).max(64).required(),
  first_name: Joi.string().trim().min(1).max(100).required(),
  last_name: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().trim().email().max(255).required(),

  // password required on create; at least 6 chars
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

/**
 * Express middleware
 */
export default function validateUserCreateBody(req, res, next) {
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

  req.body = value; // sanitized
  return next();
}
