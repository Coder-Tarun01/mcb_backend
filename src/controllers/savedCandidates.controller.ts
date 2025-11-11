import { Request, Response, NextFunction } from 'express';
import { SavedCandidate, Candidate } from '../models';
import { AuthRequest } from '../middleware/auth';

export async function getSavedCandidates(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const savedCandidates = await SavedCandidate.findAll({
      where: { userId },
      include: [
        {
          model: Candidate,
          as: 'candidate',
        },
      ],
      order: [['savedAt', 'DESC']],
    });

    res.json(savedCandidates);
  } catch (e) {
    next(e);
  }
}

export async function saveCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { candidateId } = req.body;

    if (!candidateId) {
      return res.status(400).json({ message: 'Candidate ID is required' });
    }

    // Check if already saved
    const existing = await SavedCandidate.findOne({
      where: { userId, candidateId },
    });

    if (existing) {
      return res.status(409).json({ message: 'Candidate already saved' });
    }

    const savedCandidate = await SavedCandidate.create({
      userId,
      candidateId,
    });

    res.status(201).json(savedCandidate);
  } catch (e) {
    next(e);
  }
}

export async function unsaveCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { candidateId } = req.params;

    const deleted = await SavedCandidate.destroy({
      where: { userId, candidateId },
    });

    if (deleted === 0) {
      return res.status(404).json({ message: 'Saved candidate not found' });
    }

    res.json({ message: 'Candidate unsaved successfully' });
  } catch (e) {
    next(e);
  }
}

export async function checkIfSaved(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { candidateId } = req.params;

    const saved = await SavedCandidate.findOne({
      where: { userId, candidateId },
    });

    res.json({ isSaved: !!saved });
  } catch (e) {
    next(e);
  }
}

