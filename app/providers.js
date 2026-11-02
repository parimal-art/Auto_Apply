"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";

export default function Providers({ children }) {
  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#4f46e5",
            borderRadius: 12,
            fontFamily:
              'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          },
          components: {
            Button: { controlHeight: 40, fontWeight: 600 },
            Input: { controlHeight: 42 },
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
