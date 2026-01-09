import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { provisioningApi } from '@/services/provisioningApi'
import { serverLogger } from '@/utils/serverLogger'

serverLogger.info('[Config] Application starting', {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  useStubApi: import.meta.env.VITE_USE_STUB_API,
});

provisioningApi.configure({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  enableStubMode: import.meta.env.VITE_USE_STUB_API === 'true',
})

createRoot(document.getElementById("root")!).render(<App />);
