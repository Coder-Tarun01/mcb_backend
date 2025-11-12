import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models';
import { AuthRequest } from '../middleware/auth';

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });
    res.json(notifications);
  } catch (e) { next(e); }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const notification = await Notification.findOne({
      where: { id: req.params.id, userId }
    });
    if (!notification) return res.status(404).json({ message: 'Not found' });

    await notification.update({ isRead: true });
    res.json(notification);
  } catch (e) { next(e); }
}

export async function updateNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const notification = await Notification.findOne({
      where: { id: req.params.id, userId }
    });
    if (!notification) return res.status(404).json({ message: 'Not found' });

    await notification.update(req.body);
    res.json(notification);
  } catch (e) { next(e); }
}

export async function deleteNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const deleted = await Notification.destroy({
      where: { id: req.params.id, userId }
    });
    res.json({ deleted: deleted > 0 });
  } catch (e) { next(e); }
}

export async function createNotification(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, title, message, type } = req.body;
    if (!userId || !title || !message || !type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
    });
    res.status(201).json(notification);
  } catch (e) { next(e); }
}
