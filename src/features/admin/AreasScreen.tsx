// Pantalla 34 · Áreas y administradores (CU-34, RF-58, RF-61, RF-63; CU-37 5a). The institution code with
// its join mode, the areas with their admins and the admins of the institution. The last institution admin
// cannot drop the role (tr_keep_one_institution_admin); the server answers LAST_ADMIN.
// Visual reference: design/pantallas_png/34_Areas_y_administradores.png
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button3D } from '../../components/Button3D';
import { Card3D } from '../../components/Card3D';
import { TextField } from '../../components/form/TextField';
import { OptionRow } from '../../components/OptionRow';
import { TextLink } from '../../components/TextLink';
import type { Candidate, JoinMode, Overview } from '../../services/api/admin';
import { colors, fonts } from '../../theme';
import { AdminFrame, AdminRow, adminStyles, ErrorNotice, PillButton, SectionHeader } from './AdminFrame';
import type { AdminService } from './adminService';
import { areaLine, JOIN_MODES, joinLine } from './adminText';
import { useAction } from './useAction';

export const LAST_ADMIN_NOTE =
  'La institución siempre conserva al menos un administrador: el último no puede quitarse el rol.';

type Service = Pick<
  AdminService,
  | 'overview'
  | 'candidates'
  | 'createArea'
  | 'renameArea'
  | 'deleteArea'
  | 'assignAdmin'
  | 'removeAdmin'
  | 'updateJoin'
  | 'regenerateCode'
>;

type Props = { institutionName: string; service: Service };

/** Who is being named admin: an area (areaId) or the whole institution (null). */
type Picking = { areaId: number | null } | null;

export function AreasScreen({ institutionName, service }: Props) {
  const [data, setData] = useState<Overview | null>(null);
  const { busy, error, run } = useAction();
  const [joinOpen, setJoinOpen] = useState(false);
  const [expiry, setExpiry] = useState('');
  const [newArea, setNewArea] = useState<string | null>(null);
  const [openArea, setOpenArea] = useState<number | null>(null);
  const [rename, setRename] = useState('');
  const [picking, setPicking] = useState<Picking>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);

  const load = useCallback(async () => {
    const result = await run(() => service.overview());
    if (result) {
      setData(result);
      setExpiry(result.join.codeExpiresOn ?? '');
    }
  }, [run, service]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Runs a change and reloads the screen when it worked. */
  const change = async (work: () => Promise<unknown>) => {
    const done = await run(async () => {
      await work();
      return true;
    });
    if (done) await load();
    return done === true;
  };

  const startPicking = async (areaId: number | null) => {
    setChosen(null);
    setPicking({ areaId });
    const result = await run(() => service.candidates());
    if (result) setCandidates(result.candidates);
  };

  const institutionAdmins = data?.admins.filter((a) => a.areaId === null) ?? [];

  const picker = picking ? (
    <View style={adminStyles.panel}>
      <Text style={adminStyles.strong}>Elige a una persona activa de la institución</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Miembros activos" style={styles.list}>
        {candidates.map((c) => (
          <OptionRow
            key={c.userId}
            title={c.name}
            description={c.email}
            selected={chosen === c.userId}
            onPress={() => setChosen(c.userId)}
          />
        ))}
      </View>
      <Button3D
        label="Nombrar administrador"
        size="secondary"
        tone="amber"
        disabled={busy || chosen === null}
        onPress={async () => {
          if (chosen === null) return;
          if (await change(() => service.assignAdmin(chosen, picking.areaId))) setPicking(null);
        }}
      />
      <TextLink label="Cancelar" onPress={() => setPicking(null)} />
    </View>
  ) : null;

  return (
    <AdminFrame overline="Administrador de la institución" title={institutionName}>
      <ErrorNotice message={error} />

      {data ? (
        <>
          <Card3D tone="amber">
            <View style={styles.codeCard}>
              <View style={styles.codeText}>
                <Text style={styles.codeLabel}>Código de la institución</Text>
                <Text style={styles.code}>{data.join.code}</Text>
                <Text style={styles.codeLine}>{joinLine(data.join.joinMode, data.join.pendingCount)}</Text>
                {data.join.codeExpired ? <Text style={styles.codeLine}>El código venció.</Text> : null}
              </View>
              <PillButton label="Ingreso" onLight onPress={() => setJoinOpen((v) => !v)} />
            </View>
          </Card3D>

          {joinOpen ? (
            <View style={adminStyles.panel}>
              <View accessibilityRole="radiogroup" accessibilityLabel="Modo de ingreso" style={styles.list}>
                {JOIN_MODES.map((m) => (
                  <OptionRow
                    key={m.value}
                    title={m.title}
                    description={m.description}
                    selected={data.join.joinMode === m.value}
                    onPress={() => {
                      if (m.value !== data.join.joinMode) void change(() => service.updateJoin({ joinMode: m.value as JoinMode }));
                    }}
                  />
                ))}
              </View>
              <TextField
                label="Vence el (AAAA-MM-DD)"
                value={expiry}
                onChangeText={setExpiry}
                placeholder="Sin vencimiento"
                keyboardType="numbers-and-punctuation"
              />
              <View style={adminStyles.actions}>
                <PillButton
                  label="Guardar vencimiento"
                  disabled={busy}
                  onPress={() => void change(() => service.updateJoin({ codeExpiresOn: expiry.trim() || null }))}
                />
                <PillButton
                  label="Generar código nuevo"
                  disabled={busy}
                  onPress={() => void change(() => service.regenerateCode())}
                />
              </View>
              <Text style={adminStyles.muted}>
                Al generar un código nuevo, el código, el enlace y el QR anteriores dejan de funcionar.
              </Text>
            </View>
          ) : null}

          <SectionHeader title="Áreas" action="Nueva área" onAction={() => setNewArea('')} />
          {newArea !== null ? (
            <View style={adminStyles.panel}>
              <TextField label="Nombre del área" value={newArea} onChangeText={setNewArea} placeholder="Odontología" />
              <Button3D
                label="Guardar área"
                size="secondary"
                tone="amber"
                disabled={busy}
                onPress={async () => {
                  if (await change(() => service.createArea(newArea.trim()))) setNewArea(null);
                }}
              />
              <TextLink label="Cancelar" onPress={() => setNewArea(null)} />
            </View>
          ) : null}
          {data.areas.length === 0 ? (
            <Text style={adminStyles.muted}>
              Aún no hay áreas. Crea facultades, escuelas o programas para organizar las materias.
            </Text>
          ) : null}
          {data.areas.map((area) => (
            <View key={area.areaId} style={styles.list}>
              <Card3D
                tone="white"
                accessibilityLabel={`Abrir ${area.name}`}
                onPress={() => {
                  setOpenArea(openArea === area.areaId ? null : area.areaId);
                  setRename(area.name);
                  setPicking(null);
                }}
              >
                <Text style={styles.areaName}>{area.name}</Text>
                <Text style={styles.areaLine}>{areaLine(area)}</Text>
              </Card3D>
              {openArea === area.areaId ? (
                <View style={adminStyles.panel}>
                  <PillButton
                    label="Asignar administrador"
                    tone="amber"
                    disabled={busy}
                    onPress={() => void startPicking(area.areaId)}
                  />
                  {picking?.areaId === area.areaId ? picker : null}
                  <TextField label="Nombre del área" value={rename} onChangeText={setRename} />
                  <View style={adminStyles.actions}>
                    <PillButton
                      label="Guardar nombre"
                      disabled={busy}
                      onPress={() => void change(() => service.renameArea(area.areaId, rename.trim()))}
                    />
                    <PillButton
                      label="Eliminar área"
                      disabled={busy}
                      onPress={async () => {
                        if (await change(() => service.deleteArea(area.areaId))) setOpenArea(null);
                      }}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ))}

          <SectionHeader title="Administradores" action="Agregar" onAction={() => void startPicking(null)} />
          {picking?.areaId === null ? picker : null}
          {data.admins.map((admin) => {
            const lastOne = admin.areaId === null && institutionAdmins.length === 1;
            return (
              <AdminRow
                key={admin.membershipId}
                title={admin.name}
                line={admin.areaName ? `Área de ${admin.areaName}` : 'Toda la institución'}
              >
                {lastOne ? null : (
                  <PillButton
                    label="Quitar rol"
                    accessibilityLabel={`Quitar rol a ${admin.name}`}
                    disabled={busy}
                    onPress={() => void change(() => service.removeAdmin(admin.membershipId))}
                  />
                )}
              </AdminRow>
            );
          })}
          <Text style={adminStyles.muted}>{LAST_ADMIN_NOTE}</Text>
        </>
      ) : null}
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  codeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  codeText: { flex: 1, minWidth: 180, gap: 2 },
  codeLabel: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textOnLight },
  code: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 2, color: colors.textOnLight },
  codeLine: { fontFamily: fonts.body, fontSize: 14, color: colors.textOnLight },
  areaName: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.textOnLight },
  areaLine: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondaryOnLight },
});
