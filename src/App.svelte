<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import ComparisonPage from './components/ComparisonPage.svelte';
  const client = new QueryClient();
</script>

<QueryClientProvider {client}><ComparisonPage /></QueryClientProvider>
