// Client-side checks so people see mistakes before reaching the server. The server repeats them.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors = Partial<Record<string, string>>;

export function validateAccess(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = 'Escribe tu correo.';
  else if (!EMAIL.test(email.trim())) errors.email = 'Escribe un correo válido.';
  if (!password) errors.password = 'Escribe tu contraseña.';
  else if (password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  return errors;
}

export function validatePersonalData(data: { nationalId: string; firstNames: string; lastNames: string }) {
  const errors: FieldErrors = {};
  const id = data.nationalId.toUpperCase().replace(/[\s.]/g, '');
  if (!id) errors.nationalId = 'Escribe tu cédula.';
  else if (!/^[VE]-?\d{6,8}$/.test(id)) errors.nationalId = 'Escribe la cédula como V-20.000.001 o E-80.000.001.';
  if (!data.firstNames.trim()) errors.firstNames = 'Escribe tus nombres.';
  if (!data.lastNames.trim()) errors.lastNames = 'Escribe tus apellidos.';
  return errors;
}
