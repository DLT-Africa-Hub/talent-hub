import { Response } from 'express';
import mongoose from 'mongoose';

/**
 * Types for Express request inputs
 * These represent the actual types that can come from req.body, req.query, req.params
 */
type RequestStringValue = string | number | boolean | null | undefined;
type RequestIdValue = string | number | null | undefined;
type RequestNumericValue = string | number | null | undefined;
type RequestArrayValue =
  | (string | number | boolean | object | null)[]
  | null
  | undefined;
type RequestObjectValue =
  | Record<string, string | number | boolean | object | null | undefined>
  | null
  | undefined;

/**
 * Validate required string field
 */
export const validateRequiredString = (
  value: RequestStringValue,
  fieldName: string,
  res: Response
): string | null => {
  if (!value) {
    res.status(400).json({ message: `${fieldName} is required` });
    return null;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    res
      .status(400)
      .json({ message: `${fieldName} must be a non-empty string` });
    return null;
  }

  return value.trim();
};

/**
 * Validate optional string field
 */
export const validateOptionalString = (
  value: RequestStringValue,
  fieldName: string,
  res: Response
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    res
      .status(400)
      .json({ message: `${fieldName} must be a non-empty string or null` });
    return null;
  }

  return value.trim();
};

/**
 * Validate ObjectId
 */
export const validateObjectId = (
  id: RequestIdValue,
  fieldName: string,
  res: Response
): string | null => {
  if (!id) {
    res.status(400).json({ message: `${fieldName} is required` });
    return null;
  }

  if (typeof id !== 'string') {
    res.status(400).json({ message: `${fieldName} must be a string` });
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: `Invalid ${fieldName}` });
    return null;
  }

  return id;
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (
  page: RequestNumericValue,
  limit: RequestNumericValue,
  res: Response
): { page: number; limit: number } | null => {
  const pageStr = typeof page === 'string' ? page : String(page);
  const limitStr = typeof limit === 'string' ? limit : String(limit);

  const pageNum = parseInt(pageStr, 10);
  const limitNum = parseInt(limitStr, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    res.status(400).json({ message: 'Page must be a positive integer' });
    return null;
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    res.status(400).json({ message: 'Limit must be between 1 and 100' });
    return null;
  }

  return { page: pageNum, limit: limitNum };
};

/**
 * Validate enum value
 */
export const validateEnum = <T extends string>(
  value: RequestStringValue,
  allowedValues: readonly T[],
  fieldName: string,
  res: Response
): T | null => {
  if (!value) {
    res.status(400).json({ message: `${fieldName} is required` });
    return null;
  }

  if (typeof value !== 'string') {
    res.status(400).json({ message: `${fieldName} must be a string` });
    return null;
  }

  if (!allowedValues.includes(value as T)) {
    res.status(400).json({
      message: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
    });
    return null;
  }

  return value as T;
};

/**
 * Validate optional enum value
 */
export const validateOptionalEnum = <T extends string>(
  value: RequestStringValue,
  allowedValues: readonly T[],
  fieldName: string,
  res: Response
): T | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    res.status(400).json({ message: `${fieldName} must be a string` });
    return null;
  }

  if (!allowedValues.includes(value as T)) {
    res.status(400).json({
      message: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
    });
    return null;
  }

  return value as T;
};

interface SalaryInput {
  amount?: number;
  currency?: string;
}

interface SalaryOutput {
  amount: number;
  currency: string;
}

/**
 * Validate salary object (single amount, no min/max)
 */
export const validateSalary = (
  salary: RequestObjectValue,
  res: Response
): SalaryOutput | null => {
  if (salary === null || salary === undefined) {
    return null;
  }

  if (typeof salary !== 'object' || salary === null) {
    res.status(400).json({ message: 'Salary must be an object' });
    return null;
  }

  const salaryObj = salary as SalaryInput;

  if (typeof salaryObj.amount !== 'number' || salaryObj.amount < 0) {
    res
      .status(400)
      .json({ message: 'Salary amount must be a non-negative number' });
    return null;
  }

  return {
    amount: salaryObj.amount,
    currency: salaryObj.currency || 'USD',
  };
};

/**
 * Validate skills array
 */
export const validateSkills = (
  skills: RequestArrayValue,
  res: Response
): string[] | null => {
  if (!skills) {
    res.status(400).json({ message: 'At least one skill is required' });
    return null;
  }

  if (!Array.isArray(skills)) {
    res.status(400).json({ message: 'Skills must be an array' });
    return null;
  }

  if (skills.length === 0) {
    res.status(400).json({ message: 'At least one skill is required' });
    return null;
  }

  if (
    !skills.every(
      (skill: string | number | boolean | object | null) =>
        typeof skill === 'string' && skill.trim().length > 0
    )
  ) {
    res.status(400).json({ message: 'All skills must be non-empty strings' });
    return null;
  }

  return (skills as string[]).map((s: string) => s.trim());
};

/**
 * Validate numeric range
 */
export const validateNumericRange = (
  value: RequestNumericValue,
  min: number,
  max: number,
  fieldName: string,
  res: Response
): number | null => {
  const valueStr = typeof value === 'string' ? value : String(value);
  const num = parseFloat(valueStr);

  if (isNaN(num) || num < min || num > max) {
    res.status(400).json({
      message: `${fieldName} must be a number between ${min} and ${max}`,
    });
    return null;
  }

  return num;
};

/**
 * Validate interview stages (1, 2, or 3)
 */
export const validateInterviewStages = (
  value: RequestNumericValue,
  res: Response
): 1 | 2 | 3 | null => {
  if (value === undefined || value === null) {
    return null; // Optional field, return null to use default
  }

  const valueStr = typeof value === 'string' ? value : String(value);
  const num = parseInt(valueStr, 10);

  if (isNaN(num) || num < 1 || num > 3) {
    res.status(400).json({
      message: 'Interview stages must be a number between 1 and 3',
    });
    return null;
  }

  if (num !== 1 && num !== 2 && num !== 3) {
    res.status(400).json({
      message: 'Interview stages must be exactly 1, 2, or 3',
    });
    return null;
  }

  return num as 1 | 2 | 3;
};

/**
 * Remove undefined values from object
 */
export const deleteUndefined = <T extends Record<string, unknown>>(
  obj: T
): Partial<T> => {
  const cleaned: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};
