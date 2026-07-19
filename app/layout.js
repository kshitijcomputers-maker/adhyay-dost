export const metadata = {
  title: 'अध्याय दोस्त',
  description: 'AI se padhai, dost jaisi',
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Inter:wght@400;500;600&family=Caveat:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, fontFamily: 'Inter, sans-serif', background: '#FBF6EC', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
