import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Mail Sender",
  description: "Send individual emails with a custom subject, message and resume attachment",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
