// src/validators/userUpdate.validator.js
import Joi from "joi";

// Enums (keep in sync with backend)
export const ROLE_ENUM = ["ADMIN", "ASSESSOR", "ENGINEER", "PLANNER", "BPLO"];
export const STATUS_ENUM = ["active", "pending", "disabled"];

/**
 * Body validator for PATCH /api/admin/users/:id
 * Optional fields (at least one required):
 *  - username, first_name, last_name, email
 *  - password (>=6 chars)
 *  - role (ADMIN | ASSESSOR | ENGINEER | PLANNER | BPLO)
 *  - status (active | pending | disabled)
 *  - office_id, municipality_id (ints or null)
 */
const updateBodySchema = Joi.object({
  username: Joi.string().trim().min(3).max(64),
  first_name: Joi.string().trim().min(1).max(100),
  last_name: Joi.string().trim().min(1).max(100),
  email: Joi.string().trim().email().max(255),

  // password optional; hash sa controller if present
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
  .min(1) // kailangan may at least 1 field na ina-update
  .unknown(false);

/**
 * Express middleware
 */
export default function validateUserUpdateBody(req, res, next) {
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

  req.body = value; // sanitized payload
  return next();
}
