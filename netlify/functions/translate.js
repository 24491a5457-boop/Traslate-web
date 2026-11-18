/**
 * Netlify Serverless Function: translate
 * Endpoint: /.netlify/functions/translate
 * 
 * Securely proxies translation requests to Google Cloud Translation API.
 * Never exposes API keys to client-side code.
 */

// Simple HTML entity decoder for Google Translate output
function decodeHTMLEntities(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler = async function(event, context) {
  // Handle HTTP OPTIONS for preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  // Enforce POST method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, 'Allow': 'POST' },
      body: JSON.stringify({
        error: 'Method Not Allowed. Please send a POST request.',
        code: 'METHOD_NOT_ALLOWED'
      })
    };
  }

  // Verify API Key presence
  const apiKey = process.env.GOOGLE_TRANSLATION_API_KEY;
  if (
    !apiKey ||
    apiKey.trim() === '' ||
    apiKey === 'undefined' ||
    apiKey === 'null' ||
    apiKey === 'your_google_cloud_translation_api_key_here'
  ) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Google Cloud Translation API key is not configured on the server.',
        details: 'The server environment is missing a valid GOOGLE_TRANSLATION_API_KEY. Please set this variable in your Netlify dashboard under Site Settings > Environment Variables, or in a local .env file.',
        code: 'MISSING_API_KEY'
      })
    };
  }

  // Parse and validate request body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (parseError) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Invalid JSON payload in request body.',
        code: 'INVALID_JSON'
      })
    };
  }

  const { text, targetLang, sourceLang } = body;

  // Validate text
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Please provide valid text to translate.',
        code: 'EMPTY_TEXT'
      })
    };
  }

  // Enforce reasonable character limit (5,000 characters)
  const MAX_CHAR_LIMIT = 5000;
  if (text.length > MAX_CHAR_LIMIT) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: `Text exceeds maximum allowed length of ${MAX_CHAR_LIMIT} characters. Currently: ${text.length} characters.`,
        code: 'TEXT_TOO_LONG'
      })
    };
  }

  // Validate target language
  if (!targetLang || typeof targetLang !== 'string' || targetLang.trim() === '') {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Target language code is required.',
        code: 'MISSING_TARGET_LANG'
      })
    };
  }

  const cleanTargetLang = targetLang.trim().toLowerCase();
  const cleanSourceLang = sourceLang && sourceLang.trim().toLowerCase() !== 'auto' ? sourceLang.trim().toLowerCase() : null;

  try {
    // Construct Google Cloud Translation API v2 URL
    const googleApiUrl = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey.trim())}`;

    const requestPayload = {
      q: text,
      target: cleanTargetLang,
      format: 'text'
    };

    if (cleanSourceLang) {
      requestPayload.source = cleanSourceLang;
    }

    // Call Google Cloud Translation API
    const response = await fetch(googleApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      const googleError = data.error || {};
      const errorMessage = googleError.message || 'Google Translation API request failed.';
      const errorCode = googleError.code || response.status;

      // Handle common Google Cloud API error scenarios
      let clientMessage = errorMessage;
      let statusCode = response.status >= 500 ? 502 : response.status;

      if (errorMessage.toLowerCase().includes('api key not valid') || errorMessage.toLowerCase().includes('bad request')) {
        clientMessage = 'The configured Google Translation API key is invalid or has expired. Please verify your credentials.';
        statusCode = 401;
      } else if (response.status === 429 || errorMessage.toLowerCase().includes('quota')) {
        clientMessage = 'Google Cloud Translation API quota exceeded. Please check your billing/quotas in Google Cloud Console.';
        statusCode = 429;
      } else if (errorMessage.toLowerCase().includes('invalid value') || errorMessage.toLowerCase().includes('source') || errorMessage.toLowerCase().includes('target')) {
        clientMessage = `Unsupported or invalid language code. Details: ${errorMessage}`;
        statusCode = 400;
      }

      return {
        statusCode: statusCode,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: clientMessage,
          code: 'GOOGLE_API_ERROR',
          upstreamStatus: errorCode,
          details: errorMessage
        })
      };
    }

    // Process successful translation response
    const translations = data?.data?.translations;
    if (!translations || translations.length === 0) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'No translation was returned from Google Translation API.',
          code: 'EMPTY_TRANSLATION_RESPONSE'
        })
      };
    }

    const firstResult = translations[0];
    const rawTranslated = firstResult.translatedText || '';
    const cleanTranslated = decodeHTMLEntities(rawTranslated);
    const detectedSourceLanguage = firstResult.detectedSourceLanguage || cleanSourceLang || 'en';

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        translatedText: cleanTranslated,
        detectedSourceLanguage: detectedSourceLanguage,
        sourceLang: cleanSourceLang || 'auto',
        targetLang: cleanTargetLang,
        characterCount: text.length
      })
    };

  } catch (networkError) {
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to communicate with Google Translation API. Please check your network connection.',
        code: 'NETWORK_ERROR',
        details: networkError.message || String(networkError)
      })
    };
  }
};
