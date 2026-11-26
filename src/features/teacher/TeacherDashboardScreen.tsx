// Pantalla 24 · Panel docente (RF-24, RF-08, CU-07, CU-17): the teacher's sections as tabs, average
// mastery per unit, decks waiting for endorsement and "Nueva evaluación" (screen 30, placeholder until the assessments exist).
// Visual reference: design/pantallas_png/24_Panel_docente.png
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button3D } from '../../components/Button3D';
import { Card3D } from '../../components/Card3D';
import { TabSwitch } from '../../components/TabSwitch';
import type { SectionSummary } from '../../services/api/teacher';
import { colors, fonts } from '../../theme';
import { Bar, EmptyState, LoadGate, TeacherFrame, teacherStyles as t, useLoad } from './parts';
import type { TeacherClient } from './teacherClient';
import { percentLabel, percentText, plural } from './texts';

type Props = {
  client: TeacherClient;
  teacherName: string;
  onOpenSection: (sectionId: number) => void;
  onNewAssessment: () => void;
  onReviewDecks: () => void;
};

export function TeacherDashboardScreen({ client, teacherName, onOpenSection, onNewAssessment, onReviewDecks }: Props) {
  const { state, reload } = useLoad(() => client.sections());
  const [selected, setSelected] = useState<string | null>(null);

  const subjectOf = (sections: SectionSummary[]) =>
    sections.find((s) => String(s.sectionId) === selected) ?? sections[0];
  const title = state.status === 'ready' && state.data.length > 0 ? subjectOf(state.data).subjectName : 'Panel docente';

  return (
    <TeacherFrame title={title} subtitle={`Prof. ${teacherName}`} inTabs>
      <LoadGate state={state} onRetry={reload}>
        {(sections) => {
          if (sections.length === 0) {
            return (
              <EmptyState
                title="Aún no tienes secciones"
                message="Cuando tu institución te asigne una sección, aparecerá aquí."
              />
            );
          }
          const current = subjectOf(sections);
          const manySubjects = new Set(sections.map((s) => s.subjectCode)).size > 1;
          return (
            <>
              {sections.length > 1 ? (
                <TabSwitch
                  accessibilityLabel="Tus secciones"
                  tabs={sections.map((s) => ({
                    key: String(s.sectionId),
                    label: manySubjects ? `${s.subjectCode} · ${s.sectionName}` : s.sectionName,
                  }))}
                  value={String(current.sectionId)}
                  onChange={setSelected}
                />
              ) : (
                <Text style={t.onDarkSecondary}>{current.sectionName}</Text>
              )}
              <SectionCard section={current} onOpen={() => onOpenSection(current.sectionId)} />
              {current.pendingEndorsementCount > 0 ? (
                <Card3D tone="amber">
                  <View style={t.row}>
                    <View style={t.grow}>
                      <Text style={t.onLightStrong}>
                        {plural(current.pendingEndorsementCount, 'mazo de estudiantes', 'mazos de estudiantes')}
                      </Text>
                      <Text style={t.onLight}>{current.pendingEndorsementCount === 1 ? 'Espera tu aval' : 'Esperan tu aval'}</Text>
                    </View>
                    <Button3D label="Revisar" size="secondary" tone="dark" onPress={onReviewDecks} />
                  </View>
                </Card3D>
              ) : null}
              <Button3D label="Nueva evaluación" tone="amber" onPress={onNewAssessment} />
            </>
          );
        }}
      </LoadGate>
    </TeacherFrame>
  );
}

function SectionCard({ section, onOpen }: { section: SectionSummary; onOpen: () => void }) {
  return (
    <Card3D>
      <View style={t.cardBody}>
        <Text style={t.onLightSecondary}>
          {`Lapso ${section.termName} · ${plural(section.activeCount, 'inscrito', 'inscritos')}`}
          {section.pendingCount > 0 ? ` · ${section.pendingCount} por confirmar` : ''}
        </Text>
        <SectionTitleOnLight>Dominio promedio por unidad</SectionTitleOnLight>
        {section.units.length === 0 ? (
          <Text style={t.onLightSecondary}>Esta materia aún no tiene unidades.</Text>
        ) : (
          section.units.map((u) => {
            const name = `Unidad ${u.number} · ${u.name}`;
            return (
              <View key={u.unitId} style={styles.unit} accessible accessibilityLabel={`${name}: ${percentLabel(u.mastery)}`}>
                <View style={t.row}>
                  <Text style={[t.onLight, t.grow]}>{name}</Text>
                  <Text style={t.percent}>{percentText(u.mastery)}</Text>
                </View>
                <Bar value={u.mastery} tone={u.mastery !== null && u.mastery < 50 ? 'amber' : 'teal'} />
              </View>
            );
          })
        )}
        <Button3D label="Ver sección" size="secondary" tone="dark" onPress={onOpen} style={styles.open} />
      </View>
    </Card3D>
  );
}

function SectionTitleOnLight({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.cardTitle}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  unit: { gap: 6 },
  open: { alignSelf: 'flex-start', marginTop: 4 },
  cardTitle: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.textOnLight },
});
