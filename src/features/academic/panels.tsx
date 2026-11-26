// Presentational pieces of Gestión académica (35). Each panel stands alone so a wide web layout
// can place them side by side later; the phone stacks them.
// Visual reference: design/pantallas_png/35_Gestion_academica.png
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card3D } from '../../components/Card3D';
import { tapFeedback } from '../../components/feedback';
import { Notice } from '../../components/Notice';
import { TextLink } from '../../components/TextLink';
import type { PendingTeacher, Section, Subject, Term } from '../../services/api/academic';
import { colors, fonts, radius, spacing } from '../../theme';
import { PillButton } from './parts';

export const pendingTitle = (count: number) =>
  count === 1 ? '1 profesor por confirmar' : `${count} profesores por confirmar`;

/** Amber banner of the design: "2 profesores por confirmar · Se registraron con rol de profesor · Revisar". */
export function PendingBanner({ count, onReview }: { count: number; onReview: () => void }) {
  if (count <= 0) return null;
  return (
    <Card3D tone="amber" contentStyle={styles.banner}>
      <View style={styles.bannerTexts}>
        <Text style={styles.bannerTitle}>{pendingTitle(count)}</Text>
        <Text style={styles.bannerText}>Se registraron con rol de profesor</Text>
      </View>
      <PillButton label="Revisar" onPress={onReview} />
    </Card3D>
  );
}

export function PendingTeachersList({
  teachers,
  busyId,
  onReview,
}: {
  teachers: PendingTeacher[];
  busyId: number | null;
  onReview: (t: PendingTeacher, decision: 'approve' | 'reject') => void;
}) {
  if (teachers.length === 0) return <Notice message="No hay profesores por confirmar." />;
  return (
    <View style={styles.list}>
      {teachers.map((t) => (
        <View key={t.membershipId} style={styles.row}>
          <View style={styles.rowTexts}>
            <Text style={styles.rowTitle}>{t.name}</Text>
            <Text style={styles.rowText}>{t.email}</Text>
          </View>
          <View style={styles.actions}>
            <PillButton
              label="Confirmar"
              tone="light"
              accessibilityLabel={`Confirmar a ${t.name}`}
              disabled={busyId === t.membershipId}
              onPress={() => onReview(t, 'approve')}
            />
            <PillButton
              label="Rechazar"
              tone="outline"
              accessibilityLabel={`Rechazar a ${t.name}`}
              disabled={busyId === t.membershipId}
              onPress={() => onReview(t, 'reject')}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

type TermBarProps = {
  term: Term;
  canManage: boolean;
  confirmingClose: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirmClose: () => void;
  onCancelClose: () => void;
  onReopen: () => void;
};

/** "Lapso 2026-II · Cerrar lapso" (the close and reopen options are for the institution admin only). */
export function TermBar({ term, canManage, confirmingClose, busy, onClose, onConfirmClose, onCancelClose, onReopen }: TermBarProps) {
  const closed = term.status === 'closed';
  return (
    <View style={styles.termBox}>
      <View style={styles.termRow}>
        <Text style={styles.termName}>{`Lapso ${term.name}`}</Text>
        {closed ? <Text style={styles.chip}>Cerrado</Text> : null}
        <View style={styles.flex} />
        {canManage && !confirmingClose ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closed ? 'Reabrir lapso' : 'Cerrar lapso'}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPressIn={tapFeedback}
            onPress={closed ? onReopen : onClose}
            hitSlop={8}
            style={styles.linkBox}
          >
            <Text style={styles.closeLink}>{closed ? 'Reabrir lapso' : 'Cerrar lapso'}</Text>
          </Pressable>
        ) : null}
      </View>
      {confirmingClose ? (
        <View style={styles.confirm}>
          <Notice message="Al cerrar el lapso no se pueden abrir secciones nuevas en él. Podrás reabrirlo después." />
          <View style={styles.actions}>
            <PillButton label="Sí, cerrar lapso" tone="light" disabled={busy} onPress={onConfirmClose} />
            <PillButton label="Cancelar" tone="outline" onPress={onCancelClose} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const sectionDetail = (s: Section) =>
  s.teacherName ? `Prof. ${s.teacherName} · ${s.studentCount} estudiantes` : 'Sin profesor asignado';

export function SectionRow({ section, onPress }: { section: Section; onPress: () => void }) {
  const title = `${section.subjectCode} · ${section.name}`;
  const detail = sectionDetail(section);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, código ${section.joinCode}, ${detail}${section.isArchived ? ', archivada' : ''}`}
      accessibilityHint="Abre la sección para editarla"
      onPressIn={tapFeedback}
      onPress={onPress}
      style={({ pressed }) => [styles.row, section.isArchived && styles.archived, pressed && styles.pressed]}
    >
      <View style={styles.rowTexts}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowText}>{section.isArchived ? `${detail} · Archivada` : detail}</Text>
      </View>
      <Text style={styles.code}>{section.joinCode}</Text>
    </Pressable>
  );
}

export function SubjectCard({
  subject,
  onAddUnit,
  onEdit,
  onDelete,
  onDeleteUnit,
}: {
  subject: Subject;
  onAddUnit: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteUnit: (unitId: number) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.rowTitle}>{`${subject.code} · ${subject.name}`}</Text>
      {subject.units.length === 0 ? <Text style={styles.rowText}>Sin unidades</Text> : null}
      {subject.units.map((u) => (
        <View key={u.unitId} style={styles.unitRow}>
          <Text style={[styles.rowText, styles.flex]}>{`Unidad ${u.number} · ${u.name}`}</Text>
          <TextLink
            label="Quitar"
            accessibilityHint={`Elimina la unidad ${u.number} de ${subject.code}`}
            onPress={() => onDeleteUnit(u.unitId)}
          />
        </View>
      ))}
      <View style={styles.actions}>
        <PillButton label="Nueva unidad" tone="light" accessibilityLabel={`Nueva unidad en ${subject.code}`} onPress={onAddUnit} />
        <PillButton label="Editar" tone="outline" accessibilityLabel={`Editar ${subject.code}`} onPress={onEdit} />
        <PillButton label="Eliminar" tone="outline" accessibilityLabel={`Eliminar ${subject.code}`} onPress={onDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18 },
  bannerTexts: { flex: 1 },
  bannerTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textOnLight },
  bannerText: { fontFamily: fonts.body, fontSize: 13, color: colors.textOnLight },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceEdge,
  },
  archived: { opacity: 0.75 },
  pressed: { opacity: 0.85 },
  rowTexts: { flex: 1, minWidth: 160, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textOnDark },
  rowText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondaryOnDark },
  code: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.appBackground,
    color: colors.textOnDark,
    fontFamily: fonts.displaySemi,
    fontSize: 14,
    letterSpacing: 1,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  termBox: { gap: 10 },
  termRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  termName: { fontFamily: fonts.displaySemi, fontSize: 17, color: colors.textOnDark },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.cream,
    color: colors.textOnLight,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
  linkBox: { minHeight: 44, justifyContent: 'center' },
  closeLink: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.amber, textDecorationLine: 'underline' },
  confirm: { gap: 10 },
  card: {
    gap: 8,
    padding: 16,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceEdge,
  },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: spacing.screenX / 2 },
});
