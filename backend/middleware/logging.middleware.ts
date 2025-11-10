import morgan from 'morgan';

const loggingFormat =
  process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

export const loggingMiddleware = morgan(loggingFormat);


