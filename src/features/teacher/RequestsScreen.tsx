// Pantalla 27 · Solicitudes de ingreso (RF-64, RF-66, CU-37 steps 7-8): people who used the code and wait
// for confirmation, marked "Cédula en la lista" or "No está en la lista", approved or rejected one by one or
// in bulk. The server notifies each person and records each decision.
// Visual reference: design/pantallas_png/27_Solicitudes_de_ingreso.png
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button3D } from '../../components/Button3D';
import { Notice } from '../../components/Notice';
import { TextLink } from '../../components/TextLink';
import type { JoinRequest, RequestsSummary } from '../../services/api/teacher';
import { colors, fonts, radius, sizes } from '../../theme';
import { EmptyState, LoadGate, TeacherFrame, teacherStyles as t, useLoad } from './parts';
import type { TeacherClient } from './teacherClient';
import { errorMessage, formatNationalId, joinModeLabel, plural } from './texts';

type Props = { client: TeacherClient; sectionId: number; onBack: () => void };

/** Rows shown before "Ver las N restantes" (mockup 27). */
const FIRST_ROWS = 4;

/** Mockup 27 sentence after the big number. */
export function summaryText(s: RequestsSummary): string {
  const parts: string[] = [];
  if (s.onRoster > 0) {
    parts.push(
      s.onRoster === 1
        ? '1 tiene la cédula en la lista pero usó otro correo'
        : `${s.onRoster} tienen la cédula en la lista pero usaron otro correo`,
    );
  }
  if (s.notOnRoster > 0) parts.push(s.notOnRoster === 1 ? '1 no está en la lista' : `${s.notOnRoster} no están en la lista`);
  const others =
    s.active === 0 ? '' : s.active === 1 ? ' Otro 1 entró solo al verificar su correo.' : ` Otros ${s.active} entraron solos al verificar su correo.`;
  return `${s.pending === 1 ? 'solicitud' : 'solicitudes'}: ${parts.join(' y ')}.${others}`;
}

export function RequestsScreen({ client, sectionId, onBack }: Props) {
  const { state, reload } = useLoad(() => client.requests(sectionId));
  const [selected, setSelected] = useState<number[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = state.status === 'ready' ? state.data : null;

  const decide = async (decision: 'approve' | 'reject', ids: number[]) => {
    if (ids.length === 0 || busy) return;
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      const n = await client.decide(sectionId, decision, ids);
      setSelected([]);
      await reload();
      setInfo(`${decision === 'approve' ? 'Aprobaste' : 'Rechazaste'} ${plural(n, 'solicitud', 'solicitudes')}.`);
    } catch (err) {
      setError(errorMessage(err));
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: number) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <TeacherFrame
      title="Por confirmar"
      subtitle={
        ready ? `${ready.section.subjectCode} · ${ready.section.sectionName} · modo ${joinModeLabel(ready.section.joinMode)}` : undefined
      }
      onBack={onBack}
    >
      <LoadGate state={state} onRetry={reload}>
        {({ summary, requests }) => {
          const feedback = (
            <>
              {info ? <Notice message={info} /> : null}
              {error ? <Notice tone="error" message={error} /> : null}
            </>
          );
          if (requests.length === 0) {
            return (
              <>
                {feedback}
                <EmptyState
                  title="No hay solicitudes por confirmar"
                  message="Cuando alguien use el código y quede por confirmar, aparecerá aquí."
                />
              </>
            );
          }
          const onList = requests.filter((r) => r.onRoster).map((r) => r.studentId);
          const others = requests.filter((r) => !r.onRoster).map((r) => r.studentId);
          const shown = showAll ? requests : requests.slice(0, FIRST_ROWS);
          return (
            <>
              <View style={styles.summary}>
                <Text style={styles.bigNumber}>{summary.pending}</Text>
                <Text style={[t.onDark, t.grow]}>{summaryText(summary)}</Text>
              </View>
              <View style={styles.bulk}>
                {onList.length > 0 ? (
                  <Button3D label="Aprobar los de la lista" size="secondary" tone="amber" disabled={busy} onPress={() => decide('approve', onList)} />
                ) : null}
                {others.length > 0 ? (
                  <Button3D label="Rechazar los demás" size="secondary" tone="dark" disabled={busy} onPress={() => decide('reject', others)} />
                ) : null}
              </View>
              {feedback}
              {shown.map((r) => (
                <RequestRow key={r.studentId} request={r} selected={selected.includes(r.studentId)} onToggle={() => toggle(r.studentId)} />
              ))}
              {!showAll && requests.length > FIRST_ROWS ? (
                <TextLink
                  label={`Ver las ${requests.length - FIRST_ROWS} restantes`}
                  tone="primary"
                  onPress={() => setShowAll(true)}
                  style={styles.center}
                />
              ) : null}
              {selected.length > 0 ? (
                <>
                  <Button3D label={`Aprobar seleccionados (${selected.length})`} tone="amber" disabled={busy} onPress={() => decide('approve', selected)} />
                  <Button3D label={`Rechazar seleccionados (${selected.length})`} tone="dark" disabled={busy} onPress={() => decide('reject', selected)} />
                </>
              ) : null}
            </>
          );
        }}
      </LoadGate>
    </TeacherFrame>
  );
}

function RequestRow({ request, selected, onToggle }: { request: JoinRequest; selected: boolean; onToggle: () => void }) {
  const tag = request.onRoster ? 'Cédula en la lista' : 'No está en la lista';
  const detail = [formatNationalId(request.nationalId), request.email].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${request.name}. ${detail}. ${tag}`}
      onPress={onToggle}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <View style={[styles.box, selected && styles.boxOn]}>{selected ? <Text style={styles.check}>✓</Text> : null}</View>
      <View style={t.grow}>
        <Text style={[styles.name, selected && styles.onLight]}>{request.name}</Text>
        <Text style={[t.onDarkSecondary, selected && styles.onLight]}>{detail}</Text>
        <Text style={[styles.tag, request.onRoster ? styles.tagOnList : styles.tagOff]}>{tag}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bigNumber: { fontFamily: fonts.display, fontSize: 56, color: colors.amber },
  bulk: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  center: { alignSelf: 'center' },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    minHeight: sizes.minTouch,
    padding: 14,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceEdge,
  },
  rowSelected: { backgroundColor: colors.cream, borderColor: colors.amber },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  boxOn: { borderColor: colors.textOnLight, backgroundColor: colors.amber },
  check: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textOnLight },
  name: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.textOnDark },
  onLight: { color: colors.textOnLight },
  tag: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, fontFamily: fonts.bodySemi, fontSize: 12 },
  tagOnList: { backgroundColor: colors.mint, color: colors.textOnLight },
  tagOff: { backgroundColor: colors.lilac, color: colors.textOnLight },
});
