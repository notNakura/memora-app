// Development-only showcase of Memo's reactions. Open /dev/memo.
import { Redirect } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button3D } from '../../../components/Button3D';
import {
  AnimatedMemo,
  MEMO_REACTIONS,
  type AnimatedMemoHandle,
  type MemoAccessory,
  type MemoReaction,
  type MemoTone,
} from '../../../components/Memo';
import { TabSwitch } from '../../../components/TabSwitch';
import { colors, radius, spacing, typography } from '../../../theme';

const REACTION_LABELS: Record<MemoReaction, string> = {
  idle: 'Reposo',
  happy: 'Alegría',
  celebrate: 'Celebrar',
  clap: 'Aplaudir',
  levelUp: 'Subir de nivel',
  sad: 'Tristeza',
  thinking: 'Pensar',
  challenge: 'Reto',
  sleep: 'Dormir',
  wave: 'Saludar',
};

type AccessoryChoice = MemoAccessory | 'none';
type MoodChoice = 'idle' | 'sleep' | 'challenge' | 'thinking';

export default function MemoShowcase() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Showcase />;
}

function Showcase() {
  const memo = useRef<AnimatedMemoHandle>(null);
  const reduced = useReducedMotion();
  const [tone, setTone] = useState<MemoTone>('amber');
  const [accessory, setAccessory] = useState<AccessoryChoice>('none');
  const [mood, setMood] = useState<MoodChoice>('idle');
  const [last, setLast] = useState<MemoReaction | null>(null);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.title} accessibilityRole="header">
          Memo · reacciones
        </Text>
        <Text style={typography.secondary}>
          {reduced
            ? 'Reducir movimiento está activado: Memo muestra poses fijas.'
            : 'Toca una reacción para verla; luego Memo vuelve a su estado de reposo.'}
        </Text>

        <View style={[styles.stage, tone === 'white' && styles.stageAmber]}>
          <AnimatedMemo
            ref={memo}
            mood={mood}
            tone={tone}
            size={200}
            accessory={accessory === 'none' ? undefined : accessory}
            onReactionEnd={(r) => setLast(r)}
          />
        </View>
        <Text style={typography.secondary}>{last ? `Terminó: ${REACTION_LABELS[last]}` : ' '}</Text>

        <Text style={typography.label}>Reacciones</Text>
        <View style={styles.grid}>
          {MEMO_REACTIONS.map((reaction) => (
            <Button3D
              key={reaction}
              label={REACTION_LABELS[reaction]}
              size="secondary"
              tone="white"
              style={styles.cell}
              onPress={() => memo.current?.play(reaction)}
            />
          ))}
        </View>

        <Text style={typography.label}>Estado de reposo</Text>
        <TabSwitch
          accessibilityLabel="Estado de reposo"
          value={mood}
          onChange={setMood}
          tabs={[
            { key: 'idle', label: 'Reposo' },
            { key: 'sleep', label: 'Dormir' },
            { key: 'challenge', label: 'Reto' },
            { key: 'thinking', label: 'Pensar' },
          ]}
        />

        <Text style={typography.label}>Color</Text>
        <TabSwitch
          accessibilityLabel="Color de Memo"
          value={tone}
          onChange={setTone}
          tabs={[
            { key: 'amber', label: 'Ámbar' },
            { key: 'white', label: 'Blanco' },
          ]}
        />

        <Text style={typography.label}>Accesorio</Text>
        <TabSwitch
          accessibilityLabel="Accesorio de Memo"
          value={accessory}
          onChange={setAccessory}
          tabs={[
            { key: 'none', label: 'Ninguno' },
            { key: 'cap', label: 'Birrete' },
            { key: 'glasses', label: 'Lentes' },
            { key: 'scarf', label: 'Bufanda' },
          ]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.appBackground },
  content: { paddingHorizontal: spacing.screenX, paddingVertical: spacing.block, gap: 14 },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  stageAmber: { backgroundColor: colors.amber },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { flexBasis: '47%', flexGrow: 1 },
});
