// Forms of Gestión académica (35): term, subject, unit and section. Each form checks what it can on the
// phone with the server's messages and shows the server's field errors (ApiError.fields) under each field.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button3D } from '../../components/Button3D';
import { FieldError } from '../../components/form/FieldError';
import { SelectField } from '../../components/form/SelectField';
import { TextField } from '../../components/form/TextField';
import { Notice } from '../../components/Notice';
import { OptionRow } from '../../components/OptionRow';
import type {
  JoinMode,
  Section,
  SectionInput,
  Subject,
  SubjectInput,
  Teacher,
  TermInput,
  UnitInput,
} from '../../services/api/academic';
import { ApiError } from '../../services/api/client';
import { colors, fonts } from '../../theme';
import { UNEXPECTED_ERROR } from '../onboarding/joinCode';

type Errors = Record<string, string>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Runs a submit and turns its failure into a form message and field messages. */
function useSubmit() {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (local: Errors, work: () => Promise<void>) => {
    setFormError(null);
    setErrors(local);
    if (Object.keys(local).length > 0) return;
    setBusy(true);
    try {
      await work();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(err.message);
      } else {
        setFormError(UNEXPECTED_ERROR);
      }
    } finally {
      setBusy(false);
    }
  };
  return { errors, formError, busy, submit };
}

function FormFooter({ label, busy, formError, onPress }: { label: string; busy: boolean; formError: string | null; onPress: () => void }) {
  return (
    <View style={styles.footer}>
      {formError ? <Notice tone="error" message={formError} /> : null}
      <Button3D label={label} onPress={onPress} disabled={busy} />
    </View>
  );
}

export function TermForm({ onSubmit }: { onSubmit: (input: TermInput) => Promise<void> }) {
  const [name, setName] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const { errors, formError, busy, submit } = useSubmit();
  const save = () => {
    const local: Errors = {};
    if (!name.trim()) local.name = 'Escribe el nombre del lapso.';
    if (!DATE.test(startsOn.trim())) local.startsOn = 'Escribe la fecha de inicio como AAAA-MM-DD.';
    if (!DATE.test(endsOn.trim())) local.endsOn = 'Escribe la fecha de cierre como AAAA-MM-DD.';
    else if (!local.startsOn && endsOn.trim() <= startsOn.trim()) {
      local.endsOn = 'La fecha de cierre debe ser posterior a la de inicio.';
    }
    return submit(local, () => onSubmit({ name: name.trim(), startsOn: startsOn.trim(), endsOn: endsOn.trim() }));
  };
  return (
    <>
      <TextField label="Nombre del lapso" value={name} onChangeText={setName} placeholder="2027-I" error={errors.name} />
      <TextField label="Inicio" value={startsOn} onChangeText={setStartsOn} placeholder="AAAA-MM-DD" error={errors.startsOn} />
      <TextField label="Cierre" value={endsOn} onChangeText={setEndsOn} placeholder="AAAA-MM-DD" error={errors.endsOn} />
      <FormFooter label="Guardar lapso" busy={busy} formError={formError} onPress={save} />
    </>
  );
}

export function SubjectForm({
  initial,
  onSubmit,
}: {
  initial?: Subject | null;
  onSubmit: (input: SubjectInput) => Promise<void>;
}) {
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const { errors, formError, busy, submit } = useSubmit();
  const save = () => {
    const local: Errors = {};
    if (!code.trim()) local.code = 'Escribe el código de la materia.';
    if (!name.trim()) local.name = 'Escribe el nombre de la materia.';
    return submit(local, () => onSubmit({ code: code.trim(), name: name.trim() }));
  };
  return (
    <>
      <TextField label="Código" value={code} onChangeText={setCode} placeholder="SI3" autoCapitalize="characters" error={errors.code} />
      <TextField
        label="Nombre de la materia"
        value={name}
        onChangeText={setName}
        placeholder="Sistemas de Información III"
        error={errors.name}
      />
      <FormFooter label="Guardar materia" busy={busy} formError={formError} onPress={save} />
    </>
  );
}

export function UnitForm({ nextNumber, onSubmit }: { nextNumber: number; onSubmit: (input: UnitInput) => Promise<void> }) {
  const [number, setNumber] = useState(String(nextNumber));
  const [name, setName] = useState('');
  const { errors, formError, busy, submit } = useSubmit();
  const save = () => {
    const local: Errors = {};
    if (!/^[1-9]\d{0,2}$/.test(number.trim())) local.number = 'Escribe el número de la unidad.';
    if (!name.trim()) local.name = 'Escribe el nombre de la unidad.';
    return submit(local, () => onSubmit({ number: Number(number.trim()), name: name.trim() }));
  };
  return (
    <>
      <TextField label="Número de la unidad" value={number} onChangeText={setNumber} keyboardType="number-pad" error={errors.number} />
      <TextField label="Nombre de la unidad" value={name} onChangeText={setName} error={errors.name} />
      <FormFooter label="Guardar unidad" busy={busy} formError={formError} onPress={save} />
    </>
  );
}

/** Join modes in the words of CU-37 (3, 3a). */
export const JOIN_MODES: { value: JoinMode; title: string; description: string }[] = [
  {
    value: 'roster',
    title: 'Solo inscritos',
    description: 'Los de la lista de inscritos entran de inmediato; los demás quedan por confirmar',
  },
  { value: 'approval', title: 'Con aprobación', description: 'Todos quedan por confirmar' },
  { value: 'open', title: 'Abierto', description: 'Todo el que use el código entra directo' },
];

const NO_TEACHER = 'none';

type SectionFormProps = {
  subjects: Subject[];
  teachers: Teacher[];
  termId: number;
  /** Editing an existing section (its subject and term stay). */
  initial?: Section | null;
  onSubmit: (subjectId: number, input: SectionInput) => Promise<void>;
};

export function SectionForm({ subjects, teachers, termId, initial, onSubmit }: SectionFormProps) {
  const [subjectId, setSubjectId] = useState<string | null>(
    initial ? String(initial.subjectId) : subjects[0] ? String(subjects[0].subjectId) : null,
  );
  const [name, setName] = useState(initial?.name ?? '');
  const [teacherId, setTeacherId] = useState(initial?.teacherId ? String(initial.teacherId) : NO_TEACHER);
  const [joinMode, setJoinMode] = useState<JoinMode>(initial?.joinMode ?? 'roster');
  const [capacity, setCapacity] = useState(initial?.capacity ? String(initial.capacity) : '');
  const [expires, setExpires] = useState(initial?.codeExpiresAt ? initial.codeExpiresAt.slice(0, 10) : '');
  const { errors, formError, busy, submit } = useSubmit();

  const teacherOptions = [
    { value: NO_TEACHER, label: 'Sin profesor asignado' },
    ...teachers.map((t) => ({ value: String(t.userId), label: t.name })),
  ];
  // A teacher no longer active still shows by name while editing.
  if (initial?.teacherId && initial.teacherName && !teachers.some((t) => t.userId === initial.teacherId)) {
    teacherOptions.push({ value: String(initial.teacherId), label: initial.teacherName });
  }

  const save = () => {
    const local: Errors = {};
    if (!subjectId) local.subjectId = 'Primero crea una materia en la pestaña Materias.';
    if (!name.trim()) local.name = 'Escribe el nombre de la sección.';
    if (capacity.trim() && !/^[1-9]\d{0,4}$/.test(capacity.trim())) local.capacity = 'Escribe el cupo como un número entero.';
    if (expires.trim() && !DATE.test(expires.trim())) local.codeExpiresAt = 'Escribe la fecha de vencimiento como AAAA-MM-DD.';
    const input: SectionInput = {
      termId,
      name: name.trim(),
      teacherId: teacherId === NO_TEACHER ? null : Number(teacherId),
      joinMode,
      capacity: capacity.trim() ? Number(capacity.trim()) : null,
      codeExpiresAt: expires.trim() || null,
    };
    return submit(local, () => onSubmit(Number(subjectId), input));
  };

  return (
    <>
      {initial ? null : (
        <SelectField
          label="Materia"
          value={subjectId}
          options={subjects.map((s) => ({ value: String(s.subjectId), label: `${s.code} · ${s.name}` }))}
          onChange={setSubjectId}
          placeholder="Sin materias"
        />
      )}
      <FieldError message={errors.subjectId} />
      <TextField label="Nombre de la sección" value={name} onChangeText={setName} placeholder="Sección 1" error={errors.name} />
      <SelectField label="Profesor" value={teacherId} options={teacherOptions} onChange={setTeacherId} />
      <FieldError message={errors.teacherId} />
      <View accessibilityRole="radiogroup" accessibilityLabel="Modo de ingreso" style={styles.group}>
        <Text style={styles.label}>Modo de ingreso</Text>
        {JOIN_MODES.map((m) => (
          <OptionRow
            key={m.value}
            title={m.title}
            description={m.description}
            selected={joinMode === m.value}
            onPress={() => setJoinMode(m.value)}
          />
        ))}
      </View>
      <TextField
        label="Cupo (opcional)"
        value={capacity}
        onChangeText={setCapacity}
        placeholder="Sin límite"
        keyboardType="number-pad"
        error={errors.capacity}
      />
      <TextField
        label="El código vence (opcional)"
        value={expires}
        onChangeText={setExpires}
        placeholder="AAAA-MM-DD"
        error={errors.codeExpiresAt}
      />
      <FormFooter label="Guardar sección" busy={busy} formError={formError} onPress={save} />
    </>
  );
}

const styles = StyleSheet.create({
  footer: { gap: 12, marginTop: 4 },
  group: { gap: 8 },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondaryOnDark },

});
