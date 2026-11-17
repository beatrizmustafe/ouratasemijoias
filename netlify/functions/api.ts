import serverless from 'serverless-http';
import type { Handler } from '@netlify/functions';
import { createApiApp } from '../../src/server/app.ts';

const app = createApiApp();
const serverlessHandler = serverless(app);

export const handler: Handler = async (event, context) => {
  return (await serverlessHandler(event as any, context as any)) as any;
};
