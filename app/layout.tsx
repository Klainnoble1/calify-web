import '../styles/globals.css';
import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  metadataBase: new URL('https://calify.app'),
  title: {
    default: 'Calify - Video Calls & VoIP for Everyone',
    template: '%s | Calify',
  },
  description:
    'Calify is a premium communication platform for video calls, scheduled PSTN outreach, AI-assisted calling, and VoIP - all in one place.',
  twitter: {
    creator: '@calify',
    site: '@calify',
    card: 'summary_large_image',
    images: ['/images/calify-open-graph.png'],
  },
  openGraph: {
    url: 'https://calify.app',
    siteName: 'Calify',
    title: 'Calify',
    description:
      'Premium video calls, scheduled PSTN outreach, AI-assisted calling, and VoIP in one place.',
    images: ['/images/calify-open-graph.png'],
  },
  icons: {
    icon: [
      { rel: 'icon', url: '/favicon.ico' },
      { rel: 'icon', url: '/images/calify-icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ rel: 'apple-touch-icon', url: '/images/calify-apple-touch.png' }],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#1a73e8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-lk-theme="default">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#292a2d',
              color: '#e8eaed',
              border: '1px solid #3c4043',
              borderRadius: '10px',
              fontSize: '13px',
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
