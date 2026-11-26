import { useLocalSearchParams } from 'expo-router';
import { JoinSectionRoute } from '../../features/onboarding/routes';

/** Screen 05 opened from another screen (with "Volver"); `code` comes from screen 22. */
export default function JoinSectionPushed() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <JoinSectionRoute pushed initialCode={typeof code === 'string' ? code : undefined} />;
}
