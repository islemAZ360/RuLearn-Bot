import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// تهيئة معالج appCreator24 فورًا قبل تحميل التطبيق
import { AppCreator24Handler } from './utils/appCreator24Handler';

// إضافة فئة للجسم للتعامل مع رسائل الخطأ
document.body.classList.add('loading-startup');

if (AppCreator24Handler.isAppCreator24Environment()) {
  AppCreator24Handler.getInstance().initialize();
  console.log('تم تهيئة معالج appCreator24 في main.tsx');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
