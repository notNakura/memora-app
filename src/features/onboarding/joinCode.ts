// Join codes (RNF-14): only the digits 2-9 and the letters without I and O. Section codes have 6 characters,
// institution codes 8 (screens 5 and 22). The server upper-cases and removes spaces too; the app does it
// while typing so the person sees exactly what is sent.
import { ApiError } from '../../services/api/client';
import type { JoinOutcome } from '../../services/api/onboarding';

export const SECTION_CODE_LENGTH = 6;
export const INSTITUTION_CODE_LENGTH = 8;

const CODE_ALPHABET = /^[2-9A-HJ-NP-Z]*$/;

export const CODE_ALPHABET_ERROR = 'El código solo usa los números del 2 al 9 y letras sin I ni O.';
export const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intenta de nuevo.';

/** Upper-cases and drops spaces, dashes and anything that is not a letter or digit. */
export function normalizeCode(text: string, maxLength: number): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, maxLength);
}

export function isValidCodeAlphabet(code: string): boolean {
  return CODE_ALPHABET.test(code);
}

/** Errors about the code itself, shown under the code field (contract "Code errors"). */
const CODE_ERRORS = new Set([
  'VALIDATION',
  'JOIN_CODE_NOT_FOUND',
  'JOIN_CODE_EXPIRED',
  'INSTITUTION_SUSPENDED',
  'SECTION_FULL',
  'TOO_MANY_ATTEMPTS',
]);

/** Splits an error into the message for the code field or for the general notice. */
export function joinErrorMessage(err: unknown): { code?: string; form?: string } {
  if (err instanceof ApiError) {
    const message = err.fields.code ?? err.message;
    return CODE_ERRORS.has(err.code) ? { code: message } : { form: err.message };
  }
  return { form: UNEXPECTED_ERROR };
}

export const SECTION_OUTCOME_MESSAGES: Record<JoinOutcome, string> = {
  active: '¡Listo! Ya estás en la sección.',
  pending: 'Tu solicitud quedó por confirmar. La institución la revisará.',
  already: 'Ya perteneces a esta sección.',
};

export const INSTITUTION_OUTCOME_MESSAGES: Record<JoinOutcome, string> = {
  active: 'Te uniste a la institución.',
  pending: 'Tu solicitud quedó por confirmar. La institución la revisará.',
  already: 'Ya perteneces a esta institución.',
};
