// Pantalla 26 · Invitar a la sección (RF-45, RF-48, RF-63, RF-65, CU-37): code, link
// memora.app/u/<CODE> and QR to project in class, join mode, roster CSV, capacity, expiry and a new code.
// The CSV is pasted as text for now; choosing the file on the phone comes later.
// Visual reference: design/pantallas_png/26_Invitar_a_la_seccion.png
import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button3D } from '../../components/Button3D';
import { Card3D } from '../../components/Card3D';
import { TextField } from '../../components/form/TextField';
import { Notice } from '../../components/Notice';
import { OptionRow } from '../../components/OptionRow';
import { TextLink } from '../../components/TextLink';
import { ApiError } from '../../services/api/client';
import type { RosterPreview, SectionHeader } from '../../services/api/teacher';
import { colors, fonts, spacing, typography } from '../../theme';
import { LoadGate, QrCode, SectionTitle, TeacherFrame, teacherStyles as t, useLoad } from './parts';
import type { TeacherClient } from './teacherClient';
import { errorMessage, JOIN_MODES, plural, shortDate } from './texts';

type Props = {
  client: TeacherClient;
  sectionId: number;
  onBack: () => void;
  /** Opens the share sheet with the full link (https://memora.app/u/<CODE>). */
  onShare: (url: string, code: string) => void;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const fullLink = (s: SectionHeader) => `https://${s.inviteLink}`;
const place = (s: SectionHeader) => `${s.subjectCode} · ${s.sectionName}`;

function expiryText(s: SectionHeader) {
  if (!s.codeExpiresOn) return 'No vence';
  return `${s.codeExpired ? 'Venció' : 'Vence'} el ${shortDate(s.codeExpiresOn)}`;
}

export function InviteScreen({ client, sectionId, onBack, onShare }: Props) {
  const { state, reload, setData } = useLoad(() => client.section(sectionId));
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const [confirmCode, setConfirmCode] = useState(false);
  const [editing, setEditing] = useState(false);
  const [capacityText, setCapacityText] = useState('');
  const [expiryInput, setExpiryInput] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rosterOpen, setRosterOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<RosterPreview | null>(null);

  const ready = state.status === 'ready' ? state.data : null;
  const replaceHeader = (section: SectionHeader) => {
    if (ready) setData({ ...ready, section });
  };
  const run = async (work: () => Promise<void>) => {
    setInfo(null);
    setError(null);
    setBusy(true);
    try {
      await work();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) setFieldErrors(err.fields);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const subtitle = (s: SectionHeader) =>
    s.capacity === null
      ? `${place(s)} · ${plural(s.activeCount, 'inscrito', 'inscritos')}`
      : `${place(s)} · ${s.activeCount} de ${s.capacity} cupos`;

  const openEditor = (s: SectionHeader) => {
    setCapacityText(s.capacity === null ? '' : String(s.capacity));
    setExpiryInput(s.codeExpiresOn ?? '');
    setFieldErrors({});
    setEditing(true);
  };

  const saveLimits = () => {
    const capacityRaw = capacityText.trim();
    const expiryRaw = expiryInput.trim();
    const local: Record<string, string> = {};
    if (capacityRaw && !/^\d+$/.test(capacityRaw)) local.capacity = 'Escribe un número entero o deja el campo vacío.';
    if (expiryRaw && !DATE.test(expiryRaw)) local.codeExpiresOn = 'Escribe la fecha como AAAA-MM-DD o deja el campo vacío.';
    setFieldErrors(local);
    if (Object.keys(local).length > 0) return;
    run(async () => {
      const section = await client.updateJoinSettings(sectionId, {
        capacity: capacityRaw ? Number(capacityRaw) : null,
        codeExpiresOn: expiryRaw || null,
      });
      replaceHeader(section);
      setEditing(false);
      setInfo('Guardamos el cupo y el vencimiento.');
    });
  };

  return (
    <TeacherFrame title="Invitar" subtitle={ready ? subtitle(ready.section) : undefined} onBack={onBack}>
      <LoadGate state={state} onRetry={reload}>
        {({ section }) => (
          <>
            <Card3D>
              <View style={[t.cardBody, styles.center]}>
                <Text style={t.onLightSecondary}>Código</Text>
                <Text style={styles.code} accessibilityLabel={`Código ${section.joinCode.split('').join(' ')}`}>
                  {section.joinCode}
                </Text>
                <QrCode value={fullLink(section)} size={180} label={`Código QR para unirse a ${place(section)}`} />
                <Text style={t.onLightStrong}>{section.inviteLink}</Text>
                <Text style={[t.onLightSecondary, section.codeExpired ? styles.expired : null]}>{expiryText(section)}</Text>
              </View>
            </Card3D>
            <View style={styles.actions}>
              <Button3D
                label="Compartir enlace"
                size="secondary"
                tone="amber"
                onPress={() => onShare(fullLink(section), section.joinCode)}
                style={t.grow}
              />
              <Button3D label="Proyectar QR" size="secondary" tone="dark" onPress={() => setProjecting(true)} style={t.grow} />
            </View>

            <SectionTitle>¿Quién puede entrar?</SectionTitle>
            {JOIN_MODES.map((mode) => (
              <OptionRow
                key={mode.key}
                title={mode.title}
                description={mode.description}
                selected={section.joinMode === mode.key}
                onPress={() => {
                  if (busy || section.joinMode === mode.key) return;
                  run(async () => {
                    replaceHeader(await client.updateJoinSettings(sectionId, { joinMode: mode.key }));
                    setInfo('Guardamos el modo de ingreso.');
                  });
                }}
              />
            ))}

            <Card3D tone="dark">
              <View style={t.row}>
                <View style={t.grow}>
                  <Text style={t.onDark}>Lista de inscritos</Text>
                  <Text style={t.onDarkSecondary}>
                    {`${plural(section.invitedCount, 'persona invitada', 'personas invitadas')} · cargada por CSV`}
                  </Text>
                </View>
                <Button3D label="Actualizar" size="secondary" tone="white" onPress={() => setRosterOpen((v) => !v)} />
              </View>
            </Card3D>
            {rosterOpen ? (
              <View style={styles.panel}>
                <Text style={t.onDarkSecondary}>
                  Pega el contenido del archivo CSV con las columnas cedula, nombres, apellidos y correo. Desde aquí solo se
                  cargan estudiantes. Elegir el archivo desde el teléfono estará disponible pronto.
                </Text>
                <TextField
                  label="Contenido del archivo CSV"
                  value={csv}
                  onChangeText={(text) => {
                    setCsv(text);
                    setPreview(null);
                  }}
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={fieldErrors.csv}
                />
                <Button3D
                  label="Revisar archivo"
                  size="secondary"
                  tone="dark"
                  disabled={busy || csv.trim() === ''}
                  onPress={() => run(async () => setPreview(await client.previewRoster(sectionId, csv)))}
                />
                {preview ? (
                  <View style={styles.panel}>
                    <Text style={t.onDark}>
                      {`${plural(preview.validCount, 'fila lista', 'filas listas')} · ${preview.errorCount} con error`}
                    </Text>
                    {preview.rows
                      .filter((r) => r.status === 'error')
                      .map((r) => (
                        <Text key={r.line} style={styles.rowError}>{`Fila ${r.line}: ${r.error}`}</Text>
                      ))}
                    {preview.validCount > 0 ? (
                      <Button3D
                        label={`Cargar ${plural(preview.validCount, 'persona', 'personas')}`}
                        tone="amber"
                        disabled={busy}
                        onPress={() =>
                          run(async () => {
                            const result = await client.importRoster(sectionId, csv);
                            setPreview(null);
                            setCsv('');
                            setRosterOpen(false);
                            await reload();
                            setInfo(
                              `Cargamos ${plural(result.imported, 'persona', 'personas')}: ${plural(
                                result.invited,
                                'invitada',
                                'invitadas',
                              )} y ${plural(result.activated, 'ya inscrita', 'ya inscritas')}.`,
                            );
                          })
                        }
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            <Card3D tone="dark">
              <View style={t.row}>
                <View style={t.grow}>
                  <Text style={t.onDark}>Cupo y vencimiento</Text>
                  <Text style={t.onDarkSecondary}>
                    {`${section.capacity === null ? 'Sin límite de cupo' : plural(section.capacity, 'estudiante', 'estudiantes')} · ${
                      section.codeExpiresOn ? `hasta el ${shortDate(section.codeExpiresOn)}` : 'sin vencimiento'
                    }`}
                  </Text>
                </View>
                <Button3D label="Editar" size="secondary" tone="white" onPress={() => openEditor(section)} />
              </View>
            </Card3D>
            {editing ? (
              <View style={styles.panel}>
                <TextField
                  label="Cupo (vacío: sin límite)"
                  value={capacityText}
                  onChangeText={setCapacityText}
                  keyboardType="number-pad"
                  error={fieldErrors.capacity}
                />
                <TextField
                  label="Vence el (AAAA-MM-DD, vacío: no vence)"
                  value={expiryInput}
                  onChangeText={setExpiryInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={fieldErrors.codeExpiresOn}
                />
                <Button3D label="Guardar" size="secondary" tone="amber" disabled={busy} onPress={saveLimits} />
              </View>
            ) : null}

            {confirmCode ? (
              <View style={styles.panel}>
                <Notice message="El código, el enlace y el QR anteriores dejarán de funcionar." />
                <Button3D
                  label="Sí, generar código nuevo"
                  tone="amber"
                  disabled={busy}
                  onPress={() =>
                    run(async () => {
                      replaceHeader(await client.regenerateCode(sectionId));
                      setConfirmCode(false);
                      setInfo('Listo: este es el código nuevo.');
                    })
                  }
                />
                <TextLink label="Cancelar" onPress={() => setConfirmCode(false)} style={styles.center} />
              </View>
            ) : (
              <Button3D label="Generar código nuevo" tone="dark" onPress={() => setConfirmCode(true)} />
            )}

            {info ? <Notice message={info} /> : null}
            {error ? <Notice tone="error" message={error} /> : null}

            <Modal visible={projecting} animationType="fade" onRequestClose={() => setProjecting(false)}>
              <View style={styles.projector}>
                <Text style={styles.projectorTitle}>{place(section)}</Text>
                <QrCode value={fullLink(section)} size={300} label="Código QR ampliado para proyectar en clase" />
                <Text style={styles.projectorCode}>{section.joinCode}</Text>
                <Text style={styles.projectorLink}>{section.inviteLink}</Text>
                <Button3D label="Cerrar" tone="dark" onPress={() => setProjecting(false)} />
              </View>
            </Modal>
          </>
        )}
      </LoadGate>
    </TeacherFrame>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', alignSelf: 'center' },
  code: { fontFamily: fonts.display, fontSize: 40, letterSpacing: 6, color: colors.textOnLight },
  expired: { color: colors.warningOnLight },
  actions: { flexDirection: 'row', gap: 12 },
  panel: { gap: 12 },
  rowError: { ...typography.secondary, color: colors.amber },
  projector: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: spacing.screenX,
  },
  projectorTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.textOnLight },
  projectorCode: { fontFamily: fonts.display, fontSize: 48, letterSpacing: 8, color: colors.textOnLight },
  projectorLink: { fontFamily: fonts.bodySemi, fontSize: 18, color: colors.textOnLight },
});
