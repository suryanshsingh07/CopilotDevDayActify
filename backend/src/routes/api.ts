import { Router } from 'express';
import { extractController, analyzeController } from '../controllers/deadlineController';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Actify API', timestamp: new Date().toISOString() });
});

router.post('/extract', (req, res) => {
  extractController(req, res).catch((err: unknown) => {
    console.error('Extract error:', err);
    res.status(500).json({
      error: 'AI extraction failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  });
});

router.post('/analyze', (req, res) => {
  analyzeController(req, res).catch((err: unknown) => {
    console.error('Analyze error:', err);
    res.status(500).json({
      error: 'Analysis failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  });
});

export default router;
