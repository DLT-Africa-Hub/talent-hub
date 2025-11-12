declare module 'morgan';
declare module 'swagger-ui-express';
declare module 'xss-clean' {
  import { RequestHandler } from 'express';
  function xssClean(): RequestHandler;
  export default xssClean;
}


