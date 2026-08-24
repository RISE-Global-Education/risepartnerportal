// Mentor rates: up to 3 digits (1-999) + a 3-letter currency code, e.g. "90 USD" or "125 USD".
export const MENTOR_RATE_PATTERN = /^\d{1,3} [A-Z]{3}$/;
export const MENTOR_RATE_HINT = 'Rate must be up to 3 digits followed by a 3-letter currency code, e.g. "125 USD".';

// Writing coach rates: up to 4 digits (1-9999) + a 3-letter currency code, e.g. "900 INR" or "1200 INR".
export const WC_RATE_PATTERN = /^\d{1,4} [A-Z]{3}$/;
export const WC_RATE_HINT = 'Rate must be up to 4 digits followed by a 3-letter currency code, e.g. "1200 INR".';
