// Pantalla 35 · Gestión académica (CU-03, CU-28; RF-03, RF-65, RF-67, RNF-13). "Selector de área,
// secciones con su profesor y código, y profesores por confirmar. El administrador de área solo ve su
// área y no tiene las opciones de lapso ni de usuarios; el de la institución también gestiona el lapso."
// The server already limits the areas to the caller's scope; this screen only hides what the role cannot do.
// Visual reference: design/pantallas_png/35_Gestion_academica.png
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button3D } from '../../components/Button3D';
import { SelectField } from '../../components/form/SelectField';
import { Notice } from '../../components/Notice';
import { TabSwitch } from '../../components/TabSwitch';
import type {
  AcademicOverview,
  PendingTeacher,
  Section,
  SectionInput,
  Subject,
  Teacher,
  Term,
} from '../../services/api/academic';
import { ApiError } from '../../services/api/client';
import { colors, fonts, radius, spacing } from '../../theme';
import { UNEXPECTED_ERROR } from '../onboarding/joinCode';
import type { AcademicClient } from './academicClient';
import { SectionForm, SubjectForm, TermForm, UnitForm } from './forms';
import { PendingBanner, PendingTeachersList, SectionRow, SubjectCard, TermBar } from './panels';
import { PillButton, Sheet } from './parts';

type Props = {
  client: AcademicClient;
  /** "Administrador" or "Administrador de área", shown before the institution name. */
  roleLabel: string;
  /** Opens Usuarios (36); only the institution admin has it (no tab without it). */
  onOpenUsers?: () => void;
};

type Tab = 'users' | 'subjects' | 'sections';

type SheetState =
  | { kind: 'newSection' }
  | { kind: 'section'; sectionId: number }
  | { kind: 'newSubject' }
  | { kind: 'editSubject'; subject: Subject }
  | { kind: 'deleteSubject'; subject: Subject }
  | { kind: 'newUnit'; subject: Subject }
  | { kind: 'newTerm' }
  | { kind: 'pending' };

const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : UNEXPECTED_ERROR);

/** The open term that starts last, otherwise the most recent one (the server sorts newest first). */
const defaultTerm = (terms: Term[]) => terms.find((t) => t.status === 'open') ?? terms[0] ?? null;

export function AcademicScreen({ client, roleLabel, onOpenUsers }: Props) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AcademicOverview | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [termId, setTermId] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tab, setTab] = useState<Tab>('sections');
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [pending, setPending] = useState<PendingTeacher[] | null>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [next, active] = await Promise.all([client.overview(), client.teachers()]);
      setOverview(next);
      setTeachers(active);
      setAreaId((current) => (next.areas.some((a) => a.areaId === current) ? current : (next.areas[0]?.areaId ?? null)));
      setTermId((current) => (next.terms.some((t) => t.termId === current) ? current : (defaultTerm(next.terms)?.termId ?? null)));
    } catch (err) {
      setLoadError(messageOf(err));
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (areaId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const [list, subjectList] = await Promise.all([
          client.sections(areaId, termId ?? undefined),
          client.subjects(areaId),
        ]);
        if (cancelled) return;
        setSections(list);
        setSubjects(subjectList);
      } catch (err) {
        if (!cancelled) setLoadError(messageOf(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, areaId, termId]);

  /** Runs an action; its error shows above the content (or in the open sheet). */
  const act = async (work: () => Promise<void>) => {
    setActionError(null);
    setBusy(true);
    try {
      await work();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const closeSheet = () => {
    setSheet(null);
    setActionError(null);
  };

  if (loadError && !overview) {
    return (
      <Screen>
        <Header roleLabel={roleLabel} institutionName={null} />
        <Notice tone="error" message={loadError} />
        <Button3D label="Reintentar" size="secondary" tone="dark" onPress={load} />
      </Screen>
    );
  }
  if (!overview) {
    return (
      <Screen>
        <Header roleLabel={roleLabel} institutionName={null} />
        <Text style={styles.muted}>Cargando…</Text>
      </Screen>
    );
  }

  const canManageTerms = overview.canManageTerms;
  const term = overview.terms.find((t) => t.termId === termId) ?? null;
  const area = overview.areas.find((a) => a.areaId === areaId) ?? null;
  const tabs: { key: Tab; label: string }[] = [
    ...(canManageTerms && onOpenUsers ? [{ key: 'users' as const, label: 'Usuarios' }] : []),
    { key: 'subjects', label: 'Materias' },
    { key: 'sections', label: 'Secciones' },
  ];
  const openSection = sheet?.kind === 'section' ? sections.find((s) => s.sectionId === sheet.sectionId) ?? null : null;

  const replaceSection = (next: Section) =>
    setSections((list) => list.map((s) => (s.sectionId === next.sectionId ? next : s)));
  const replaceTerm = (next: Term) =>
    setOverview((o) => (o ? { ...o, terms: o.terms.map((t) => (t.termId === next.termId ? next : t)) } : o));

  const openPending = async () => {
    setSheet({ kind: 'pending' });
    setPending(null);
    await act(async () => setPending(await client.pendingTeachers()));
  };

  const review = (t: PendingTeacher, decision: 'approve' | 'reject') =>
    act(async () => {
      setReviewingId(t.membershipId);
      try {
        await client.reviewTeacher(t.membershipId, decision);
      } finally {
        setReviewingId(null);
      }
      setPending((list) => (list ?? []).filter((p) => p.membershipId !== t.membershipId));
      setOverview((o) => (o ? { ...o, pendingTeacherCount: Math.max(0, o.pendingTeacherCount - 1) } : o));
      if (decision === 'approve') setTeachers(await client.teachers());
    });

  const setTermStatus = (status: Term['status']) =>
    act(async () => {
      if (!term) return;
      replaceTerm(await client.updateTerm(term.termId, { status }));
      setConfirmingClose(false);
    });

  const saveSection = async (subjectId: number, input: SectionInput) => {
    if (sheet?.kind === 'section' && openSection) {
      const { termId: _term, ...patch } = input;
      replaceSection(await client.updateSection(openSection.sectionId, patch));
    } else {
      const created = await client.createSection(subjectId, input);
      setSections((list) => [...list, created]);
    }
    closeSheet();
  };

  return (
    <Screen>
      <Header roleLabel={roleLabel} institutionName={overview.institutionName} />

      {overview.areas.length === 0 ? (
        <Notice message="Todavía no hay áreas. Créalas en Áreas y administradores." />
      ) : overview.areas.length === 1 ? (
        <View accessible accessibilityLabel={`Área: ${overview.areas[0].name}`} style={styles.staticField}>
          <Text style={styles.fieldLabel}>Área</Text>
          <Text style={styles.fieldValue}>{overview.areas[0].name}</Text>
        </View>
      ) : (
        <SelectField
          label="Área"
          value={areaId === null ? null : String(areaId)}
          options={overview.areas.map((a) => ({ value: String(a.areaId), label: a.name }))}
          onChange={(value) => setAreaId(Number(value))}
        />
      )}

      <TabSwitch
        tabs={tabs}
        value={tab}
        accessibilityLabel="Gestión"
        onChange={(key) => (key === 'users' ? onOpenUsers?.() : setTab(key))}
      />

      <PendingBanner count={overview.pendingTeacherCount} onReview={openPending} />

      {actionError && !sheet ? <Notice tone="error" message={actionError} /> : null}

      {overview.terms.length > 1 ? (
        <SelectField
          label="Lapso"
          value={termId === null ? null : String(termId)}
          options={overview.terms.map((t) => ({
            value: String(t.termId),
            label: t.status === 'closed' ? `${t.name} (cerrado)` : t.name,
          }))}
          onChange={(value) => {
            setTermId(Number(value));
            setConfirmingClose(false);
          }}
        />
      ) : null}
      {term ? (
        <TermBar
          term={term}
          canManage={canManageTerms}
          confirmingClose={confirmingClose}
          busy={busy}
          onClose={() => setConfirmingClose(true)}
          onConfirmClose={() => setTermStatus('closed')}
          onCancelClose={() => setConfirmingClose(false)}
          onReopen={() => setTermStatus('open')}
        />
      ) : (
        <Notice
          message={
            canManageTerms
              ? 'Todavía no hay lapsos. Crea el primero para abrir secciones.'
              : 'La institución todavía no tiene lapsos. Los crea el administrador de la institución.'
          }
        />
      )}
      {canManageTerms ? (
        <PillButton label="Nuevo lapso" tone="outline" onPress={() => setSheet({ kind: 'newTerm' })} />
      ) : null}

      {area && tab === 'sections' ? (
        <View style={styles.list}>
          {sections.length === 0 ? <Text style={styles.muted}>Todavía no hay secciones en este lapso.</Text> : null}
          {sections.map((s) => (
            <SectionRow key={s.sectionId} section={s} onPress={() => setSheet({ kind: 'section', sectionId: s.sectionId })} />
          ))}
          {term && term.status === 'open' ? (
            <Button3D label="Nueva sección" onPress={() => setSheet({ kind: 'newSection' })} />
          ) : null}
        </View>
      ) : null}

      {area && tab === 'subjects' ? (
        <View style={styles.list}>
          {subjects.length === 0 ? <Text style={styles.muted}>Todavía no hay materias en esta área.</Text> : null}
          {subjects.map((s) => (
            <SubjectCard
              key={s.subjectId}
              subject={s}
              onAddUnit={() => setSheet({ kind: 'newUnit', subject: s })}
              onEdit={() => setSheet({ kind: 'editSubject', subject: s })}
              onDelete={() => setSheet({ kind: 'deleteSubject', subject: s })}
              onDeleteUnit={(unitId) =>
                act(async () => {
                  await client.deleteUnit(unitId);
                  setSubjects((list) =>
                    list.map((x) => (x.subjectId === s.subjectId ? { ...x, units: x.units.filter((u) => u.unitId !== unitId) } : x)),
                  );
                })
              }
            />
          ))}
          <Button3D label="Nueva materia" onPress={() => setSheet({ kind: 'newSubject' })} />
        </View>
      ) : null}

      <Sheet visible={sheet?.kind === 'pending'} title="Profesores por confirmar" onClose={closeSheet}>
        {actionError ? <Notice tone="error" message={actionError} /> : null}
        {pending === null ? (
          <Text style={styles.muted}>Cargando…</Text>
        ) : (
          <PendingTeachersList teachers={pending} busyId={reviewingId} onReview={review} />
        )}
      </Sheet>

      <Sheet
        visible={sheet?.kind === 'newSection' || (sheet?.kind === 'section' && !!openSection)}
        title={openSection ? `${openSection.subjectCode} · ${openSection.name}` : 'Nueva sección'}
        accessibilityLabel="Formulario de sección"
        onClose={closeSheet}
      >
        {openSection ? (
          <View style={styles.codeBox}>
            <Text style={styles.fieldLabel}>Código de ingreso</Text>
            <Text style={styles.bigCode}>{openSection.joinCode}</Text>
            <Text style={styles.muted}>El enlace y el QR usan este mismo código.</Text>
            {actionError ? <Notice tone="error" message={actionError} /> : null}
            <View style={styles.actions}>
              <PillButton
                label="Generar código nuevo"
                tone="light"
                disabled={busy}
                onPress={() => act(async () => replaceSection(await client.renewSectionCode(openSection.sectionId)))}
              />
              <PillButton
                label={openSection.isArchived ? 'Restaurar sección' : 'Archivar sección'}
                tone="outline"
                disabled={busy}
                onPress={() =>
                  act(async () =>
                    replaceSection(await client.updateSection(openSection.sectionId, { isArchived: !openSection.isArchived })),
                  )
                }
              />
            </View>
          </View>
        ) : null}
        {sheet?.kind === 'newSection' || openSection ? (
          <SectionForm
            key={openSection?.sectionId ?? 'new'}
            subjects={subjects}
            teachers={teachers}
            termId={openSection?.termId ?? termId ?? 0}
            initial={openSection}
            onSubmit={saveSection}
          />
        ) : null}
      </Sheet>

      <Sheet
        visible={sheet?.kind === 'newSubject' || sheet?.kind === 'editSubject'}
        title={sheet?.kind === 'editSubject' ? 'Editar materia' : 'Nueva materia'}
        onClose={closeSheet}
      >
        {sheet?.kind === 'newSubject' || sheet?.kind === 'editSubject' ? (
          <SubjectForm
            initial={sheet.kind === 'editSubject' ? sheet.subject : null}
            onSubmit={async (input) => {
              if (sheet.kind === 'editSubject') {
                const updated = await client.updateSubject(sheet.subject.subjectId, input);
                setSubjects((list) => list.map((s) => (s.subjectId === updated.subjectId ? updated : s)));
              } else if (areaId !== null) {
                const created = await client.createSubject(areaId, input);
                setSubjects((list) => [...list, created]);
              }
              closeSheet();
            }}
          />
        ) : null}
      </Sheet>

      <Sheet visible={sheet?.kind === 'newUnit'} title="Nueva unidad" onClose={closeSheet}>
        {sheet?.kind === 'newUnit' ? (
          <UnitForm
            nextNumber={Math.max(0, ...sheet.subject.units.map((u) => u.number)) + 1}
            onSubmit={async (input) => {
              const unit = await client.createUnit(sheet.subject.subjectId, input);
              setSubjects((list) =>
                list.map((s) =>
                  s.subjectId === sheet.subject.subjectId
                    ? { ...s, units: [...s.units, unit].sort((a, b) => a.number - b.number) }
                    : s,
                ),
              );
              closeSheet();
            }}
          />
        ) : null}
      </Sheet>

      <Sheet visible={sheet?.kind === 'deleteSubject'} title="Eliminar materia" onClose={closeSheet}>
        {sheet?.kind === 'deleteSubject' ? (
          <>
            <Text style={styles.body}>
              {`Se eliminará ${sheet.subject.code} · ${sheet.subject.name} con sus unidades. Una materia con secciones o mazos no se puede eliminar.`}
            </Text>
            {actionError ? <Notice tone="error" message={actionError} /> : null}
            <Button3D
              label="Sí, eliminar materia"
              disabled={busy}
              onPress={() =>
                act(async () => {
                  await client.deleteSubject(sheet.subject.subjectId);
                  setSubjects((list) => list.filter((s) => s.subjectId !== sheet.subject.subjectId));
                  setSheet(null);
                })
              }
            />
          </>
        ) : null}
      </Sheet>

      <Sheet visible={sheet?.kind === 'newTerm'} title="Nuevo lapso" onClose={closeSheet}>
        {sheet?.kind === 'newTerm' ? (
          <TermForm
            onSubmit={async (input) => {
              const created = await client.createTerm(input);
              setOverview((o) =>
                o ? { ...o, terms: [created, ...o.terms].sort((a, b) => b.startsOn.localeCompare(a.startsOn)) } : o,
              );
              setTermId(created.termId);
              closeSheet();
            }}
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ roleLabel, institutionName }: { roleLabel: string; institutionName: string | null }) {
  return (
    <View style={styles.header}>
      <Text style={styles.role}>{institutionName ? `${roleLabel} · ${institutionName}` : roleLabel}</Text>
      <Text accessibilityRole="header" style={styles.title}>
        Gestión académica
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  // One column on the phone; the max width keeps it readable if a wide web layout opens it.
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingTop: 20,
    paddingHorizontal: spacing.screenX,
    paddingBottom: 28,
    gap: 20,
  },
  header: { gap: 4 },
  role: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondaryOnDark },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.textOnDark },
  staticField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.inputBorder,
  },
  fieldLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondaryOnDark },
  fieldValue: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textOnDark },
  list: { gap: 10 },
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondaryOnDark },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textOnDark },
  codeBox: { gap: 8 },
  bigCode: { fontFamily: fonts.display, fontSize: 34, letterSpacing: 4, color: colors.textOnDark },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
