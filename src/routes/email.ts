import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  sendEmail,
  sendAdminNotification,
  sendSupportResponse,
  sendBusinessInquiry,
  sendSalesEmail,
  verifyEmailConnection,
  EMAIL_ADDRESSES
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

// Public contact form endpoint (no authentication required)
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message, inquiryType } = req.body;
    
    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, subject, and message are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email format' 
      });
    }

    // Format email content for admin notification
    const inquiryTypeLabel = inquiryType 
      ? inquiryType.charAt(0).toUpperCase() + inquiryType.slice(1).replace(/-/g, ' ')
      : 'General';
    
    const adminEmailContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Inquiry Type:</strong> ${inquiryTypeLabel}</p>
      <p><strong>From:</strong> ${name} (${email})</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
      <h3>Message:</h3>
      <p style="white-space: pre-wrap;">${message}</p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 14px;">
        This message was sent from the MyCareerBuild contact form.
      </p>
    `;

    // Format confirmation email content for the user
    const confirmationEmailContent = `
      <h2>Thank You for Contacting Us!</h2>
      <p>Dear ${name},</p>
      <p>We have successfully received your message and appreciate you taking the time to reach out to us.</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Your Inquiry:</strong> ${inquiryTypeLabel}</p>
        <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
        <p style="margin: 5px 0;"><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
      </div>
      
      <p>Our team will review your message and get back to you as soon as possible, typically within 24 hours during business days.</p>
      
      <p>If you have any urgent questions or concerns, please feel free to contact us directly at:</p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Email: <a href="mailto:${EMAIL_ADDRESSES.SUPPORT}">${EMAIL_ADDRESSES.SUPPORT}</a></li>
        <li>Email: <a href="mailto:${EMAIL_ADDRESSES.INFO}">${EMAIL_ADDRESSES.INFO}</a></li>
      </ul>
      
      <p>Thank you for choosing MyCareerBuild!</p>
      <p>Best regards,<br>The MyCareerBuild Team</p>
    `;

    // Send notification email to info@mycareerbuild.com
    const adminResult = await sendEmail(
      EMAIL_ADDRESSES.INFO,
      `Contact Form: ${subject}`,
      adminEmailContent,
      EMAIL_ADDRESSES.INFO
    );

    // Send confirmation email to the user
    const confirmationResult = await sendEmail(
      email,
      `We've Received Your Message - ${subject}`,
      confirmationEmailContent,
      EMAIL_ADDRESSES.INFO
    );
    
    // Consider it successful if at least the admin notification was sent
    // (confirmation email failure shouldn't block the response)
    if (adminResult.success) {
      // Log if confirmation email failed (but don't fail the request)
      if (!confirmationResult.success) {
        console.warn('⚠️ Failed to send confirmation email to user:', confirmationResult.error);
      }
      
      res.json({ 
        success: true, 
        message: 'Your message has been sent successfully. Please check your email for a confirmation.',
        messageId: adminResult.messageId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send your message. Please try again later.',
        error: adminResult.error 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send your message. Please try again later.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
