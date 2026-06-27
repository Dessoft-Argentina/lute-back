/**
 * Setup express server.
 */

import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import helmet from 'helmet';
import express, { Request, Response, NextFunction } from 'express';
import logger from 'jet-logger';

import 'express-async-errors';

import  BaseRouter from '@src/routes/api';

import Paths from '@src/common/Paths';
import EnvVars from '@src/common/EnvVars';
import HttpStatusCodes from '@src/common/HttpStatusCodes';
import RouteError from '@src/common/RouteError';
import { NodeEnvs } from '@src/common/misc';



import { defineAssociations } from '@src/models/sequalize';
import { connect } from './database';




// **** Variables **** //

const app = express();
const cors = require('cors');

// **** Setup **** //

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser(EnvVars.CookieProps.Secret));
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

const cspDirectives = {
  defaultSrc: ["'self'"],
  connectSrc: ["'self'", ...corsOrigins],
  imgSrc: ["'self'", "data:", "blob:"],
  mediaSrc: ["'self'", "blob:", "data:"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'"],
};

app.use(helmet({ contentSecurityPolicy: { directives: cspDirectives } }));

// Show routes called in console during development
if (EnvVars.NodeEnv === NodeEnvs.Dev.valueOf()) {
  app.use(morgan('dev'));
}

// Capture raw body for webhook signature verification
app.use('/pagos', (req: Request, _res: Response, next: NextFunction) => {
  if (req.method === 'POST') {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      (req as any).rawBody = data;
      next();
    });
  } else {
    next();
  }
});

// Add APIs, must be after middleware
app.use(Paths.Base, BaseRouter);

// Add error handler (endurecido, corrige S11: no filtrar internals)
app.use((
  err: Error,
  _: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  if (EnvVars.NodeEnv !== NodeEnvs.Test.valueOf()) {
    logger.err(err, true);
  }
  let status = HttpStatusCodes.BAD_REQUEST;
  if (err instanceof RouteError) {
    status = err.status;
    return res.status(status).json({ error: err.message });
  }
  return res.status(status).json({ error: 'Error interno del servidor' });
});


// Set static directory (js and css).
const staticDir = path.join(__dirname, 'public');
app.use(express.static(staticDir));

// Health check
app.get('/', (_: Request, res: Response) => {
  return res.json({ status: 'ok' });
});

connect();
defineAssociations();
// **** Export default **** //

export default app;
