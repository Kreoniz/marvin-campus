import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toast } from 'unlikely-ui/toast';
import ComparisonPage from './components/ComparisonPage.tsx';

const client = new QueryClient();
export default function App() {
  return (
    <QueryClientProvider client={client}>
      <Toast.Provider limit={3}>
        <ComparisonPage />
      </Toast.Provider>
    </QueryClientProvider>
  );
}
