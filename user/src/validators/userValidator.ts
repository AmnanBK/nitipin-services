import Joi from 'joi';

/**
 * Joi validation schema for updating a traveler profile.
 */
export const updateTravelerSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  phone: Joi.string().max(20).allow(null, '').optional(),
  profile_photo: Joi.string().max(255).allow(null, '').optional(), // Support path/URL
  bio: Joi.string().allow(null, '').optional(),
  country_id: Joi.number().integer().positive().allow(null).optional(),
});

/**
 * Joi validation schema for updating traveler account status.
 */
export const updateTravelerStatusSchema = Joi.object({
  account_status: Joi.string().valid('active', 'inactive').required(),
});
