// Pantalla 37 · Moderación y bitácora (CU-29, CU-32, RF-49, RF-54). Public decks and cards reported as
// inappropriate (hide, restore or keep) and the audit log of the institution. The log is read from the
// server only; it is never stored on the phone (docs/07_sincronizacion.md).
// Visual reference: design/pantallas_png/37_Moderacion_y_bitacora.png
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card3D } from '../../components/Card3D';
import { OptionRow } from '../../components/OptionRow';
import type { AuditEntry, ReportedCard, ReportedDeck } from '../../services/api/admin';
import { colors, fonts } from '../../theme';
import { AdminFrame, AdminRow, adminStyles, ErrorNotice, PillButton, SectionHeader } from './AdminFrame';
import type { AdminService } from './adminService';
import { AUDIT_ACTIONS, auditDescription, auditDetail } from './adminText';
import { useAction } from './useAction';

type Service = Pick<AdminService, 'reported' | 'deckAction' | 'cardAction' | 'audit'>;
type Props = { institutionName: string; service: Service; now?: () => Date };

const PAGE = 30;
const times = (n: number) => (n === 1 ? '1 vez' : `${n} veces`);
const deckLine = (d: ReportedDeck) =>
  `${d.visibility === 'institution' ? 'Público para toda la institución' : 'Público para su sección'} · ` +
  `${d.cardCount} ${d.cardCount === 1 ? 'tarjeta' : 'tarjetas'} · ` +
  `${d.studentCount} ${d.studentCount === 1 ? 'estudiante lo usa' : 'estudiantes lo usan'}`;

export function ModerationScreen({ institutionName, service, now = () => new Date() }: Props) {
  const { busy, error, run } = useAction();
  const [decks, setDecks] = useState<ReportedDeck[]>([]);
  const [cards, setCards] = useState<ReportedCard[]>([]);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [action, setAction] = useState<string | undefined>(undefined);
  const [filterOpen, setFilterOpen] = useState(false);

  const loadReported = useCallback(async () => {
    const result = await run(() => service.reported());
    if (result) {
      setDecks(result.decks);
      setCards(result.cards);
    }
  }, [run, service]);

  const loadLog = useCallback(
    async (filter: string | undefined, before?: string) => {
      const result = await run(() => service.audit({ action: filter, before, limit: PAGE }));
      if (result) {
        setEntries((prev) => (before ? [...prev, ...result.entries] : result.entries));
        setNextBefore(result.nextBefore);
      }
    },
    [run, service],
  );

  useEffect(() => {
    void loadReported();
    void loadLog(undefined);
  }, [loadReported, loadLog]);

  const act = async (work: () => Promise<unknown>) => {
    const done = await run(async () => {
      await work();
      return true;
    });
    if (done) {
      await loadReported();
      await loadLog(action);
    }
  };

  const chooseFilter = (value: string | undefined) => {
    setAction(value);
    setFilterOpen(false);
    void loadLog(value);
  };

  return (
    <AdminFrame overline={`Administrador · ${institutionName}`} title="Moderación">
      <ErrorNotice message={error} />

      {decks.length === 0 && cards.length === 0 ? (
        <Text style={adminStyles.muted}>No hay mazos ni tarjetas reportados.</Text>
      ) : null}
      {decks.map((d) => (
        <Card3D key={d.deckId} tone="white">
          <View style={styles.deck}>
            <Text style={styles.reported}>
              {d.isHidden ? 'Oculto por moderación' : `Reportado ${times(d.reportCount)} · contenido inapropiado`}
            </Text>
            <Text style={styles.deckName}>{d.name}</Text>
            <Text style={styles.deckLine}>{deckLine(d)}</Text>
            <View style={adminStyles.actions}>
              {d.isHidden ? (
                <PillButton label="Restaurar mazo" onLight disabled={busy} onPress={() => void act(() => service.deckAction(d.deckId, 'restore'))} />
              ) : (
                <>
                  <PillButton label="Mantener" onLight disabled={busy} onPress={() => void act(() => service.deckAction(d.deckId, 'keep'))} />
                  <PillButton label="Ocultar mazo" tone="amber" disabled={busy} onPress={() => void act(() => service.deckAction(d.deckId, 'hide'))} />
                </>
              )}
            </View>
          </View>
        </Card3D>
      ))}
      {cards.map((c) => (
        <AdminRow
          key={c.cardId}
          title={c.front}
          line={
            c.isHidden
              ? `Tarjeta oculta de ${c.deckName}`
              : `Tarjeta de ${c.deckName} · reportada ${times(c.reportCount)} · contenido inapropiado`
          }
        >
          <PillButton
            label={c.isHidden ? 'Restaurar tarjeta' : 'Ocultar tarjeta'}
            disabled={busy}
            onPress={() => void act(() => service.cardAction(c.cardId, c.isHidden ? 'restore' : 'hide'))}
          />
        </AdminRow>
      ))}

      <SectionHeader title="Bitácora" action="Filtrar" onAction={() => setFilterOpen((v) => !v)} />
      {filterOpen ? (
        <View accessibilityRole="radiogroup" accessibilityLabel="Tipo de acción" style={styles.list}>
          <OptionRow title="Todas las acciones" selected={action === undefined} onPress={() => chooseFilter(undefined)} />
          {AUDIT_ACTIONS.map((a) => (
            <OptionRow key={a.value} title={a.label} selected={action === a.value} onPress={() => chooseFilter(a.value)} />
          ))}
        </View>
      ) : null}
      {entries.length === 0 ? <Text style={adminStyles.muted}>No hay acciones registradas.</Text> : null}
      {entries.map((e) => (
        <View key={e.auditId} style={styles.entry}>
          <Text style={adminStyles.strong}>{e.actorName}</Text>
          <Text style={styles.entryText}>{auditDescription(e)}</Text>
          <Text style={adminStyles.muted}>{auditDetail(e, now())}</Text>
        </View>
      ))}
      {nextBefore ? (
        <PillButton label="Ver más" disabled={busy} onPress={() => void loadLog(action, nextBefore)} />
      ) : null}
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  deck: { gap: 6 },
  reported: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.warningOnLight },
  deckName: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.textOnLight },
  deckLine: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondaryOnLight },
  entry: { gap: 2, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surfaceEdge },
  entryText: { fontFamily: fonts.body, fontSize: 15, color: colors.textOnDark },
});
