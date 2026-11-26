// Pantalla 28 · Desempeño del estudiante (RF-38, RF-46, CU-23): mastery per unit, last review, plan,
// streak, recent activity, assessments and most failed cards of one student of the teacher's section, from the
// card_state / review_log already synced. Birth date and sex are never shown (RNF-12).
// "Desbloquear unidad" works (RF-46); "Dar tiempo extra" waits for the assessments.
// Visual reference: design/pantallas_png/28_Desempeno_del_estudiante.png
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button3D } from '../../components/Button3D';
import { Card3D } from '../../components/Card3D';
import { TextField } from '../../components/form/TextField';
import { Notice } from '../../components/Notice';
import { OptionRow } from '../../components/OptionRow';
import type { StudentPerformance } from '../../services/api/teacher';
import { colors, fonts, radius } from '../../theme';
import { Bar, LoadGate, SectionTitle, TeacherFrame, teacherStyles as t, useLoad } from './parts';
import type { TeacherClient } from './teacherClient';
import { daysAgoText, errorMessage, formatNationalId, percentLabel, percentText, plural } from './texts';

type Props = { client: TeacherClient; sectionId: number; studentId: number; onBack: () => void };

const EXTRA_TIME_PENDING = 'Dar tiempo extra estará disponible pronto, con las evaluaciones.';

function subtitleOf(p: StudentPerformance) {
  const parts = [p.student.nationalId ? `C.I. ${formatNationalId(p.student.nationalId)}` : null];
  if (p.student.extendedTime) parts.push('tiempo extendido activo');
  return parts.filter(Boolean).join(' · ') || undefined;
}

export function StudentScreen({ client, sectionId, studentId, onBack }: Props) {
  const { state, reload } = useLoad(() => client.student(sectionId, studentId));
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ unit?: string; reason?: string }>({});
  const [busy, setBusy] = useState(false);
  const ready = state.status === 'ready' ? state.data : null;

  const confirmUnlock = async (p: StudentPerformance) => {
    const errors = {
      unit: unitId === null ? 'Elige una unidad.' : undefined,
      reason: reason.trim() === '' ? 'Escribe la justificación.' : undefined,
    };
    setFieldErrors(errors);
    if (errors.unit || errors.reason || unitId === null) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await client.unlockUnit(sectionId, studentId, unitId, reason.trim());
      const unit = p.units.find((u) => u.unitId === unitId);
      setUnlocking(false);
      setUnitId(null);
      setReason('');
      await reload();
      setInfo(`Desbloqueaste la Unidad ${unit?.number ?? ''}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TeacherFrame title={ready ? ready.student.name : 'Estudiante'} subtitle={ready ? subtitleOf(ready) : undefined} onBack={onBack}>
      <LoadGate state={state} onRetry={reload}>
        {(p) => {
          const totalReviews = p.activity.reduce((n, d) => n + d.reviews, 0);
          const maxReviews = Math.max(1, ...p.activity.map((d) => d.reviews));
          const locked = p.units.filter((u) => !u.unlocked);
          return (
            <>
              <Card3D>
                <View style={t.cardBody}>
                  <View style={t.row}>
                    <Text style={[t.onLightStrong, t.grow]}>Dominio general</Text>
                    {p.overall === null ? null : <Text style={styles.overall}>{percentText(p.overall)}</Text>}
                  </View>
                  {p.overall === null ? <Text style={t.onLightSecondary}>Aún no ha repasado</Text> : null}
                  {p.units.map((u) => {
                    const name = `Unidad ${u.number} · ${u.name}`;
                    return (
                      <View key={u.unitId} style={styles.unit} accessible accessibilityLabel={`${name}: ${percentLabel(u.mastery)}`}>
                        <View style={t.row}>
                          <Text style={[t.onLight, t.grow]}>{name}</Text>
                          {u.unlocked ? <Text style={styles.tag}>Desbloqueada</Text> : null}
                          <Text style={t.percent}>{percentText(u.mastery)}</Text>
                        </View>
                        <Bar value={u.mastery} tone={u.mastery !== null && u.mastery < 50 ? 'amber' : 'teal'} />
                      </View>
                    );
                  })}
                </View>
              </Card3D>

              <Card3D tone="dark">
                <View style={t.cardBody}>
                  <Fact label="Último repaso" value={daysAgoText(p.daysSinceReview)} />
                  <Fact
                    label="Plan de refuerzo"
                    value={p.plan === null ? 'Sin plan' : p.plan.completed ? 'Completado' : `Día ${p.plan.day} de ${p.plan.days}`}
                  />
                  <Fact
                    label="Racha"
                    value={
                      p.streak === null
                        ? 'Sin racha todavía'
                        : `${plural(p.streak.currentDays, 'día', 'días')} (mejor: ${p.streak.bestStreak})`
                    }
                  />
                </View>
              </Card3D>

              {p.activity.length > 0 ? (
                <View
                  accessible
                  accessibilityLabel={`Actividad de los últimos 7 días: ${plural(totalReviews, 'repaso', 'repasos')}`}
                  style={styles.activity}
                >
                  <Text style={t.onDarkSecondary}>Actividad de los últimos 7 días</Text>
                  <View style={styles.bars}>
                    {p.activity.map((d) => (
                      <View key={d.day} style={styles.barSlot}>
                        <View style={[styles.activityBar, { height: 4 + (40 * d.reviews) / maxReviews }]} />
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <SectionTitle>Evaluaciones</SectionTitle>
              {p.assessments.length === 0 ? (
                <Text style={t.onDarkSecondary}>Aún no presenta evaluaciones.</Text>
              ) : (
                p.assessments.map((a) => (
                  <Card3D key={`${a.assessmentId}-${a.attemptNumber}`} tone="dark">
                    <View style={t.row}>
                      <View style={t.grow}>
                        <Text style={t.onDark}>{a.title}</Text>
                        <Text style={t.onDarkSecondary}>
                          {a.masteryPct === null
                            ? `Intento ${a.attemptNumber}`
                            : `Intento ${a.attemptNumber} · ${a.masteryPct} % de dominio`}
                        </Text>
                      </View>
                      {a.grade === null ? null : <Text style={styles.grade}>{String(a.grade)}</Text>}
                    </View>
                  </Card3D>
                ))
              )}

              <SectionTitle>Tarjetas que más falla</SectionTitle>
              {p.hardestCards.length === 0 ? (
                <Text style={t.onDarkSecondary}>Aún no hay tarjetas falladas.</Text>
              ) : (
                p.hardestCards.map((c) => (
                  <View key={c.cardId} style={[t.row, styles.cardRow]}>
                    <Text style={[t.onDark, t.grow]}>{c.front}</Text>
                    <Text style={styles.lapses}>{plural(c.lapses, 'fallo', 'fallos')}</Text>
                  </View>
                ))
              )}

              <View style={styles.actions}>
                <Button3D label="Dar tiempo extra" size="secondary" tone="dark" onPress={() => setInfo(EXTRA_TIME_PENDING)} style={t.grow} />
                <Button3D
                  label="Desbloquear unidad"
                  size="secondary"
                  tone="amber"
                  onPress={() => setUnlocking((v) => !v)}
                  disabled={locked.length === 0}
                  style={t.grow}
                />
              </View>

              {unlocking ? (
                <View style={styles.panel}>
                  {locked.map((u) => (
                    <OptionRow
                      key={u.unitId}
                      title={`Unidad ${u.number}`}
                      description={u.name}
                      selected={unitId === u.unitId}
                      onPress={() => setUnitId(u.unitId)}
                    />
                  ))}
                  {fieldErrors.unit ? <Notice tone="error" message={fieldErrors.unit} /> : null}
                  <TextField
                    label="Justificación"
                    value={reason}
                    onChangeText={setReason}
                    maxLength={200}
                    error={fieldErrors.reason}
                  />
                  <Button3D label="Confirmar desbloqueo" tone="amber" disabled={busy} onPress={() => confirmUnlock(p)} />
                </View>
              ) : null}

              {info ? <Notice message={info} /> : null}
              {error ? <Notice tone="error" message={error} /> : null}
            </>
          );
        }}
      </LoadGate>
    </TeacherFrame>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={t.row}>
      <Text style={[t.onDarkSecondary, t.grow]}>{label}</Text>
      <Text style={t.onDark}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overall: { fontFamily: fonts.display, fontSize: 32, color: colors.textOnLight },
  unit: { gap: 6 },
  tag: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.textOnLight,
    backgroundColor: colors.mint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  activity: { gap: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 48 },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  activityBar: { borderRadius: 4, backgroundColor: colors.teal },
  grade: { fontFamily: fonts.display, fontSize: 28, color: colors.amber },
  cardRow: { paddingVertical: 6 },
  lapses: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.amber },
  actions: { flexDirection: 'row', gap: 12 },
  panel: { gap: 12 },
});
