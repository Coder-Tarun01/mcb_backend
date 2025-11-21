import type { Request, Response } from 'express';
import axios from 'axios';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../models';

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  date?: number;
  from?: {
    id?: number;
    is_bot?: boolean;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  chat?: {
    id?: number;
    type?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    title?: string;
  };
  contact?: {
    phone_number?: string;
    first_name?: string;
    last_name?: string;
    user_id?: number;
  };
};

interface MatchResult {
  contactId: number;
  matchType: 'name' | 'mobile';
  fullName: string | null;
}

const normalizeWhitespace = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  return value.replace(/\s+/g, ' ').trim();
};

const normalizeMobile = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  const digits = value.replace(/\D/g, '');
  return digits;
};

const TELEGRAM_START_MESSAGE =
  'Please send your mobile number for job alerts';
const TELEGRAM_ACK_SUCCESS =
  'Thanks! Your Telegram chat is now linked. You will receive future job alerts here.';
const TELEGRAM_ACK_NOT_FOUND =
  "We couldn't match this chat to a subscriber. Please reply with your registered name or mobile number.";
const TELEGRAM_MOBILE_NOT_FOUND =
  'Mobile number not found. Please send your registered mobile number or name.';

const findContactByName = async (fullName: string): Promise<MatchResult | null> => {
  const normalized = normalizeWhitespace(fullName);
  if (!normalized) {
    return null;
  }

  const nameParts = normalized.toLowerCase().split(/\s+/).filter(Boolean);
  if (nameParts.length === 0) {
    return null;
  }

  // Try exact match first
  let rows = await sequelize.query<{
    id: number;
    full_name: string | null;
  }>(
    `
      SELECT id, full_name
      FROM marketing_contacts
      WHERE full_name IS NOT NULL
        AND LOWER(TRIM(full_name)) = LOWER(:fullName)
      ORDER BY created_at ASC
      LIMIT 1
    `,
    {
      replacements: { fullName: normalized },
      type: QueryTypes.SELECT,
    }
  );

  // Try partial match (first name only)
  if (rows.length === 0 && nameParts.length > 0) {
    const firstName = nameParts[0];
    rows = await sequelize.query<{
      id: number;
      full_name: string | null;
    }>(
      `
        SELECT id, full_name
        FROM marketing_contacts
        WHERE full_name IS NOT NULL
          AND LOWER(TRIM(SUBSTRING_INDEX(full_name, ' ', 1))) = LOWER(:firstName)
        ORDER BY created_at ASC
        LIMIT 1
      `,
      {
        replacements: { firstName },
        type: QueryTypes.SELECT,
      }
    );
  }

  // Try reverse order (last name first)
  if (rows.length === 0 && nameParts.length > 1) {
    const reversedName = [...nameParts].reverse().join(' ');
    rows = await sequelize.query<{
      id: number;
      full_name: string | null;
    }>(
      `
        SELECT id, full_name
        FROM marketing_contacts
        WHERE full_name IS NOT NULL
          AND LOWER(TRIM(full_name)) = LOWER(:reversedName)
        ORDER BY created_at ASC
        LIMIT 1
      `,
      {
        replacements: { reversedName },
        type: QueryTypes.SELECT,
      }
    );
  }

  // Try contains match (name contains the search term)
  if (rows.length === 0) {
    rows = await sequelize.query<{
      id: number;
      full_name: string | null;
    }>(
      `
        SELECT id, full_name
        FROM marketing_contacts
        WHERE full_name IS NOT NULL
          AND LOWER(full_name) LIKE LOWER(:searchPattern)
        ORDER BY created_at ASC
        LIMIT 1
      `,
      {
        replacements: { searchPattern: `%${normalized}%` },
        type: QueryTypes.SELECT,
      }
    );
  }

  if (rows.length === 0 || !rows[0]) {
    return null;
  }

  const contact = rows[0];
  return {
    contactId: contact.id,
    matchType: 'name',
    fullName: contact.full_name ?? null,
  };
};

const findContactByMobile = async (rawMobile?: string): Promise<MatchResult | null> => {
  const normalized = normalizeMobile(rawMobile);
  if (!normalized || normalized.length < 7) {
    console.log(`[Telegram] Mobile number too short or invalid: "${rawMobile}" -> "${normalized}"`);
    return null;
  }

  console.log(`[Telegram] Searching for mobile: "${normalized}" (from input: "${rawMobile}")`);

  // Try multiple matching strategies for better compatibility
  // Strategy 1: Direct match (for clean numbers like "9848151735")
  let rows = await sequelize.query<{
    id: number;
    full_name: string | null;
    mobile_no: string | null;
  }>(
    `
      SELECT id, full_name, mobile_no
      FROM marketing_contacts
      WHERE mobile_no IS NOT NULL
        AND mobile_no = :mobile
      ORDER BY created_at ASC
      LIMIT 1
    `,
    {
      replacements: { mobile: normalized },
      type: QueryTypes.SELECT,
    }
  );

  // Strategy 2: Normalized match (remove all non-digits from database value)
  if (rows.length === 0) {
    rows = await sequelize.query<{
      id: number;
      full_name: string | null;
      mobile_no: string | null;
    }>(
      `
        SELECT id, full_name, mobile_no
        FROM marketing_contacts
        WHERE mobile_no IS NOT NULL
          AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(mobile_no, '+', ''), '-', ''), ' ', ''), '(', ''), ')', ''), '.', ''), '/', '') = :mobile
        ORDER BY created_at ASC
        LIMIT 1
      `,
      {
        replacements: { mobile: normalized },
        type: QueryTypes.SELECT,
      }
    );
  }

  // Strategy 3: Try with leading zeros or country code variations
  if (rows.length === 0 && normalized.length >= 10) {
    // Try without leading country code (if it starts with country code like 91)
    if (normalized.startsWith('91') && normalized.length === 12) {
      const withoutCountryCode = normalized.substring(2);
      rows = await sequelize.query<{
        id: number;
        full_name: string | null;
        mobile_no: string | null;
      }>(
        `
          SELECT id, full_name, mobile_no
          FROM marketing_contacts
          WHERE mobile_no IS NOT NULL
            AND (mobile_no = :withCode OR mobile_no = :withoutCode)
          ORDER BY created_at ASC
          LIMIT 1
        `,
        {
          replacements: { withCode: normalized, withoutCode: withoutCountryCode },
          type: QueryTypes.SELECT,
        }
      );
    }
  }

  if (rows.length === 0) {
    console.log(`[Telegram] No contact found with mobile number: "${normalized}"`);
    return null;
  }

  if (!rows[0]) {
    console.log(`[Telegram] No contact found with mobile number: "${normalized}"`);
    return null;
  }

  const matchedContact = rows[0];
  console.log(`[Telegram] Mobile match found: contact_id=${matchedContact.id}, name="${matchedContact.full_name}", db_mobile="${matchedContact.mobile_no}"`);

  return {
    contactId: matchedContact.id,
    matchType: 'mobile',
    fullName: matchedContact.full_name ?? null,
  };
};

const sendTelegramAck = async (chatId: number, text: string): Promise<void> => {
  const botToken = process.env.MARKETING_TELEGRAM_BOT_TOKEN;
  if (!botToken || !chatId) {
    console.log(`[Telegram] Cannot send message: botToken=${!!botToken}, chatId=${chatId}`);
    return;
  }

  try {
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    });
    console.log(`[Telegram] Successfully sent message to chat_id: ${chatId}, message_id: ${response.data?.result?.message_id}`);
  } catch (error) {
    console.error(`[Telegram] Failed to send message to chat_id ${chatId}:`, error instanceof Error ? error.message : error);
  }
};

const extractMobileFromMessage = (message?: TelegramMessage): string | undefined => {
  if (!message) {
    return undefined;
  }

  if (message.contact?.phone_number) {
    return message.contact.phone_number;
  }

  if (message.text) {
    const digits = normalizeMobile(message.text);
    if (digits.length >= 7) {
      return digits;
    }
  }

  return undefined;
};

const extractNameCandidates = (message?: TelegramMessage): string[] => {
  if (!message) {
    return [];
  }

  const candidates = new Set<string>();

  const from = message.from;
  if (from) {
    const firstName = normalizeWhitespace(from.first_name);
    const lastName = normalizeWhitespace(from.last_name);

    if (firstName && lastName) {
      candidates.add(`${firstName} ${lastName}`);
    }
    if (firstName) {
      candidates.add(firstName);
    }
  }

  if (message.contact) {
    const firstName = normalizeWhitespace(message.contact.first_name);
    const lastName = normalizeWhitespace(message.contact.last_name);

    if (firstName && lastName) {
      candidates.add(`${firstName} ${lastName}`);
    }
    if (firstName) {
      candidates.add(firstName);
    }
  }

  return Array.from(candidates).filter(Boolean);
};

const isStartCommand = (text?: string): boolean => {
  if (!text) {
    return false;
  }
  const trimmed = text.trim().toLowerCase();
  return trimmed === '/start' || trimmed.startsWith('/start@');
};

const processUpdate = async (update: TelegramUpdate): Promise<{
  matched: boolean;
  matchType?: 'name' | 'mobile';
  contactId?: number;
  chatId?: number;
}> => {
  const message = update.message ?? update.edited_message;
  if (!message || !message.chat?.id) {
    console.log('[Telegram] No message or chat ID in update:', update.update_id);
    return { matched: false };
  }

  const chatId = message.chat.id;
  const messageText = message.text || '';
  const fromUser = message.from?.first_name || message.from?.username || 'Unknown';

  console.log(`[Telegram] Received message from ${fromUser} (chat_id: ${chatId}): "${messageText.substring(0, 50)}"`);

  // Handle /start command explicitly
  if (isStartCommand(messageText)) {
    console.log(`[Telegram] /start command received from chat_id: ${chatId}`);
    await sendTelegramAck(chatId, TELEGRAM_START_MESSAGE);
    return { matched: false, chatId };
  }

  const nameCandidates = extractNameCandidates(message);
  let match: MatchResult | null = null;

  // If message contains digits (looks like mobile number), try mobile matching first
  const mobileFromMessage = extractMobileFromMessage(message);
  if (mobileFromMessage) {
    console.log(`[Telegram] Attempting mobile match for chat_id: ${chatId}, mobile: ${mobileFromMessage.substring(0, 4)}****`);
    match = await findContactByMobile(mobileFromMessage);
    if (match) {
      console.log(`[Telegram] Mobile match found: contact_id=${match.contactId}, name="${match.fullName}"`);
    } else {
      console.log(`[Telegram] Mobile match failed for chat_id: ${chatId}`);
    }
  }

  // If mobile match failed, try name matching
  if (!match && nameCandidates.length > 0) {
    console.log(`[Telegram] Attempting name match for chat_id: ${chatId}, candidates: ${nameCandidates.join(', ')}`);
    for (const candidate of nameCandidates) {
      match = await findContactByName(candidate);
      if (match) {
        console.log(`[Telegram] Name match found: contact_id=${match.contactId}, name="${match.fullName}", matched_with="${candidate}"`);
        break;
      }
    }
    if (!match) {
      console.log(`[Telegram] Name match failed for chat_id: ${chatId}`);
    }
  }

  // If still no match, try extracting mobile from text if not already tried
  if (!match && !mobileFromMessage && messageText) {
    const digits = normalizeMobile(messageText);
    if (digits.length >= 7) {
      console.log(`[Telegram] Attempting mobile match from text for chat_id: ${chatId}`);
      match = await findContactByMobile(digits);
      if (match) {
        console.log(`[Telegram] Mobile match from text found: contact_id=${match.contactId}, name="${match.fullName}"`);
      }
    }
  }

  if (!match) {
    console.log(`[Telegram] No match found for chat_id: ${chatId}`);
    await sendTelegramAck(chatId, TELEGRAM_ACK_NOT_FOUND);
    return { matched: false, chatId };
  }

  // Use transaction to ensure data consistency
  try {
    await sequelize.transaction(async (transaction) => {
      // First, verify the contact exists
      const verifyContact = await sequelize.query<{
        id: number;
        telegram_chat_id: string | null;
      }>(
        `
          SELECT id, telegram_chat_id
          FROM marketing_contacts
          WHERE id = :contactId
        `,
        {
          replacements: { contactId: match.contactId },
          type: QueryTypes.SELECT,
          transaction,
        }
      );

      if (verifyContact.length === 0 || !verifyContact[0]) {
        throw new Error(`Contact with id=${match.contactId} not found in database`);
      }

      const contact = verifyContact[0];
      console.log(`[Telegram] Contact found: id=${match.contactId}, current_chat_id=${contact.telegram_chat_id || 'null'}`);

      // Update the telegram_chat_id
      const updateResult = await sequelize.query(
        `
          UPDATE marketing_contacts
          SET telegram_chat_id = :chatId
          WHERE id = :contactId
        `,
        {
          replacements: {
            chatId: String(chatId),
            contactId: match.contactId,
          },
          type: QueryTypes.UPDATE,
          transaction,
        }
      );

      // Handle different database response formats
      // MySQL returns [metadata, affectedRows] where metadata is empty array
      // PostgreSQL returns [result, metadata]
      let affectedRows = 0;
      if (Array.isArray(updateResult)) {
        // For MySQL: [metadata[], affectedRows]
        // For PostgreSQL: [result, metadata]
        if (updateResult.length >= 2 && typeof updateResult[1] === 'number') {
          // MySQL format: second element is affectedRows
          affectedRows = updateResult[1];
        } else if (updateResult.length > 0) {
          const result = updateResult[0];
          if (typeof result === 'number') {
            affectedRows = result;
          } else if (result && typeof result === 'object') {
            affectedRows = (result as any).affectedRows || (result as any).rowCount || 0;
          }
        }
      }

      console.log(`[Telegram] UPDATE query executed for contact_id=${match.contactId}, affected_rows=${affectedRows}, result:`, JSON.stringify(updateResult));

      // Verify the update by reading back the value
      const verifyRows = await sequelize.query<{
        telegram_chat_id: string | null;
      }>(
        `
          SELECT telegram_chat_id
          FROM marketing_contacts
          WHERE id = :contactId
        `,
        {
          replacements: { contactId: match.contactId },
          type: QueryTypes.SELECT,
          transaction,
        }
      );

      if (verifyRows.length === 0 || !verifyRows[0]) {
        throw new Error(`Contact with id=${match.contactId} not found during verification`);
      }

      const verifyRow = verifyRows[0];
      const storedChatId = verifyRow.telegram_chat_id;
      console.log(`[Telegram] Verification: stored_chat_id=${storedChatId}, expected=${chatId}`);

      if (storedChatId !== String(chatId)) {
        // If affectedRows is 0 but the value matches, it might already be set (that's okay)
        if (storedChatId === String(chatId) && affectedRows === 0) {
          console.log(`[Telegram] Chat ID already set to ${chatId}, no update needed`);
        } else {
          throw new Error(`Chat ID mismatch: expected ${chatId}, got ${storedChatId}`);
        }
      }

      console.log(`[Telegram] Successfully stored chat_id=${chatId} for contact_id=${match.contactId}, verified in database`);
    });

    await sendTelegramAck(chatId, TELEGRAM_ACK_SUCCESS);
    console.log(`[Telegram] Success message sent to chat_id: ${chatId}`);

    return { matched: true, matchType: match.matchType, contactId: match.contactId, chatId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[Telegram] Error storing chat_id for contact_id=${match.contactId}, chat_id=${chatId}:`, errorMessage);
    if (errorStack) {
      console.error(`[Telegram] Error stack:`, errorStack);
    }
    await sendTelegramAck(chatId, 'An error occurred while linking your account. Please try again later.');
    return { matched: false, chatId };
  }
};

export const handleTelegramWebhook = async (req: Request, res: Response) => {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const providedSecret = typeof req.query.secret === 'string' ? req.query.secret : undefined;

  if (expectedSecret && expectedSecret !== providedSecret) {
    console.log('[Telegram] Webhook request rejected: invalid secret');
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  try {
    const body = req.body as TelegramUpdate | TelegramUpdate[] | undefined;
    if (!body) {
      console.log('[Telegram] Webhook received with empty body');
      res.json({ ok: true, processed: [] });
      return;
    }

    const updates: TelegramUpdate[] = Array.isArray(body)
      ? body
      : Array.isArray((body as any).result)
      ? (body as any).result
      : [body];

    console.log(`[Telegram] Processing ${updates.length} update(s)`);

    const results = [];
    for (const update of updates) {
      try {
        const outcome = await processUpdate(update);
        results.push({
          updateId: update.update_id,
          matched: outcome.matched,
          matchType: outcome.matchType,
          contactId: outcome.contactId,
          chatId: outcome.chatId,
        });
        console.log(`[Telegram] Processed update_id=${update.update_id}, matched=${outcome.matched}`);
      } catch (updateError) {
        console.error(`[Telegram] Error processing update_id=${update.update_id}:`, updateError);
        results.push({
          updateId: update.update_id,
          matched: false,
          error: updateError instanceof Error ? updateError.message : 'Unknown error',
        });
      }
    }

    console.log(`[Telegram] Webhook processing complete: ${results.length} result(s)`);
    res.json({ ok: true, processed: results });
  } catch (error) {
    console.error('[Telegram] Failed to process Telegram webhook:', error);
    res.status(500).json({ ok: false, error: 'Failed to process Telegram update' });
  }
};


