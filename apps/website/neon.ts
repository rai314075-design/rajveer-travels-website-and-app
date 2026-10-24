import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  preview: {
    buckets: {
      "bus-assets-6414": { access: "private" },
    },
  },
});
