/**
 * Centralized error handling utility for admin components
 * Provides consistent error handling for 401/403 responses and user-friendly error messages
 */

export interface ErrorResponse {
  error?: string;
  message?: string;
  details?: string;
}

/**
 * Handle API error responses consistently
 * @param response - Fetch API response
 * @param defaultMessage - Default error message if no message is provided
 * @returns ErrorResponse object or null if no error
 */
export async function handleApiError(
  response: Response,
  defaultMessage: string = 'An error occurred'
): Promise<ErrorResponse | null> {
  if (response.ok) {
    return null;
  }

  try {
    const error = await response.json();
    return {
      error: error.error || 'Unknown error',
      message: error.message || error.error || defaultMessage,
      details: error.details || error.message,
    };
  } catch {
    // If response is not JSON, return a generic error
    return {
      error: 'Request failed',
      message: defaultMessage,
      details: `HTTP ${response.status}: ${response.statusText}`,
    };
  }
}

/**
 * Check if error is an authentication error (401 or 403)
 * @param response - Fetch API response
 * @returns true if authentication error
 */
export function isAuthError(response: Response): boolean {
  return response.status === 401 || response.status === 403;
}

/**
 * Handle authentication errors by redirecting to login
 * @param error - Error response object
 * @param customMessage - Custom message to show before redirect
 */
export function handleAuthError(
  error: ErrorResponse | null,
  customMessage?: string
): void {
  const message = customMessage || error?.message || 'Session expired. Please log out and log in again, then try this action.';
  alert(message);
  window.location.href = '/login';
}

/**
 * Unified error handler for fetch responses
 * Checks for auth errors first, then handles other errors
 * @param response - Fetch API response
 * @param defaultMessage - Default error message
 * @returns true if error was handled (auth error), false otherwise
 */
export async function handleFetchError(
  response: Response,
  defaultMessage: string = 'An error occurred'
): Promise<boolean> {
  if (response.ok) {
    return false;
  }

  const error = await handleApiError(response, defaultMessage);

  // Handle authentication errors
  if (isAuthError(response)) {
    handleAuthError(error);
    return true; // Error was handled (redirected)
  }

  // For other errors, show alert but don't redirect
  if (error) {
    alert(error.message || error.error || defaultMessage);
  }

  return false; // Error was shown but not handled (redirected)
}

