// "Soy estudiante / Soy profesor" from step 1 (RF-01), or "institution" when the person followed
// "¿Coordinas una universidad o un curso? Regístralo" (screen 33 comes after the guide). It never creates a membership: it is kept only on
// this phone to decide the next screen, and is cleared once the user has an active membership.
import { secureItem } from './secureItem';

export type SignupChoice = 'student' | 'teacher' | 'institution';

const CHOICES: readonly string[] = ['student', 'teacher', 'institution'];

export type SignupChoiceStore = {
  get(): Promise<SignupChoice | null>;
  set(choice: SignupChoice): Promise<void>;
  clear(): Promise<void>;
};

const item = secureItem('memora.signupChoice');

export const signupChoiceStore: SignupChoiceStore = {
  get: async () => {
    const value = await item.get();
    return value !== null && CHOICES.includes(value) ? (value as SignupChoice) : null;
  },
  set: (choice) => item.set(choice),
  clear: () => item.clear(),
};
