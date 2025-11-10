import { Request } from 'express';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

export const parsePaginationParams = (req: Request): PaginationParams => {
  const pageRaw = typeof req.query.page === 'string' ? req.query.page : `${DEFAULT_PAGE}`;
  const limitRaw = typeof req.query.limit === 'string' ? req.query.limit : `${DEFAULT_LIMIT}`;

  let page = Number.parseInt(pageRaw, 10);
  let limit = Number.parseInt(limitRaw, 10);

  if (!Number.isFinite(page) || page < 1) {
    page = DEFAULT_PAGE;
  }

  if (!Number.isFinite(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  }

  limit = Math.min(limit, MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const buildPaginationMeta = (
  page: number,
  limit: number,
  totalItems: number
): PaginationMeta => ({
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(totalItems / limit)),
  totalItems,
});


