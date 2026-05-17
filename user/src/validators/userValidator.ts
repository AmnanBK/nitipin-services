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

/**
 * Joi validation schema for updating traveler country.
 */
export const updateTravelerCountrySchema = Joi.object({
  country_id: Joi.number().integer().positive().required(),
});

/**
 * Joi validation schema for updating a buyer profile.
 */
export const updateBuyerSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  phone: Joi.string().max(20).allow(null, '').optional(),
  profile_photo: Joi.string().max(255).allow(null, '').optional(),
});

/**
 * Joi validation schema for creating a buyer address.
 */
export const createBuyerAddressSchema = Joi.object({
  label: Joi.string().max(50).required(),
  full_address: Joi.string().required(),
  city: Joi.string().max(100).required(),
  postal_code: Joi.string().max(10).allow(null, '').optional(),
  is_default: Joi.number().valid(0, 1).optional(),
});

/**
 * Joi validation schema for updating a buyer address.
 */
export const updateBuyerAddressSchema = Joi.object({
  label: Joi.string().max(50).optional(),
  full_address: Joi.string().optional(),
  city: Joi.string().max(100).optional(),
  postal_code: Joi.string().max(10).allow(null, '').optional(),
  is_default: Joi.number().valid(0, 1).optional(),
});
