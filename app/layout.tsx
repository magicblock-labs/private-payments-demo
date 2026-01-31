import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import '@/styles/index.css';

export const metadata = {
  title: 'Private Payments',
  description: 'Private payments for Solana by MagicBlock',
  openGraph: {
    title: 'Private Payments',
    description: 'Private payments for Solana by MagicBlock',
    url: 'https://private-payments.magicblock.app',
    images: ['/icon.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <html lang='en' suppressHydrationWarning>
        <head />
        <body>
          <ThemeProvider
            attribute='class'
            defaultTheme='dark'
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
          <Toaster richColors closeButton position='top-center' />
        </body>
      </html>
    </>
  );
}
