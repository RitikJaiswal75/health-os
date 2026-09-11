import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Dialog, List, Portal, Searchbar, Text, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
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
import { searchIndiaCatalogAsync } from '@/src/features/catalog/indiaCatalog';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

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

export default function SearchScreen() {
  const { setName, setCatalogId, reset } = useWizardStore();
  const dbState = useDatabaseBootstrap();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customDialog, setCustomDialog] = useState(false);
  const [customName, setCustomName] = useState('');
  useEffect(() => {
    reset();
  }, [reset]);

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

  const selectResult = (item: CatalogResult) => {
    setName(item.name);
    setCatalogId(item.id);
    router.push('/medicine/configure');
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    setName(customName.trim());
    setCustomDialog(false);
    router.push('/medicine/configure');
  };

  return (
    <View style={styles.container}>
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
        ListFooterComponent={
          <Button
            mode="outlined"
            onPress={() => {
              setCustomName(query.trim());
              setCustomDialog(true);
            }}
            style={styles.custom}
          >
            Add custom medication
          </Button>
        }
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
    padding: 16,
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
  custom: { marginTop: 16, marginBottom: 24 },
});
