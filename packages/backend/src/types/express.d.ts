import { User } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}