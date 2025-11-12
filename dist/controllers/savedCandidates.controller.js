"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSavedCandidates = getSavedCandidates;
exports.saveCandidate = saveCandidate;
exports.unsaveCandidate = unsaveCandidate;
exports.checkIfSaved = checkIfSaved;
const models_1 = require("../models");
async function getSavedCandidates(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const savedCandidates = await models_1.SavedCandidate.findAll({
            where: { userId },
            include: [
                {
                    model: models_1.Candidate,
                    as: 'candidate',
                },
            ],
            order: [['savedAt', 'DESC']],
        });
        res.json(savedCandidates);
    }
    catch (e) {
        next(e);
    }
}
async function saveCandidate(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { candidateId } = req.body;
        if (!candidateId) {
            return res.status(400).json({ message: 'Candidate ID is required' });
        }
        // Check if already saved
        const existing = await models_1.SavedCandidate.findOne({
            where: { userId, candidateId },
        });
        if (existing) {
            return res.status(409).json({ message: 'Candidate already saved' });
        }
        const savedCandidate = await models_1.SavedCandidate.create({
            userId,
            candidateId,
        });
        res.status(201).json(savedCandidate);
    }
    catch (e) {
        next(e);
    }
}
async function unsaveCandidate(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { candidateId } = req.params;
        const deleted = await models_1.SavedCandidate.destroy({
            where: { userId, candidateId },
        });
        if (deleted === 0) {
            return res.status(404).json({ message: 'Saved candidate not found' });
        }
        res.json({ message: 'Candidate unsaved successfully' });
    }
    catch (e) {
        next(e);
    }
}
async function checkIfSaved(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { candidateId } = req.params;
        const saved = await models_1.SavedCandidate.findOne({
            where: { userId, candidateId },
        });
        res.json({ isSaved: !!saved });
    }
    catch (e) {
        next(e);
    }
}
//# sourceMappingURL=savedCandidates.controller.js.map