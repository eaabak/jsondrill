import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Viewer } from './Viewer';
import '../styles/panel.css';

const container = document.getElementById('root');
if (!container) throw new Error('JSONDrill: the #root element is missing from viewer.html.');

const darkScheme = matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => {
  document.documentElement.dataset.theme = darkScheme.matches ? 'dark' : 'light';
};
applyTheme();
darkScheme.addEventListener('change', applyTheme);

createRoot(container).render(
  <StrictMode>
    <Viewer />
  </StrictMode>,
);
