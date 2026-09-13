import { useCallback, useEffect, useState } from 'react';
import { FlatList, Keyboard, Platform, StyleSheet, View } from 'react-native';
import { Button, Dialog, List, Portal, Searchbar, Text, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWizardStore } from '@/src/features/medications/wizardStore';
import { useDatabaseBootstrap } from '@/src/db/DbProvider';
import {
  CatalogCacheRepository,
  mergeAndRankResults,
  parseCachedResults,
  searchDsld,
  searchRxTerms,
  type CatalogResult,
} from '@/src/features/catalog/catalogService';
import { buildCatalogPrefill } from '@/src/features/catalog/catalogPrefill';
import { searchIndiaCatalogAsync } from '@/src/features/catalog/indiaCatalog';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { MedicationRepository } from '@/src/features/medications/medicationRepository';
import {
  findEarlyDuplicateMedicationConflict,
  type DuplicateMedicationConflict,
} from '@/src/features/medications/duplicateMedicationService';
import { DuplicateMedicationDialog } from '@/src/core/components/DuplicateMedicationDialog';

async function loadCachedOrFetch(
  cache: CatalogCacheRepository | null,
  source: 'india' | 'rxterms' | 'dsld',
  query: string,
  fetcher: (q: string) => Promise<CatalogResult[]>,
): Promise<CatalogResult[]> {
  if (cache) {
    const cached = cache.get(source, query);
    if (cached) {
      const parsed = parseCachedResults(cached);
      if (parsed.length > 0 || cached === '[]') return parsed;
      cache.delete(source, query);
    }
  }

  const results = await fetcher(query);
  cache?.set(source, query, JSON.stringify(results));
  return results;
}

const KEYBOARD_FOOTER_GAP = 16;

export default function SearchScreen() {
  const { setName, setCatalogId, setMedicationType, setStrength, reset } = useWizardStore();
  const insets = useSafeAreaInsets();
  const dbState = useDatabaseBootstrap();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customDialog, setCustomDialog] = useState(false);
  const [customName, setCustomName] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [duplicateConflict, setDuplicateConflict] = useState<DuplicateMedicationConflict | null>(
    null,
  );

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardInset(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const dbReady = dbState.status === 'ready';
  const db = dbReady ? dbState.db : null;

  const search = useCallback(async () => {
    if (debounced.length < 2) {
      setResults([]);
      setErrorMessage(null);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const cache = db ? new CatalogCacheRepository(db) : null;
      const [india, rx, dsld] = await Promise.all([
        loadCachedOrFetch(cache, 'india', debounced, searchIndiaCatalogAsync),
        loadCachedOrFetch(cache, 'rxterms', debounced, searchRxTerms),
        loadCachedOrFetch(cache, 'dsld', debounced, searchDsld),
      ]);

      const merged = mergeAndRankResults([india, rx, dsld], debounced);
      setResults(merged);

      if (merged.length === 0) {
        setErrorMessage(
          'No matches found. Try another spelling, check your connection for online catalogs, or add a custom medication.',
        );
      }
    } catch (error) {
      setResults([]);
      setErrorMessage(
        error instanceof Error ? error.message : 'Search failed. Please try again or add a custom medication.',
      );
    } finally {
      setLoading(false);
    }
  }, [debounced, db]);

  useEffect(() => {
    void search();
  }, [search]);

  const continueWithMedicationName = (
    name: string,
    onContinue: () => void,
  ): boolean => {
    if (dbState.status === 'ready') {
      const medRepo = new MedicationRepository(dbState.db);
      const conflict = findEarlyDuplicateMedicationConflict(medRepo, name);
      if (conflict) {
        setDuplicateConflict(conflict);
        return false;
      }
    }
    onContinue();
    return true;
  };

  const selectResult = (item: CatalogResult) => {
    continueWithMedicationName(item.name, () => {
      setName(item.name);
      setCatalogId(item.id);

      const prefill = buildCatalogPrefill(item);
      if (prefill?.medicationType) {
        setMedicationType(prefill.medicationType);
      }
      if (prefill?.strengthValue != null && prefill.strengthUnit) {
        setStrength(prefill.strengthValue, prefill.strengthUnit);
      }

      router.push('/medicine/configure');
    });
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    continueWithMedicationName(name, () => {
      setName(name);
      setCustomDialog(false);
      router.push('/medicine/configure');
    });
  };

  const footerPaddingBottom =
    keyboardInset > 0 ? KEYBOARD_FOOTER_GAP : Math.max(insets.bottom, 16);

  return (
    <View style={[styles.container, keyboardInset > 0 && { paddingBottom: keyboardInset }]}>
      <Searchbar
        placeholder="Search medicines or supplements"
        value={query}
        onChangeText={setQuery}
        accessibilityLabel="Search medicines"
        autoFocus
        style={styles.searchbar}
        inputStyle={styles.searchInput}
      />
      {loading && <ActivityIndicator style={styles.loader} color={healthOsTheme.colors.primary} />}
      {!loading && errorMessage && (
        <Text variant="bodyMedium" style={styles.hint}>
          {errorMessage}
        </Text>
      )}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={[item.strength, item.type, item.source].filter(Boolean).join(' · ')}
            onPress={() => selectResult(item)}
            titleStyle={styles.resultTitle}
            descriptionStyle={styles.resultDescription}
            style={styles.resultItem}
          />
        )}
      />
      <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
        <Button
          mode="outlined"
          onPress={() => {
            setCustomName(query.trim());
            setCustomDialog(true);
          }}
        >
          Add custom medication
        </Button>
      </View>
      <DuplicateMedicationDialog
        visible={duplicateConflict != null}
        conflict={duplicateConflict}
        onDismiss={() => setDuplicateConflict(null)}
        onEditExisting={() => {
          if (!duplicateConflict) return;
          const medicationId = duplicateConflict.medication.id;
          setDuplicateConflict(null);
          setCustomDialog(false);
          reset();
          router.replace(`/medicine/${medicationId}`);
        }}
      />

      <Portal>
        <Dialog visible={customDialog} onDismiss={() => setCustomDialog(false)}>
          <Dialog.Title>Custom medication</Dialog.Title>
          <Dialog.Content>
            <Searchbar
              placeholder="Enter name"
              value={customName}
              onChangeText={setCustomName}
              accessibilityLabel="Custom medication name"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCustomDialog(false)}>Cancel</Button>
            <Button onPress={addCustom}>Continue</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: healthOsTheme.colors.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: healthOsTheme.colors.outlineVariant,
    backgroundColor: healthOsTheme.colors.background,
  },
  searchbar: {
    backgroundColor: healthOsTheme.colors.surfaceVariant,
    marginBottom: 8,
  },
  searchInput: {
    color: healthOsTheme.colors.onSurface,
  },
  loader: { marginVertical: 8 },
  hint: {
    marginVertical: 8,
    color: healthOsTheme.colors.onSurfaceVariant,
  },
  resultItem: {
    backgroundColor: healthOsTheme.colors.surface,
    marginBottom: 4,
    borderRadius: 8,
  },
  resultTitle: {
    color: healthOsTheme.colors.onSurface,
  },
  resultDescription: {
    color: healthOsTheme.colors.onSurfaceVariant,
  },
});
