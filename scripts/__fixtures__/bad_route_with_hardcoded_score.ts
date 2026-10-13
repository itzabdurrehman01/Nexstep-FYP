/**
 * backend/scripts/__fixtures__/bad_route_with_hardcoded_score.ts
 *
 * Deliberately Wrong Fixture mimicking the original bug where an API route
 * returned hardcoded literal numbers instead of computing dynamic ranker scores.
 */
import { Request, Response } from 'express';

export function badRouteHandler(req: Request, res: Response) {
  // Deliberate hardcoded score bug (Issue 1)
  return res.json({
    title: 'Software Engineer',
    score: 82.5,
    confidence: 'HIGH',
    eligibility: { status: 'ELIGIBLE' }
  });
}
