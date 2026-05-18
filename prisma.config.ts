import "dotenv/config"
import { defineConfig } from "prisma/config"

console.log("DATABASE_URL from env:", process.env.DATABASE_URL ? "Defined" : "Undefined")

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
