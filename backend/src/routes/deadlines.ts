import { Router } from 'express';
import {
  getUserDeadlines,
  saveUserDeadlines,
  clearUserDeadlines,
  createSingleDeadline,
  deleteSingleDeadline,
} from '../controllers/deadlineRecordController';
import { authenticate } from '../middleware/auth';

const deadlineRouter = Router();

deadlineRouter.get('/', authenticate, getUserDeadlines);
deadlineRouter.post('/save', authenticate, saveUserDeadlines);
deadlineRouter.post('/item', authenticate, createSingleDeadline);
deadlineRouter.delete('/item/:id', authenticate, deleteSingleDeadline);
deadlineRouter.delete('/', authenticate, clearUserDeadlines);

export default deadlineRouter;
