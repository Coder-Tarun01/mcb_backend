const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');

const templatePath = path.resolve(__dirname, 'templates', 'fresher-jobs-template.hbs');
let compiledTemplate;
let transporter;

function getTemplate() {
  if (compiledTemplate) {
    return compiledTemplate;
  }
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  compiledTemplate = Handlebars.compile(templateSource);
  return compiledTemplate;
}

function resolveBoolean(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).toLowerCase();
  return normalized === 'true' || normalized === '1';
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const port = Number(process.env.EMAIL_PORT || 587);
  const secure = resolveBoolean(process.env.EMAIL_SECURE, port === 465);

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporter;
}

async function verifyEmailTransport() {
  const tx = getTransporter();
  await tx.verify();
}

async function sendFresherJobsEmail(user, jobs, options = {}) {
  if (!user || !user.email) {
    throw new Error('Invalid user email payload supplied');
  }
  if (!Array.isArray(jobs) || jobs.length === 0) {
    throw new Error('At least one job must be supplied to send fresher notifications');
  }

  const template = getTemplate();
  const html = template({
    name: user.name || 'Professional',
    jobs,
    logoUrl: process.env.MCB_LOGO_URL || 'https://mycareerbuild.com/logo.png',
    unsubscribeUrl: process.env.UNSUBSCRIBE_URL || 'https://mycareerbuild.com/unsubscribe',
    year: new Date().getFullYear(),
  });

  const mailOptions = {
    to: user.email,
    from: {
      address: process.env.FROM_EMAIL || process.env.EMAIL_USER,
      name: process.env.FROM_NAME || 'MyCareerBuild',
    },
    subject:
      options.subject || `Fresh Opportunities: ${jobs.length} New Fresher ${jobs.length === 1 ? 'Job' : 'Jobs'} Await`,
    html,
  };

  const tx = getTransporter();
  const response = await tx.sendMail(mailOptions);
  return response;
}

module.exports = {
  sendFresherJobsEmail,
  verifyEmailTransport,
};

