"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const mailService_1 = require("../services/mailService");
const router = (0, express_1.Router)();
// Test email connection
router.get('/test-connection', auth_1.authenticate, async (req, res) => {
    try {
        const isConnected = await (0, mailService_1.verifyEmailConnection)();
        res.json({
            success: isConnected,
            message: isConnected ? 'Email service is working' : 'Email service is not available'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to test email connection',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Send admin notification (admin only)
router.post('/admin-notification', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const { subject, content, adminEmails } = req.body;
        if (!subject || !content) {
            return res.status(400).json({ message: 'Subject and content are required' });
        }
        const result = await (0, mailService_1.sendAdminNotification)(subject, content, adminEmails);
        if (result.success) {
            res.json({
                success: true,
                message: 'Admin notification sent successfully',
                messageId: result.messageId
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Failed to send admin notification',
                error: result.error
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send admin notification',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Send support response
router.post('/support-response', auth_1.authenticate, async (req, res) => {
    try {
        const { userEmail, userName, ticketId, response } = req.body;
        if (!userEmail || !userName || !ticketId || !response) {
            return res.status(400).json({
                message: 'User email, name, ticket ID, and response are required'
            });
        }
        const result = await (0, mailService_1.sendSupportResponse)(userEmail, userName, ticketId, response);
        if (result.success) {
            res.json({
                success: true,
                message: 'Support response sent successfully',
                messageId: result.messageId
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Failed to send support response',
                error: result.error
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send support response',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Send business inquiry
router.post('/business-inquiry', auth_1.authenticate, async (req, res) => {
    try {
        const { to, subject, content } = req.body;
        if (!to || !subject || !content) {
            return res.status(400).json({
                message: 'Recipient, subject, and content are required'
            });
        }
        const result = await (0, mailService_1.sendBusinessInquiry)(to, subject, content);
        if (result.success) {
            res.json({
                success: true,
                message: 'Business inquiry sent successfully',
                messageId: result.messageId
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Failed to send business inquiry',
                error: result.error
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send business inquiry',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Send sales email
router.post('/sales-email', auth_1.authenticate, async (req, res) => {
    try {
        const { to, subject, content } = req.body;
        if (!to || !subject || !content) {
            return res.status(400).json({
                message: 'Recipient, subject, and content are required'
            });
        }
        const result = await (0, mailService_1.sendSalesEmail)(to, subject, content);
        if (result.success) {
            res.json({
                success: true,
                message: 'Sales email sent successfully',
                messageId: result.messageId
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Failed to send sales email',
                error: result.error
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send sales email',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Send custom email (admin only)
router.post('/custom-email', auth_1.authenticate, (0, auth_1.authorize)('admin'), async (req, res) => {
    try {
        const { to, subject, content, fromEmail } = req.body;
        if (!to || !subject || !content) {
            return res.status(400).json({
                message: 'Recipients, subject, and content are required'
            });
        }
        const result = await (0, mailService_1.sendEmail)(to, subject, content, fromEmail);
        if (result.success) {
            res.json({
                success: true,
                message: 'Custom email sent successfully',
                messageId: result.messageId
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Failed to send custom email',
                error: result.error
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send custom email',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=email.js.map