import '@fontsource-variable/archivo/wdth.css';
import './globals.css';

export const metadata = {
  title: 'A-Roof — UPVC roofing sheets',
  description:
    'UPVC roofing sheets that hold their colour and their shape, season after season. Tile and Trafford profiles, rolled since 1984.',
};

export const viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
