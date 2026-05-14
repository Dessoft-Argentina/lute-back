import './pre-start'; // Must be the first import
import logger from 'jet-logger';

import EnvVars from '@src/common/EnvVars';
import server from './server';
import { env } from 'process';


// **** Run **** //

const SERVER_START_MSG = ('Express server started on port: ' + 
  EnvVars.Port.toString());

server.listen(env.PORT, () => logger.info(SERVER_START_MSG));
