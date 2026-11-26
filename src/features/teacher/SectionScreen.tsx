// Pantalla 25 · Mi sección (CU-23 steps 1-3, CU-27, CU-37): code with access to Invitar, the pending
// requests notice and the roster, students who need attention first.
// Visual reference: design/pantallas_png/25_Mi_seccion.png
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button3D } from '../../components/Button3D';
import { Card3D } from '../../components/Card3D';
import { TabSwitch } from '../../components/TabSwitch';
import { TextLink } from '../../components/TextLink';
import type { RosterStudent } from '../../services/api/teacher';
import { colors, fonts, radius, sizes } from '../../theme';
import { EmptyState, LoadGate, TeacherFrame, teacherStyles as t, useLoad } from './parts';
import type { TeacherClient } from './teacherClient';
import { attentionText, initials, percentLabel, percentText, plural } from './texts';

type Props = {
  client: TeacherClient;
  sectionId: number;
  onBack: () => void;
  onInvite: () => void;
  onRequests: () => void;
  onStudent: (studentId: number) => void;
  /** "Ver rendimiento por tema": the unit averages of Panel docente (24, CU-17). */
  onUnits: () => void;
};

type Filter = 'attention' | 'all';

export function SectionScreen({ client, sectionId, onBack, onInvite, onRequests, onStudent, onUnits }: Props) {
  const { state, reload } = useLoad(() => client.section(sectionId));
  const [filter, setFilter] = useState<Filter>('attention');
  const ready = state.status === 'ready' ? state.data.section : null;

  return (
    <TeacherFrame
      title={ready ? `${ready.subjectCode} · ${ready.sectionName}` : 'Mi sección'}
      subtitle={ready ? `Lapso ${ready.termName} · ${plural(ready.activeCount, 'inscrito', 'inscritos')}` : undefined}
      onBack={onBack}
    >
      <LoadGate state={state} onRetry={reload}>
        {({ section, students }) => {
          const attention = students.filter((s) => s.attention.length > 0);
          const shown = filter === 'attention' ? attention : students;
          return (
            <>
              <Card3D>
                <View style={t.row}>
                  <View style={t.grow}>
                    <Text style={t.onLightSecondary}>Código, enlace o QR</Text>
                    <Text style={styles.code} accessibilityLabel={`Código ${section.joinCode.split('').join(' ')}`}>
                      {section.joinCode}
                    </Text>
                  </View>
                  <Button3D label="Invitar" size="secondary" tone="amber" onPress={onInvite} />
                </View>
              </Card3D>

              {section.pendingCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Revisar las solicitudes por confirmar"
                  onPress={onRequests}
                  style={styles.notice}
                >
                  <Text style={[t.onLightStrong, t.grow]}>
                    {plural(section.pendingCount, 'solicitud por confirmar', 'solicitudes por confirmar')}
                  </Text>
                  <Text style={styles.noticeAction}>Revisar</Text>
                </Pressable>
              ) : null}

              {students.length === 0 ? (
                <EmptyState
                  title="Aún no hay estudiantes inscritos"
                  message="Comparte el código, el enlace o el QR desde Invitar para que se unan."
                />
              ) : (
                <>
                  <TabSwitch<Filter>
                    accessibilityLabel="Lista de inscritos"
                    tabs={[
                      { key: 'attention', label: `Requieren atención (${attention.length})` },
                      { key: 'all', label: `Todos (${students.length})` },
                    ]}
                    value={filter}
                    onChange={setFilter}
                  />
                  {shown.length === 0 ? (
                    <Text style={t.onDarkSecondary}>Nadie requiere atención por ahora.</Text>
                  ) : (
                    shown.map((s) => <StudentRow key={s.studentId} student={s} onPress={() => onStudent(s.studentId)} />)
                  )}
                </>
              )}
              <TextLink label="Ver rendimiento por tema" tone="primary" onPress={onUnits} style={styles.center} />
            </>
          );
        }}
      </LoadGate>
    </TeacherFrame>
  );
}

function StudentRow({ student, onPress }: { student: RosterStudent; onPress: () => void }) {
  const reasons = student.attention.map((r) => attentionText(r, student)).join(' · ');
  const detail = reasons || 'Al día';
  return (
    <Card3D
      tone="dark"
      onPress={onPress}
      accessibilityLabel={`${student.name}, dominio ${percentLabel(student.mastery)}, ${reasons || 'al día'}`}
    >
      <View style={t.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(student.name)}</Text>
        </View>
        <View style={t.grow}>
          <Text style={t.onDark}>{student.name}</Text>
          <Text style={[t.onDarkSecondary, reasons ? styles.warning : null]}>{detail}</Text>
        </View>
        <Text style={styles.mastery}>{percentText(student.mastery)}</Text>
      </View>
    </Card3D>
  );
}

const styles = StyleSheet.create({
  code: { fontFamily: fonts.display, fontSize: 32, letterSpacing: 4, color: colors.textOnLight },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: sizes.minTouch,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.field,
    backgroundColor: colors.cream,
  },
  noticeAction: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.warningOnLight, textDecorationLine: 'underline' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.displaySemi, fontSize: 16, color: colors.textOnLight },
  mastery: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.textOnDark },
  warning: { color: colors.amber },
  center: { alignSelf: 'center' },
});
