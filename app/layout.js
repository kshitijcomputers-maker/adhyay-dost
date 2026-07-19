export const metadata = {
  title: 'अध्याय दोस्त',
  description: 'AI se padhai, dost jaisi',
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <body style={{ margin: 0, fontFamily: 'Inter, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
