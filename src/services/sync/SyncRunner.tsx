// Mounted once in the signed-in area: keeps the local copy in sync (docs/07_sincronizacion.md) and shows the
// notices a sync brings back (an institution suspended or a membership removed).
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Notice } from '../../components/Notice';
import { useSession } from '../../features/auth/session';
import { onSyncFinished } from './syncNow';
import { useAutoSync } from './useAutoSync';

export function SyncRunner() {
  const { user, withAccess } = useSession();
  useAutoSync({ userId: user?.id ?? null, call: withAccess });

  const [notices, setNotices] = useState<string[]>([]);
  useEffect(
    () =>
      onSyncFinished((outcome) => {
        if (outcome.notices.length > 0) setNotices(outcome.notices);
      }),
    [],
  );

  if (notices.length === 0) return null;
  return (
    <View style={styles.box}>
      {notices.map((message) => (
        <Notice key={message} message={message} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ box: { gap: 8, paddingHorizontal: 16, paddingTop: 8 } });
