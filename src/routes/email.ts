import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  sendEmail,
  sendAdminNotification,
  sendSupportResponse,
  sendBusinessInquiry,
  sendSalesEmail,
  verifyEmailConnection
} from '../services/mailService';

const router = Router();

// Test email connection
router.get('/test-connection', authenticate, async (req, res) => {
  try {
    const isConnected = await verifyEmailConnection();
    res.json({ 
      success: isConnected, 
      message: isConnected ? 'Email service is working' : 'Email service is not available' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test email connection',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send admin notification (admin only)
router.post('/admin-notification', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { subject, content, adminEmails } = req.body;
    
    if (!subject || !content) {
      return res.status(400).json({ message: 'Subject and content are required' });
    }

    const result = await sendAdminNotification(subject, content, adminEmails);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Admin notification sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send admin notification',
        error: result.error 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send admin notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send support response
router.post('/support-response', authenticate, async (req, res) => {
  try {
    const { userEmail, userName, ticketId, response } = req.body;
    
    if (!userEmail || !userName || !ticketId || !response) {
      return res.status(400).json({ 
        message: 'User email, name, ticket ID, and response are required' 
      });
    }

    const result = await sendSupportResponse(userEmail, userName, ticketId, response);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Support response sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send support response',
        error: result.error 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send support response',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send business inquiry
router.post('/business-inquiry', authenticate, async (req, res) => {
  try {
    const { to, subject, content } = req.body;
    
    if (!to || !subject || !content) {
      return res.status(400).json({ 
        message: 'Recipient, subject, and content are required' 
      });
    }

    const result = await sendBusinessInquiry(to, subject, content);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Business inquiry sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send business inquiry',
        error: result.error 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send business inquiry',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send sales email
router.post('/sales-email', authenticate, async (req, res) => {
  try {
    const { to, subject, content } = req.body;
    
    if (!to || !subject || !content) {
      return res.status(400).json({ 
        message: 'Recipient, subject, and content are required' 
      });
    }

    const result = await sendSalesEmail(to, subject, content);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Sales email sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send sales email',
        error: result.error 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send sales email',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send custom email (admin only)
router.post('/custom-email', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { to, subject, content, fromEmail } = req.body;
    
    if (!to || !subject || !content) {
      return res.status(400).json({ 
        message: 'Recipients, subject, and content are required' 
      });
    }

    const result = await sendEmail(to, subject, content, fromEmail);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Custom email sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send custom email',
        error: result.error 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send custom email',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
