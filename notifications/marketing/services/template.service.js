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

  const profileParts = [];
  if (contact.branch) {
    profileParts.push(contact.branch.trim());
  }
  if (contact.experience) {
    profileParts.push(contact.experience.trim());
  }
  const profileLabel = profileParts.length > 0 ? ` (${profileParts.join(', ')})` : '';

  const safeJobs = jobs.map((job) => {
    const ctaUrl = job.applyUrl || job.ctaUrl || buildDefaultApplyUrl(job.source, job.id);
    return {
      ...job,
      ctaUrl,
      createdAtLabel: formatDate(job.createdAt),
      remoteLabel: resolveRemoteLabel(job),
    };
  });

  const subject = `Your Latest Job Digest - Based on Your Profile${profileLabel}`;

  const jobItemsHtml = safeJobs
    .map(
      (job) => `
        <tr>
          <td style="padding: 16px 24px; border-bottom: 1px solid #e6e9ed;">
            <h3 style="margin: 0 0 8px; font-size: 18px; color: #1a1f36;">${escapeHtml(job.title)}</h3>
            <p style="margin: 0 0 4px; font-size: 14px; color: #4f566b;">
              <strong>${escapeHtml(job.companyName || 'Confidential')}</strong> • ${escapeHtml(job.location || 'Flexible location')} • ${escapeHtml(job.remoteLabel)}
            </p>
            <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280;">Posted: ${escapeHtml(job.createdAtLabel)}</p>
            <a href="${job.ctaUrl}" style="display: inline-block; padding: 10px 16px; background-color: #1d4ed8; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;" target="_blank" rel="noopener noreferrer">View & Apply</a>
          </td>
        </tr>
      `
    )
    .join('');

  const html = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f7fa; padding: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);">
            <tr>
              <td style="padding: 32px 40px; border-bottom: 1px solid #e6e9ed;">
                <p style="margin: 0 0 12px; font-size: 16px; color: #1a1f36;">Dear ${escapeHtml(contact.fullName)},</p>
                <p style="margin: 0; font-size: 16px; color: #1a1f36;">Based on your profile${profileLabel}, here are the top 3 opportunities we recommend for you:</p>
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${jobItemsHtml}</table>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 40px; border-top: 1px solid #e6e9ed;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #4f566b;">Need more options or wish to tailor your alerts further? Reply to this email and we’ll be glad to assist.</p>
                <p style="margin: 0; font-size: 14px; color: #4f566b;">Warm regards,<br/>${escapeHtml(mailFrom.name)} Team</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 40px; background-color: #f8fafc; font-size: 12px; color: #6b7280;">
                You are receiving this email because you subscribed to job updates on MyCareerBuild. If you wish to unsubscribe, simply reply with "Unsubscribe" from this address.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const text = [
    `Dear ${contact.fullName},`,
    '',
    `Based on your profile${profileLabel}, here are the top 3 opportunities we recommend for you:`,
    '',
    ...safeJobs.map((job, index) => {
      const applyUrl = job.ctaUrl;
      return [
        `${index + 1}. ${job.title} at ${job.companyName || 'Confidential'}`,
        `   Location: ${job.location || 'Flexible location'} • ${job.remoteLabel}`,
        `   Posted: ${job.createdAtLabel}`,
        `   Apply: ${applyUrl}`,
        '',
      ].join('\n');
    }),
    'Need more options or wish to tailor your alerts further? Reply to this email and we will be glad to assist.',
    '',
    `Warm regards,`,
    `${mailFrom.name} Team`,
    '',
    '---',
    'You are receiving this email because you subscribed to job updates on MyCareerBuild.',
    'To unsubscribe, reply with "Unsubscribe" from this address.',
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


