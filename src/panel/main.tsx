import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createDevtoolsNetworkSource,
  getDevtoolsTheme,
  isDevtoolsContext,
} from '../network/devtools';
import { App } from './App';
import { StatusMessage } from './components/StatusMessage';
import '../styles/panel.css';

const container = document.getElementById('root');
if (!container) throw new Error('JSONDrill: the #root element is missing from panel.html.');

const root = createRoot(container);

if (isDevtoolsContext()) {
  document.documentElement.dataset.theme = getDevtoolsTheme();
  root.render(
    <StrictMode>
      <App network={createDevtoolsNetworkSource()} />
    </StrictMode>,
  );
} else {
  root.render(
    <StatusMessage tone="error">
      JSONDrill runs inside Chrome DevTools. Open DevTools and select the JSONDrill panel.
    </StatusMessage>,
  );
}
