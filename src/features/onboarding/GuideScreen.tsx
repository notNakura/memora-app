// Pantalla 04 · Guía de inicio (CU-31, RF-53). Three steps about spaced repetition; finishing or "Saltar"
// marks app_user.onboarding_completed. Step 2 copies the mockup; steps 1 and 3 follow docs/01_producto.md.
// Visual reference: design/pantallas_png/04_Guia_de_inicio.png
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Button3D } from '../../components/Button3D';
import { Card3D } from '../../components/Card3D';
import { Memo } from '../../components/Memo';
import { Notice } from '../../components/Notice';
import { ApiError } from '../../services/api/client';
import { colors, fonts, radius, sizes, spacing } from '../../theme';
import { UNEXPECTED_ERROR } from './joinCode';

type Step = { label: string; title: string; body: string; visual: ReactNode };

const STEPS: Step[] = [
  {
    label: 'Una tarjeta de memoria',
    title: 'Aprende con tarjetas',
    body: 'Cada tarjeta tiene una pregunta y su respuesta. Primero intenta recordar y luego voltéala para comprobar. Recordar por tu cuenta es lo que fija lo aprendido.',
    visual: <FlashcardVisual />,
  },
  {
    label: 'Cuándo vuelve cada tarjeta',
    title: 'Repasa justo antes de olvidar',
    body: 'Memora te muestra cada tarjeta cuando estás por olvidarla. Si la recuerdas bien, tarda más en volver; si te cuesta, vuelve pronto. Así estudias menos tiempo y recuerdas más.',
    visual: <IntervalsVisual />,
  },
  {
    label: 'Tu repaso del día',
    title: 'Unos minutos cada día',
    body: 'Cada día Memora arma tu repaso con las tarjetas que estás por olvidar y mezcla todas tus materias. Con unos minutos diarios llegas al examen sin estudiar todo de golpe.',
    visual: <DailyReviewVisual />,
  },
];

type Props = { onFinish: () => Promise<void> };

export function GuideScreen({ onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const finish = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await onFinish();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : UNEXPECTED_ERROR);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.stepCount}>
            Paso {index + 1} de {STEPS.length}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Saltar"
            accessibilityHint="Termina la guía. Puedes volver a verla desde Ajustes"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={finish}
            hitSlop={8}
            style={styles.skip}
          >
            <Text style={styles.skipText}>Saltar</Text>
          </Pressable>
        </View>

        <Card3D>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>{step.label}</Text>
            {step.visual}
          </View>
        </Card3D>

        <View style={styles.texts}>
          <Text accessibilityRole="header" style={styles.title}>
            {step.title}
          </Text>
          <Text style={styles.body}>{step.body}</Text>
        </View>

        <View style={styles.tip}>
          <Memo pose="hello" size={56} />
          <Text style={styles.tipText}>Puedes volver a esta guía cuando quieras desde Ajustes, en Ayuda.</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {STEPS.map((s, i) => (
              <View key={s.title} style={[styles.dot, i === index && styles.dotOn]} />
            ))}
          </View>
          {error ? <Notice tone="error" message={error} /> : null}
          <Button3D
            label={isLast ? 'Empezar' : 'Siguiente'}
            disabled={busy}
            onPress={() => (isLast ? finish() : setIndex(index + 1))}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Curve with the review days of the mockup (design/pantallas_html/04_Guia_de_inicio.html). */
function IntervalsVisual() {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Los repasos se separan cada vez más: día 1, 3, 8, 20 y 45">
      <Svg width="100%" height={100} viewBox="0 0 300 104" aria-hidden>
        <Path d="M10 100 H290" stroke="#E3E6F0" strokeWidth={2} />
        <Path
          d="M14 92 C 60 88, 120 70, 180 50 S 270 18, 286 14"
          fill="none"
          stroke={colors.teal}
          strokeWidth={3}
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
        <Circle cx="14" cy="92" r="7" fill={colors.teal} />
        <Circle cx="40" cy="89" r="7" fill={colors.teal} />
        <Circle cx="88" cy="80" r="7" fill={colors.teal} />
        <Circle cx="170" cy="54" r="7" fill={colors.teal} />
        <Circle cx="286" cy="14" r="11" fill="none" stroke={colors.amber} strokeWidth={3} />
        <Circle cx="286" cy="14" r="6" fill={colors.amber} />
      </Svg>
      <Text style={styles.axis}>día 1 · 3 · 8 · 20 · 45</Text>
    </View>
  );
}

function FlashcardVisual() {
  return (
    <View style={styles.flashcard}>
      <View style={styles.face}>
        <Text style={styles.faceLabel}>Pregunta</Text>
        <Text style={styles.faceText}>¿Qué es la repetición espaciada?</Text>
      </View>
      <View style={[styles.face, styles.faceBack]}>
        <Text style={styles.faceLabel}>Respuesta</Text>
        <Text style={styles.faceText}>Repasar cada tarjeta justo antes de olvidarla.</Text>
      </View>
    </View>
  );
}

function DailyReviewVisual() {
  const items = ['Repasa las tarjetas que te tocan hoy', 'Marca qué tan bien las recordaste', 'Memora agenda el próximo repaso'];
  return (
    <View style={styles.list}>
      {items.map((item, i) => (
        <View key={item} style={styles.listRow}>
          <View style={styles.listNumber}>
            <Text style={styles.listNumberText}>{i + 1}</Text>
          </View>
          <Text style={[styles.faceText, styles.listText]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  content: { flexGrow: 1, paddingTop: 20, paddingHorizontal: spacing.screenX, paddingBottom: 28, gap: 22 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepCount: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondaryOnDark },
  skip: { minHeight: sizes.minTouch, minWidth: sizes.minTouch, justifyContent: 'center', alignItems: 'flex-end' },
  skipText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textSecondaryOnDark },
  cardContent: { gap: 14 },
  cardLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textSecondaryOnLight },
  axis: { marginTop: 4, fontFamily: fonts.body, fontSize: 12, color: colors.textSecondaryOnLight },
  texts: { gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 35, color: colors.textOnDark },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25, color: colors.textSecondaryOnDark },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.field,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceEdge,
  },
  tipText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textOnDark },
  footer: { marginTop: 'auto', gap: 16, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceEdge },
  dotOn: { width: 24, backgroundColor: colors.amber },
  flashcard: { gap: 10 },
  face: { padding: 14, borderRadius: radius.field, borderWidth: 2, borderColor: '#E3E6F0', gap: 4 },
  faceBack: { backgroundColor: colors.mint, borderColor: colors.mint },
  faceLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textSecondaryOnLight },
  faceText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20, color: colors.textOnLight },
  list: { gap: 10 },
  listText: { flex: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listNumberText: { fontFamily: fonts.displaySemi, fontSize: 15, color: colors.textOnLight },
});
