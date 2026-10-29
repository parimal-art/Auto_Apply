import "./globals.css";

export const metadata = {
  title: "Mail Sender",
  description: "Send individual emails with a custom subject, message and resume attachment",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
