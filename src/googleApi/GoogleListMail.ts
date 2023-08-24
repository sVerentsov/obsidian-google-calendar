import type { GoogleMessageRaw, GoogleMessage } from '../helper/types';
import { settingsAreCompleteAndLoggedIn } from '../view/GoogleCalendarSettingTab';
import { GoogleApiError } from './GoogleApiError';
import { callRequest } from 'src/helper/RequestWrapper';

export async function googleListMail(
	inboxId: number | undefined
): Promise<GoogleMessage[]> {
	console.log('List mail');
	if (!settingsAreCompleteAndLoggedIn()) {
		throw new GoogleApiError('Not logged in', null, 401, {
			error: 'Not logged in',
		});
	}
	let url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?';
	url += 'labelIds=INBOX';
	const apiResponse = await callRequest(url, 'GET', null);
	const messageIds: string[] = apiResponse.messages.map((msg) => msg.id);
	const messages = await Promise.all(messageIds.map((id) => getMessage(id)));
	const processedMessages = messages.map((message) =>
		processRawMessage(message, inboxId)
	);
	console.log(processedMessages);
	return processedMessages;
}

async function getMessage(messageId: string): Promise<GoogleMessageRaw> {
	const apiResponse = await callRequest(
		`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
		'GET',
		null
	);
	return apiResponse;
}

function processRawMessage(
	rawMessage: GoogleMessageRaw,
	inboxId: number | undefined
): GoogleMessage {
	if (!inboxId) {
		inboxId = 0;
	}
	return {
		url: `https://mail.google.com/mail/u/${inboxId}/#inbox/${rawMessage.id}`,
		from: parseFromHeader(
			rawMessage.payload.headers.filter((header) => header.name === 'From')[0]
				.value
		),
		subject: rawMessage.payload.headers.filter(
			(header) => header.name === 'Subject'
		)[0].value,
	};
}

function parseFromHeader(headerValue: string) {
	const pat = /(?:"([^"]+)")? ?<?(.*?@[^>,]+)>?,? ?/g;
	const match = pat.exec(headerValue);
	return match[1] || match[2];
}
