import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, FAB, Text } from 'react-native-paper';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { navigateToAddMedication } from '@/src/features/reliability/reliabilityService';
import { useDatabaseBootstrap } from '@/src/db/DbProvider';
import { InventoryService } from '@/src/features/inventory/inventoryService';
import { DoseEventRepository, MedicationRepository } from '@/src/features/medications/medicationRepository';
import type { Medication } from '@/src/db/schema';
import { PillShapeIcon, SHAPE_PREVIEW_COLOR } from '@/src/core/components/PillShapeIcon';
import { RefillQuantityDialog } from '@/src/core/components/RefillQuantityDialog';
import { formatStrengthSubtitle, getMedicationTypeLabel } from '@/src/core/types/domain';
import { ReminderPermissionBanner } from '@/src/core/components/ReminderPermissionBanner';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';
import { t } from '@/src/i18n/translate';
import { HIGHLIGHT_MEDICATION_PARAM } from '@/src/features/inventory/constants';
import { useHighlightAutoClear } from '@/src/features/inventory/useHighlightAutoClear';

function formatStrengthLine(med: Medication): string {
  const subtitle = formatStrengthSubtitle(
    med.medicationType,
    med.strengthValue ?? undefined,
    med.strengthUnit ?? undefined,
    med.doseUnitValue ?? undefined,
    med.doseUnitUnit ?? undefined,
  );
  if (subtitle !== t('review.infoFallback')) {
    return subtitle;
  }
  return getMedicationTypeLabel(med.medicationType);
}

function displayShape(med: Medication): string {
  return med.pillShape ?? 'capsule_divided';
}

export default function LibraryScreen() {
  const dbState = useDatabaseBootstrap();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refillMed, setRefillMed] = useState<Medication | null>(null);
  const { t } = useT();
  const params = useLocalSearchParams<{ [HIGHLIGHT_MEDICATION_PARAM]?: string }>();
  const highlightedId = params[HIGHLIGHT_MEDICATION_PARAM] ?? null;
  const scrollRef = useRef<ScrollView>(null);
  const cardOffsets = useRef(new Map<string, number>());

  // Refill notification tap: scroll to that medication; the highlight clears itself after a delay.
  useHighlightAutoClear(highlightedId);
  useEffect(() => {
    if (!highlightedId) return;
    const y = cardOffsets.current.get(highlightedId);
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - 16, 0), animated: true });
  }, [highlightedId]);

  const handleCardLayout = (medId: string, y: number) => {
    cardOffsets.current.set(medId, y);
    if (medId === highlightedId) {
      scrollRef.current?.scrollTo({ y: Math.max(y - 16, 0), animated: true });
    }
  };

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((key) => key + 1);
    }, []),
  );

  const meds = useMemo(() => {
    if (dbState.status !== 'ready') return [];
    return new MedicationRepository(dbState.db).getAll();
  }, [dbState, refreshKey]);

  const confirmRefill = (quantity: number) => {
    if (dbState.status !== 'ready' || !refillMed) return;

    const medRepo = new MedicationRepository(dbState.db);
    const doseRepo = new DoseEventRepository(dbState.db);
    const inventory = new InventoryService(dbState.db, medRepo, doseRepo);
    inventory.addRefillQuantity(refillMed.id, quantity);
    setRefillMed(null);
    setRefreshKey((key) => key + 1);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title={t('home.yourMedications')} />
      </Appbar.Header>

      <ReminderPermissionBanner />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {meds.length === 0 ? (
          <Text style={styles.empty}>{t('library.empty')}</Text>
        ) : (
          meds.map((med) => (
            <Card
              key={med.id}
              style={[styles.card, med.id === highlightedId && styles.cardHighlighted]}
              onLayout={(event) => handleCardLayout(med.id, event.nativeEvent.layout.y)}
            >
              <Card.Content style={styles.cardContent}>
                <Pressable
                  style={styles.rowMain}
                  onPress={() => router.push(`/medicine/${med.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={t('library.openMedication', { name: med.nickname ?? med.name })}
                >
                  <View style={styles.glyphWrap}>
                    <PillShapeIcon
                      shape={displayShape(med)}
                      color={med.pillColor ?? SHAPE_PREVIEW_COLOR}
                      color2={med.pillColor2 ?? undefined}
                      size={40}
                    />
                  </View>
                  <View style={styles.textCol}>
                    <Text variant="titleMedium" numberOfLines={2}>
                      {med.nickname ?? med.name}
                    </Text>
                    <Text variant="bodySmall" style={styles.meta}>
                      {t('library.remainingLine', {
                        details: formatStrengthLine(med),
                        count: med.currentQuantity,
                      })}
                    </Text>
                  </View>
                </Pressable>
                <Button
                  mode="outlined"
                  compact
                  onPress={() => setRefillMed(med)}
                  style={styles.refillBtn}
                  accessibilityLabel={t('library.refillMedication', { name: med.nickname ?? med.name })}
                >
                  {t('common.refill')}
                </Button>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={navigateToAddMedication}
        accessibilityLabel={t('home.addMedication')}
      />

      <RefillQuantityDialog
        visible={refillMed != null}
        medicationName={refillMed?.nickname ?? refillMed?.name ?? t('refill.medicationFallback')}
        onDismiss={() => setRefillMed(null)}
        onConfirm={confirmRefill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: healthOsTheme.colors.background },
  content: { padding: 16, paddingBottom: 96 },
  card: { marginBottom: 8, backgroundColor: healthOsTheme.colors.surface },
  cardHighlighted: {
    borderWidth: 2,
    borderColor: healthOsTheme.colors.primary,
    backgroundColor: healthOsTheme.colors.primaryContainer,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  glyphWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  meta: {
    color: healthOsTheme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  refillBtn: {
    flexShrink: 0,
  },
  empty: { color: healthOsTheme.colors.onSurfaceVariant },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
