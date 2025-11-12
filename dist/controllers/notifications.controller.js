"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.markAsRead = markAsRead;
exports.updateNotification = updateNotification;
exports.deleteNotification = deleteNotification;
exports.createNotification = createNotification;
const models_1 = require("../models");
async function getNotifications(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const notifications = await models_1.Notification.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
        });
        res.json(notifications);
    }
    catch (e) {
        next(e);
    }
}
async function markAsRead(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const notification = await models_1.Notification.findOne({
            where: { id: req.params.id, userId }
        });
        if (!notification)
            return res.status(404).json({ message: 'Not found' });
        await notification.update({ isRead: true });
        res.json(notification);
    }
    catch (e) {
        next(e);
    }
}
async function updateNotification(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const notification = await models_1.Notification.findOne({
            where: { id: req.params.id, userId }
        });
        if (!notification)
            return res.status(404).json({ message: 'Not found' });
        await notification.update(req.body);
        res.json(notification);
    }
    catch (e) {
        next(e);
    }
}
async function deleteNotification(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const deleted = await models_1.Notification.destroy({
            where: { id: req.params.id, userId }
        });
        res.json({ deleted: deleted > 0 });
    }
    catch (e) {
        next(e);
    }
}
async function createNotification(req, res, next) {
    try {
        const { userId, title, message, type } = req.body;
        if (!userId || !title || !message || !type) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const notification = await models_1.Notification.create({
            userId,
            title,
            message,
            type,
        });
        res.status(201).json(notification);
    }
    catch (e) {
        next(e);
    }
}
//# sourceMappingURL=notifications.controller.js.map