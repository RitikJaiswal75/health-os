import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import { useWizardStore } from '@/src/features/medications/wizardStore';
import {
  formatStrengthSubtitle,
  PILL_SHAPE_CATEGORIES,
  supportsDualColor,
  type PillShape,
} from '@/src/core/types/domain';
import {
  formatShapeLabel,
  PillShapeIcon,
  SHAPE_GRID_COLOR,
  SHAPE_PREVIEW_COLOR,
} from '@/src/core/components/PillShapeIcon';
import { copyPhotoToDurableStorage } from '@/src/core/storage/durableStorage';
import { permissionHelper } from '@/src/core/permissions/permissionHelper';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

const SAMSUNG = {
  bg: '#000000',
  panel: '#1C1C1E',
  circle: '#2C2C2E',
  circleSelected: '#3A3A3C',
  pillBtn: '#3A3A3C',
  skipBtn: '#2C2C2E',
  text: '#FFFFFF',
  textMuted: '#8E8E93',
} as const;

const GRID_COLUMNS = 4;
const GRID_H_PADDING = 20;
const GRID_GAP = 14;

export default function ShapeScreen() {
  const { width } = useWindowDimensions();
  const { draft, setAppearance } = useWizardStore();
  const [previewUri, setPreviewUri] = useState(draft.photoUri);

  const previewShape = draft.pillShape ?? 'capsule_divided';
  const previewColor = draft.pillColor ?? SHAPE_PREVIEW_COLOR;
  const dualPreview = supportsDualColor(previewShape) && draft.pillColor2 != null;
  const subtitle = formatStrengthSubtitle(
    draft.medicationType,
    draft.strengthValue,
    draft.strengthUnit,
    draft.doseUnitValue,
    draft.doseUnitUnit,
  );

  const tileSize = Math.floor(
    (width - GRID_H_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  );

  const pickImage = async (source: 'camera' | 'gallery') => {
    const perm = source === 'camera' ? 'camera' : 'photos';
    await permissionHelper.request(perm);

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true });

    if (!result.canceled && result.assets[0]) {
      const photoId = uuidv4();
      const durableUri = await copyPhotoToDurableStorage(result.assets[0].uri, photoId);
      setPreviewUri(durableUri);
      setAppearance(draft.pillShape, draft.pillColor, durableUri);
    }
  };

  const selectShape = (shape: PillShape) => {
    setPreviewUri(undefined);
    setAppearance(
      shape,
      draft.pillColor,
      undefined,
      supportsDualColor(shape) ? draft.pillColor2 : undefined,
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.topSection}>
        <View style={styles.previewCircle} accessibilityLabel="Selected pill shape preview">
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={styles.photoPreview}
              accessibilityLabel="Pill photo preview"
            />
          ) : (
            <PillShapeIcon
              shape={previewShape}
              color={previewColor}
              color2={dualPreview ? draft.pillColor2 : undefined}
              size={72}
            />
          )}
        </View>

        <Text variant="titleLarge" style={styles.medName} numberOfLines={2}>
          {draft.name || 'Medication'}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>

        <View style={styles.photoActions}>
          <Pressable
            style={styles.pillBtn}
            onPress={() => pickImage('gallery')}
            accessibilityRole="button"
            accessibilityLabel="Gallery"
          >
            <Text style={styles.pillBtnText}>Gallery</Text>
          </Pressable>
          <Pressable
            style={styles.pillBtn}
            onPress={() => pickImage('camera')}
            accessibilityRole="button"
            accessibilityLabel="Camera"
          >
            <Text style={styles.pillBtnText}>Camera</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomPanel}>
        <ScrollView
          style={styles.gridScroll}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        >
          {PILL_SHAPE_CATEGORIES.map((category) => (
            <View key={category.title} style={styles.categorySection}>
              <Text variant="titleMedium" style={styles.categoryTitle}>
                {category.title}
              </Text>
              <View style={styles.grid}>
                {category.shapes.map((shape) => {
                  const selected = draft.pillShape === shape && !previewUri;
                  return (
                    <Pressable
                      key={shape}
                      onPress={() => selectShape(shape)}
                      style={[
                        styles.shapeCircle,
                        { width: tileSize, height: tileSize, borderRadius: tileSize / 2 },
                        selected && styles.shapeCircleSelected,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Shape ${formatShapeLabel(shape)}`}
                    >
                      <PillShapeIcon
                        shape={shape}
                        color={SHAPE_GRID_COLOR}
                        size={Math.round(tileSize * 0.52)}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footerActions}>
          <Pressable
            style={styles.footerBtn}
            onPress={() => router.push('/medicine/colour')}
            accessibilityRole="button"
            accessibilityLabel="Skip"
          >
            <Text style={styles.footerBtnText}>Skip</Text>
          </Pressable>
          <Pressable
            style={[styles.footerBtn, styles.footerBtnPrimary]}
            onPress={() => router.push('/medicine/colour')}
            accessibilityRole="button"
            accessibilityLabel="Next"
          >
            <Text style={[styles.footerBtnText, styles.footerBtnTextPrimary]}>Next</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SAMSUNG.bg,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  previewCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: SAMSUNG.circle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  photoPreview: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  medName: {
    color: SAMSUNG.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: SAMSUNG.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  pillBtn: {
    backgroundColor: SAMSUNG.pillBtn,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 110,
    alignItems: 'center',
  },
  pillBtnText: {
    color: SAMSUNG.text,
    fontSize: 15,
    fontWeight: '500',
  },
  bottomPanel: {
    flex: 1,
    backgroundColor: SAMSUNG.panel,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
  },
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: GRID_H_PADDING,
    paddingTop: 4,
    paddingBottom: 96,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    color: SAMSUNG.text,
    fontWeight: '600',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    justifyContent: 'flex-start',
  },
  shapeCircle: {
    backgroundColor: SAMSUNG.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shapeCircleSelected: {
    backgroundColor: SAMSUNG.circleSelected,
    borderWidth: 2,
    borderColor: '#636366',
  },
  footerActions: {
    position: 'absolute',
    left: GRID_H_PADDING,
    right: GRID_H_PADDING,
    bottom: 24,
    flexDirection: 'row',
    gap: 12,
  },
  footerBtn: {
    flex: 1,
    backgroundColor: SAMSUNG.skipBtn,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerBtnPrimary: {
    backgroundColor: healthOsTheme.colors.primary,
  },
  footerBtnText: {
    color: SAMSUNG.text,
    fontSize: 16,
    fontWeight: '500',
  },
  footerBtnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
