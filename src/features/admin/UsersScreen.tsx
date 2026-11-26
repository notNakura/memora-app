// Pantalla 36 · Usuarios (CU-02, CU-37, RF-02, RF-48, RF-50, RF-64, RF-67). Members search, roster import
// from CSV, requests to confirm (one by one or in bulk) and options per member. Area admins only see the
// requests that name their area. Password reset waits for RF-36 recovery (shown as "disponible pronto").
// The CSV is pasted as text until a file picker is installed.
// Visual reference: design/pantallas_png/36_Usuarios.png
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button3D } from '../../components/Button3D';
import { Card3D } from '../../components/Card3D';
import { TextField } from '../../components/form/TextField';
import { Notice } from '../../components/Notice';
import { TabSwitch } from '../../components/TabSwitch';
import { TextLink } from '../../components/TextLink';
import type { JoinRequest, LastImport, Member, MemberFilters, RosterResult } from '../../services/api/admin';
import { colors, fonts } from '../../theme';
import { AdminFrame, AdminRow, adminStyles, ErrorNotice, PillButton, SectionHeader } from './AdminFrame';
import type { AdminService } from './adminService';
import { agoText, importSummary, memberLine, requestLine } from './adminText';
import { useAction } from './useAction';

export const RESET_SOON = 'Restablecer contraseña estará disponible pronto.';

type Service = Pick<
  AdminService,
  | 'members'
  | 'requests'
  | 'decide'
  | 'changeRole'
  | 'removeMember'
  | 'reinstateMember'
  | 'correctEmail'
  | 'previewRoster'
  | 'importRoster'
  | 'lastImport'
>;

type Props = {
  institutionName: string;
  service: Service;
  /** Institution admins manage members; area admins only handle the requests of their areas. */
  canManageMembers: boolean;
  now?: () => Date;
};

type Filter = 'all' | 'student' | 'teacher' | 'removed';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'student', label: 'Estudiantes' },
  { key: 'teacher', label: 'Profesores' },
  { key: 'removed', label: 'Retirados' },
];
const filterQuery = (filter: Filter, q: string): MemberFilters => ({
  q: q.trim() || undefined,
  role: filter === 'student' || filter === 'teacher' ? filter : undefined,
  status: filter === 'removed' ? 'removed' : undefined,
});

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function UsersScreen({ institutionName, service, canManageMembers, now = () => new Date() }: Props) {
  const { busy, error, run } = useAction();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [lastImport, setLastImport] = useState<LastImport | null>(null);
  const [showImportErrors, setShowImportErrors] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [bulk, setBulk] = useState(false);
  const [openMember, setOpenMember] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [importing, setImporting] = useState(false);
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<RosterResult | null>(null);

  const loadRequests = useCallback(async () => {
    const result = await run(() => service.requests());
    if (result) setRequests(result.requests);
  }, [run, service]);

  const loadMembers = useCallback(
    async (f: Filter, q: string) => {
      if (!canManageMembers) return;
      const result = await run(() => service.members(filterQuery(f, q)));
      if (result) setMembers(result.members);
    },
    [run, service, canManageMembers],
  );

  const loadLastImport = useCallback(async () => {
    if (!canManageMembers) return;
    const result = await run(() => service.lastImport());
    if (result) setLastImport(result.lastImport);
  }, [run, service, canManageMembers]);

  useEffect(() => {
    void loadRequests();
    void loadMembers('all', '');
    void loadLastImport();
  }, [loadRequests, loadMembers, loadLastImport]);

  const reload = async () => {
    await loadRequests();
    await loadMembers(filter, query);
  };

  /** Runs a change; on success closes the open options and reloads. */
  const change = async (work: () => Promise<unknown>) => {
    setNotice(null);
    const done = await run(async () => {
      await work();
      return true;
    });
    if (done) {
      setOpenMember(null);
      await reload();
    }
    return done === true;
  };

  const decide = (ids: number[], decision: 'approve' | 'reject') =>
    ids.length ? change(() => service.decide(ids, decision)) : Promise.resolve(false);

  const validRows = preview ? preview.totalRows - preview.errorCount : 0;

  return (
    <AdminFrame overline={`Administrador · ${institutionName}`} title="Usuarios">
      <ErrorNotice message={error} />
      {notice ? <Notice message={notice} /> : null}

      {canManageMembers ? (
        <>
          <TextField
            label="Buscar usuario"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void loadMembers(filter, query)}
            returnKeyType="search"
            placeholder="Nombre, correo o cédula"
            autoCapitalize="none"
          />
          <Button3D label="Importar CSV" size="secondary" tone="dark" onPress={() => setImporting((v) => !v)} />

          {importing ? (
            <View style={adminStyles.panel}>
              <Text style={adminStyles.muted}>
                Columnas: cedula, nombres, apellidos, correo y, si quieres, rol (estudiante o profesor) y seccion.
                Hasta 2000 filas.
              </Text>
              <TextField
                label="Contenido del archivo CSV"
                value={csv}
                onChangeText={(t) => {
                  setCsv(t);
                  setPreview(null);
                }}
                multiline
                placeholder="cedula;nombres;apellidos;correo;rol;seccion"
                autoCapitalize="none"
              />
              <TextField
                label="Nombre del archivo"
                value={fileName}
                onChangeText={setFileName}
                placeholder="inscritos_SI3_2026-II.csv"
                autoCapitalize="none"
              />
              <PillButton
                label="Vista previa"
                disabled={busy || !csv.trim()}
                onPress={async () => {
                  const result = await run(() => service.previewRoster(csv));
                  if (result) setPreview(result.roster);
                }}
              />
              {preview ? (
                <View style={styles.list}>
                  <Text style={adminStyles.strong}>
                    {`${plural(validRows, 'fila válida', 'filas válidas')}, ${preview.errorCount} con error.`}
                  </Text>
                  {preview.rows
                    .filter((r) => r.error)
                    .map((r) => (
                      <Text key={r.line} style={adminStyles.muted}>{`Fila ${r.line} (${r.nationalId}): ${r.error}`}</Text>
                    ))}
                  {validRows > 0 ? (
                    <Button3D
                      label={`Importar ${plural(validRows, 'fila válida', 'filas válidas')}`}
                      size="secondary"
                      tone="amber"
                      disabled={busy}
                      onPress={async () => {
                        const result = await run(() => service.importRoster(csv, fileName.trim() || null));
                        if (result) {
                          setImporting(false);
                          setPreview(null);
                          setCsv('');
                          setNotice(
                            importSummary({
                              fileName: result.roster.fileName,
                              created: result.roster.created,
                              loaded: result.roster.loaded,
                              errors: result.roster.errorCount,
                            }),
                          );
                          await loadLastImport();
                          await reload();
                        }
                      }}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {lastImport ? (
            <Card3D tone="mint">
              <Text style={styles.importTitle}>{`Última importación · ${agoText(lastImport.occurredAt, now())}`}</Text>
              <Text style={styles.importLine}>
                {importSummary({
                  fileName: lastImport.fileName,
                  created: lastImport.created,
                  loaded: lastImport.loaded,
                  errors: lastImport.errors.length,
                })}
              </Text>
              {lastImport.errors.length ? (
                <TextLink
                  label={showImportErrors ? 'Ocultar filas con error' : 'Ver filas con error'}
                  onPress={() => setShowImportErrors((v) => !v)}
                  style={styles.darkLink}
                />
              ) : null}
              {showImportErrors
                ? lastImport.errors.map((e) => (
                    <Text key={e.line} style={styles.importLine}>{`Fila ${e.line} (${e.nationalId}): ${e.message}`}</Text>
                  ))
                : null}
            </Card3D>
          ) : null}
        </>
      ) : null}

      <SectionHeader
        title={`Por confirmar (${requests.length})`}
        action={requests.length ? (bulk ? 'Terminar revisión' : 'Revisar en bloque') : undefined}
        onAction={() => setBulk((v) => !v)}
      />
      {requests.length === 0 ? <Text style={adminStyles.muted}>No hay solicitudes por confirmar.</Text> : null}
      {bulk ? (
        <View style={adminStyles.actions}>
          <PillButton
            label="Aprobar los de la lista"
            tone="teal"
            disabled={busy}
            onPress={() => void decide(requests.filter((r) => r.inRoster).map((r) => r.membershipId), 'approve')}
          />
          <PillButton
            label="Rechazar los demás"
            disabled={busy}
            onPress={() => void decide(requests.filter((r) => !r.inRoster).map((r) => r.membershipId), 'reject')}
          />
          <PillButton
            label="Aprobar todas"
            disabled={busy}
            onPress={() => void decide(requests.map((r) => r.membershipId), 'approve')}
          />
        </View>
      ) : null}
      {requests.map((r) => (
        <AdminRow
          key={r.membershipId}
          title={r.name}
          line={`${requestLine(r.role)} · ${r.inRoster ? 'En la lista' : 'No está en la lista'}`}
        >
          <PillButton
            label="Confirmar"
            tone="amber"
            accessibilityLabel={`Confirmar a ${r.name}`}
            disabled={busy}
            onPress={() => void decide([r.membershipId], 'approve')}
          />
          <PillButton
            label="Rechazar"
            accessibilityLabel={`Rechazar a ${r.name}`}
            disabled={busy}
            onPress={() => void decide([r.membershipId], 'reject')}
          />
        </AdminRow>
      ))}

      {canManageMembers ? (
        <>
          <SectionHeader title="Todos" />
          <TabSwitch
            tabs={FILTERS}
            value={filter}
            accessibilityLabel="Filtrar miembros"
            onChange={(next) => {
              setFilter(next);
              void loadMembers(next, query);
            }}
          />
          {members.length === 0 ? <Text style={adminStyles.muted}>No encontramos miembros con ese filtro.</Text> : null}
          {members.map((m) => (
            <View key={m.membershipId} style={styles.list}>
              <AdminRow title={m.name} line={memberLine(m.role, m.status, m.areaName)}>
                {m.status === 'removed' ? (
                  <PillButton
                    label="Reincorporar"
                    accessibilityLabel={`Reincorporar a ${m.name}`}
                    disabled={busy}
                    onPress={() => void change(() => service.reinstateMember(m.membershipId))}
                  />
                ) : (
                  <PillButton
                    label="Opciones"
                    accessibilityLabel={`Opciones de ${m.name}`}
                    onPress={() => {
                      setNotice(null);
                      setEmailDraft(m.email);
                      setOpenMember(openMember === m.membershipId ? null : m.membershipId);
                    }}
                  />
                )}
              </AdminRow>
              {openMember === m.membershipId ? (
                <View style={adminStyles.panel}>
                  <Text style={adminStyles.muted}>{m.nationalId ? `${m.email} · ${m.nationalId}` : m.email}</Text>
                  <View style={adminStyles.actions}>
                    {m.role === 'student' || m.role === 'teacher' ? (
                      <PillButton
                        label={m.role === 'student' ? 'Cambiar a profesor' : 'Cambiar a estudiante'}
                        disabled={busy}
                        onPress={() =>
                          void change(() =>
                            service.changeRole(m.membershipId, m.role === 'student' ? 'teacher' : 'student'),
                          )
                        }
                      />
                    ) : null}
                    <PillButton label="Restablecer contraseña" onPress={() => setNotice(RESET_SOON)} />
                    <PillButton
                      label="Retirar de la institución"
                      disabled={busy}
                      onPress={() => void change(() => service.removeMember(m.membershipId))}
                    />
                  </View>
                  {m.emailEditable ? (
                    <>
                      <TextField
                        label="Correo de la lista de inscritos"
                        value={emailDraft}
                        onChangeText={setEmailDraft}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <PillButton
                        label="Corregir correo"
                        disabled={busy || !emailDraft.trim()}
                        onPress={() => void change(() => service.correctEmail(m.userId, emailDraft.trim()))}
                      />
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  importTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textOnLight },
  importLine: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSecondaryOnLight },
  darkLink: { alignSelf: 'flex-start' },
});
