const { buildDefaultApplyUrl } = require('../repositories/jobs.repository');

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return 'Recently posted';
  }

  try {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

function buildDigestTemplate({ contact, jobs, mailFrom }) {
  if (!contact || !Array.isArray(jobs)) {
    throw new Error('Contact and jobs are required to build digest template');
  }

  const safeJobs = jobs.map((job) => {
    const ctaUrl = job.ctaUrl || buildDefaultApplyUrl(job.source, job.id);
    return {
      ...job,
      ctaUrl,
      createdAtLabel: formatDate(job.createdAt),
      remoteLabel: resolveRemoteLabel(job),
    };
  });

  const subject = `New role at ${safeJobs.length > 0 ? safeJobs[0].companyName || 'top companies' : 'MyCareerBuild'}: ${
    safeJobs.length > 0 ? safeJobs[0].title : 'Fresh opportunities'
  } (MyCareerBuild)`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
      <p>Hi ${escapeHtml(contact.fullName)},</p>
      <p>Here are the latest opportunities curated for you from MyCareerBuild:</p>
      <ol>
        ${safeJobs
          .map(
            (job) => `
              <li style="margin-bottom: 12px;">
                <strong>${escapeHtml(job.title)}</strong> at <strong>${escapeHtml(job.companyName || 'Confidential')}</strong><br/>
                <span>${escapeHtml(job.location || 'Location flexible')}</span> • <span>${escapeHtml(job.remoteLabel)}</span><br/>
                <span>Posted: ${escapeHtml(job.createdAtLabel)}</span><br/>
                <a href="${job.ctaUrl}" style="color: #0052cc; text-decoration: underline;" target="_blank" rel="noopener noreferrer">View role & apply</a>
              </li>
            `
          )
          .join('')}
      </ol>
      <p>We’ll keep sending you tailored opportunities. Prefer fewer emails or want to pause updates? Just reply with <strong>“Unsubscribe”</strong> and we’ll take care of it.</p>
      <p>Best regards,<br/>${escapeHtml(mailFrom.name)} Team</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 12px; color: #666;">
        You’re receiving this email because you opted in for marketing updates with MyCareerBuild.<br/>
        To unsubscribe, reply with “Unsubscribe” from this address.
      </p>
    </div>
  `;

  const text = [
    `Hi ${contact.fullName},`,
    '',
    'Here are the latest opportunities curated for you from MyCareerBuild:',
    '',
    ...safeJobs.map(
      (job, index) =>
        `${index + 1}. ${job.title} at ${job.companyName || 'Confidential'}\n` +
        `   Location: ${job.location || 'Location flexible'} • ${job.remoteLabel}\n` +
        `   Posted: ${job.createdAtLabel}\n` +
        `   Apply: ${job.ctaUrl}`
    ),
    '',
    'Prefer fewer emails or want to pause updates? Reply with "Unsubscribe" and we’ll handle it.',
    '',
    `Best regards,\n${mailFrom.name} Team`,
    '',
    '---',
    'You’re receiving this email because you opted in for marketing updates with MyCareerBuild.',
    'To unsubscribe, reply with “Unsubscribe” from this address.',
  ].join('\n');

  return {
    subject,
    html,
    text,
  };
}

function resolveRemoteLabel(job) {
  if (job.isRemote === true) {
    return 'Remote';
  }
  if (job.isRemote === false) {
    return 'On-site';
  }
  if (job.locationType) {
    return job.locationType;
  }
  return 'Hybrid / Flexible';
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  buildDigestTemplate,
  formatDate,
  resolveRemoteLabel,
  escapeHtml,
};


