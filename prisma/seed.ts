import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { hashPassword } from "../src/lib/auth"

const connectionString = process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  // 1. Create Default Roles and Permissions
  const defaultRoles = [
    {
      name: "SUPER_ADMIN",
      description: "Super Admin with unrestricted access to every module, feature, setting, and action.",
      isSystem: true,
      permissions: [
        { module: "DASHBOARD", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "CLIENTS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "PRODUCTS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "QUOTATIONS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true, canApplySpecialDiscount: true },
        { module: "BOQS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "PURCHASE_ORDERS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "REPORTS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "USER_MANAGEMENT", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "SETTINGS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "PRICING_MARKUP", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "ACCESS_CONTROL", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "NOTIFICATIONS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "SHAREPOINT", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "SYSTEM_CONFIGURATION", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true }
      ]
    },
    {
      name: "ADMIN",
      description: "Admin user with full access to modules except Access Control.",
      isSystem: true,
      permissions: [
        { module: "DASHBOARD", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "CLIENTS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "PRODUCTS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "QUOTATIONS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true, canApplySpecialDiscount: true },
        { module: "BOQS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "PURCHASE_ORDERS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "REPORTS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "USER_MANAGEMENT", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "SETTINGS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "PRICING_MARKUP", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "ACCESS_CONTROL", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "NOTIFICATIONS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "SHAREPOINT", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "SYSTEM_CONFIGURATION", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true }
      ]
    },
    {
      name: "MANAGER",
      description: "Sales Manager / Department Manager with approval authority.",
      isSystem: true,
      permissions: [
        { module: "DASHBOARD", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "DEPARTMENT", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "CLIENTS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "DEPARTMENT", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "PRODUCTS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "QUOTATIONS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "DEPARTMENT", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true, canApplySpecialDiscount: true },
        { module: "BOQS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "DEPARTMENT", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "PURCHASE_ORDERS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "DEPARTMENT", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "REPORTS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: false, share: false, manage: false, ownership: "DEPARTMENT", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "USER_MANAGEMENT", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SETTINGS", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PRICING_MARKUP", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "ACCESS_CONTROL", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "NOTIFICATIONS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "DEPARTMENT", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "SHAREPOINT", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "DEPARTMENT", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "SYSTEM_CONFIGURATION", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false }
      ]
    },
    {
      name: "SALES_EXECUTIVE",
      description: "Sales Executive responsible for creating quotations and BOQs.",
      isSystem: true,
      permissions: [
        { module: "DASHBOARD", view: true, create: true, edit: true, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: false, ownership: "OWN", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "CLIENTS", view: true, create: true, edit: true, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: false, ownership: "OWN", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PRODUCTS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: false, share: true, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "QUOTATIONS", view: true, create: true, edit: true, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: false, ownership: "OWN", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false, canApplySpecialDiscount: false },
        { module: "BOQS", view: true, create: true, edit: true, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: false, ownership: "OWN", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PURCHASE_ORDERS", view: true, create: true, edit: true, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: false, ownership: "OWN", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "REPORTS", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "USER_MANAGEMENT", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SETTINGS", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PRICING_MARKUP", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "ACCESS_CONTROL", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "NOTIFICATIONS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "OWN", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SHAREPOINT", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "OWN", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SYSTEM_CONFIGURATION", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false }
      ]
    },
    {
      name: "INTERIOR_DESIGN_CONSULTANT",
      description: "Interior Design Consultant focused on BOQs and product selections.",
      isSystem: true,
      permissions: [
        { module: "DASHBOARD", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "CLIENTS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PRODUCTS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: true, uploadFiles: false, share: true, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "QUOTATIONS", view: true, create: true, edit: true, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false, canApplySpecialDiscount: true },
        { module: "BOQS", view: true, create: true, edit: true, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PURCHASE_ORDERS", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "REPORTS", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "USER_MANAGEMENT", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SETTINGS", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PRICING_MARKUP", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "ACCESS_CONTROL", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "NOTIFICATIONS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SHAREPOINT", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SYSTEM_CONFIGURATION", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false }
      ]
    },
    {
      name: "ACCOUNTS",
      description: "Finance and Accounts user with view/export access and payment approvals.",
      isSystem: true,
      permissions: [
        { module: "DASHBOARD", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "CLIENTS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: true, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PRODUCTS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "QUOTATIONS", view: true, create: false, edit: false, delete: false, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: false, manage: false, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true, canApplySpecialDiscount: false },
        { module: "BOQS", view: true, create: false, edit: false, delete: false, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: false, manage: false, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "PURCHASE_ORDERS", view: true, create: false, edit: false, delete: false, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: false, manage: false, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "REPORTS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "USER_MANAGEMENT", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SETTINGS", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PRICING_MARKUP", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "ACCESS_CONTROL", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "NOTIFICATIONS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "SHAREPOINT", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: true, profitVisible: true, markupVisible: true },
        { module: "SYSTEM_CONFIGURATION", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false }
      ]
    },
    {
      name: "PROCUREMENT",
      description: "Procurement user focused on Purchase Orders and Product costing.",
      isSystem: true,
      permissions: [
        { module: "DASHBOARD", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "CLIENTS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PRODUCTS", view: true, create: true, edit: true, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: false, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "QUOTATIONS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: true, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false, canApplySpecialDiscount: false },
        { module: "BOQS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PURCHASE_ORDERS", view: true, create: true, edit: true, delete: false, approve: false, reject: false, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: false, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "REPORTS", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "USER_MANAGEMENT", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SETTINGS", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PRICING_MARKUP", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "ACCESS_CONTROL", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "NOTIFICATIONS", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SHAREPOINT", view: true, create: true, edit: true, delete: true, approve: true, reject: true, export: true, downloadPdf: true, uploadFiles: true, share: true, manage: true, ownership: "ALL", costPriceVisible: true, dealerPriceVisible: true, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SYSTEM_CONFIGURATION", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false }
      ]
    },
    {
      name: "VIEWER",
      description: "Read-only viewer with restricted pricing/margin visibility.",
      isSystem: true,
      permissions: [
        { module: "DASHBOARD", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: true, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "CLIENTS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PRODUCTS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: true, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "QUOTATIONS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: true, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false, canApplySpecialDiscount: false },
        { module: "BOQS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: true, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PURCHASE_ORDERS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: true, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "REPORTS", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "USER_MANAGEMENT", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SETTINGS", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "PRICING_MARKUP", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "ACCESS_CONTROL", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "NOTIFICATIONS", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SHAREPOINT", view: true, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "ALL", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false },
        { module: "SYSTEM_CONFIGURATION", view: false, create: false, edit: false, delete: false, approve: false, reject: false, export: false, downloadPdf: false, uploadFiles: false, share: false, manage: false, ownership: "NONE", costPriceVisible: false, dealerPriceVisible: false, marginVisible: false, profitVisible: false, markupVisible: false }
      ]
    }
  ]

  for (const roleDef of defaultRoles) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
    })

    // Delete existing permissions for this role to avoid duplicates or orphans
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id }
    })

    // Bulk insert default permissions for this role
    for (const perm of roleDef.permissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          ...perm,
        }
      })
    }
  }
  console.log("Roles and permissions seeded successfully.")

  // 2. Create Default Users (including SUPER_ADMIN)
  const superAdminUser = await prisma.user.upsert({
    where: { email: "superadmin@bosq.ae" },
    update: {
      password: hashPassword("SuperAdminPassword123"),
      role: "SUPER_ADMIN",
    },
    create: {
      name: "Super Admin User",
      email: "superadmin@bosq.ae",
      password: hashPassword("SuperAdminPassword123"),
      role: "SUPER_ADMIN",
    },
  })

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@bosq.ae" },
    update: {
      password: hashPassword("AdminPassword123"),
      role: "ADMIN",
    },
    create: {
      name: "Admin User",
      email: "admin@bosq.ae",
      password: hashPassword("AdminPassword123"),
      role: "ADMIN",
    },
  })

  const salesUser = await prisma.user.upsert({
    where: { email: "sales@bosq.ae" },
    update: {
      password: hashPassword("SalesPassword123"),
      role: "SALES_EXECUTIVE",
    },
    create: {
      name: "John Doe",
      email: "sales@bosq.ae",
      password: hashPassword("SalesPassword123"),
      role: "SALES_EXECUTIVE",
    },
  })

  console.log("Users seeded successfully.")

  // 3. Create Default Payment Terms
  const paymentTerms = [
    { name: "50% Advance, 50% on Delivery", description: "50% advance payment with purchase order, balance 50% on delivery", isDefault: true },
    { name: "100% Advance", description: "100% advance payment with purchase order", isDefault: false },
    { name: "30 Days PDC", description: "30 Days Post-Dated Cheque from delivery date", isDefault: false },
  ]

  for (const term of paymentTerms) {
    await prisma.paymentTerm.upsert({
      where: { name: term.name },
      update: {},
      create: term,
    })
  }

  console.log("Payment terms seeded successfully.")

  // 4. Create Default Terms & Conditions
  const termsConditions = [
    { title: "Delivery Time", content: "Delivery will be within 4-6 weeks from receipt of advance payment and approved drawing.", isDefault: true },
    { title: "Validity", content: "This quotation is valid for 30 days from the date of issue.", isDefault: true },
    { title: "Warranty", content: "All structural components carry a warranty of 5 years against manufacturing defects.", isDefault: true },
    { title: "Vat Clause", content: "5% VAT will be applicable on all prices as per UAE Federal Law.", isDefault: true },
  ]

  for (const tc of termsConditions) {
    await prisma.termsCondition.upsert({
      where: { title: tc.title },
      update: {},
      create: tc,
    })
  }

  console.log("Terms & Conditions seeded successfully.")

  // 5. Create Default Clients
  const clients = [
    {
      clientId: "C-1001",
      companyName: "Acme Corp",
      contactPerson: "John Smith",
      email: "john@acme.com",
      phone: "+971 50 123 4567",
      clientType: "Project",
      address: "Downtown Dubai, UAE",
      trn: "100012345678901",
      salespersonId: salesUser.id,
    },
    {
      clientId: "C-1002",
      companyName: "TechFlow LLC",
      contactPerson: "Sarah Johnson",
      email: "sarah@techflow.ae",
      phone: "+971 55 987 6543",
      clientType: "Project",
      address: "Dubai Internet City, UAE",
      trn: "100012345678902",
      salespersonId: salesUser.id,
    },
    {
      clientId: "C-1003",
      companyName: "Global Trade Inc",
      contactPerson: "Ahmed Ali",
      email: "ahmed@globaltrade.com",
      phone: "+971 52 456 7890",
      clientType: "Project",
      address: "Deira, Dubai, UAE",
      trn: "100012345678903",
      salespersonId: salesUser.id,
    },
  ]

  for (const client of clients) {
    await prisma.client.upsert({
      where: { clientId: client.clientId },
      update: {},
      create: client,
    })
  }

  console.log("Clients seeded successfully.")

  // 6. Create Product Categories and Products
  const categories = [
    { name: "Workstations", description: "Office workstations and desks systems" },
    { name: "Executive desks", description: "Premium executive wood and steel desks" },
    { name: "Ergonomic chairs", description: "High back and mid back task seating chairs" },
  ]

  for (const cat of categories) {
    const category = await prisma.productCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })

    if (cat.name === "Workstations") {
      await prisma.product.upsert({
        where: { productCode: "WS-01" },
        update: {},
        create: {
          productCode: "WS-01",
          productName: "Linear Workstation for 4",
          categoryId: category.id,
          unitPrice: 2450.00,
          costPrice: 1600.00,
          interiorPrice: 2200.00,
          dealerPrice: 2000.00,
          projectPrice: 2450.00,
          specialPrice: 2500.00,
          availableColors: "White, Walnut, Oak",
          dimensions: "2400x1200x750 mm",
          warranty: "5 Years",
          description: "4-seater linear workstation with screen dividers and metal legs",
          specifications: "25mm MDF top with PVC edge, aluminum screen divider with fabric pinning board, steel legs with cable management."
        }
      })
    } else if (cat.name === "Executive desks") {
      await prisma.product.upsert({
        where: { productCode: "ED-05" },
        update: {},
        create: {
          productCode: "ED-05",
          productName: "Executive Desk L-Shape",
          categoryId: category.id,
          unitPrice: 4200.00,
          costPrice: 2800.00,
          interiorPrice: 3800.00,
          dealerPrice: 3500.00,
          projectPrice: 4200.00,
          specialPrice: 4400.00,
          availableColors: "Mahogany, Charcoal, Walnut",
          dimensions: "2000x1600x750 mm",
          warranty: "5 Years",
          description: "Premium L-shaped executive desk with side return cabinet",
          specifications: "MDF wood veneer finish, high-quality leather pad insert, soft-close side cabinet with drawers and cable access."
        }
      })
    } else if (cat.name === "Ergonomic chairs") {
      await prisma.product.upsert({
        where: { productCode: "EC-12" },
        update: {},
        create: {
          productCode: "EC-12",
          productName: "Ergonomic Mesh Chair",
          categoryId: category.id,
          unitPrice: 850.00,
          costPrice: 500.00,
          interiorPrice: 750.00,
          dealerPrice: 700.00,
          projectPrice: 850.00,
          specialPrice: 900.00,
          availableColors: "Black, Grey, Blue",
          dimensions: "650x650x1200 mm",
          warranty: "3 Years",
          description: "Premium mesh high-back chair with lumbar support",
          specifications: "Breathable Korean mesh, 3D adjustable armrests, multi-lock synchronized mechanism, class-4 gas lift."
        }
      })
    }
  }

  console.log("Products and Categories seeded successfully.")

  // 7. Create a Demo Quotation
  const dbClient = await prisma.client.findFirst({ where: { clientId: "C-1001" } })
  const dbProduct = await prisma.product.findFirst({ where: { productCode: "WS-01" } })

  if (dbClient && dbProduct) {
    const quoteNo = "I1951"
    const existingQuote = await prisma.quotation.findUnique({ where: { quotationNumber: quoteNo } })

    if (!existingQuote) {
      const subtotal = dbProduct.unitPrice * 2
      const vatAmount = subtotal * 0.05
      const grandTotal = subtotal + vatAmount

      await prisma.quotation.create({
        data: {
          quotationNumber: quoteNo,
          customerSegment: "Interior",
          clientId: dbClient.id,
          projectName: "HQ Office Fitout",
          validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          preparedById: salesUser.id,
          paymentTerms: "50% Advance, 50% on Delivery",
          status: "APPROVED",
          poStatus: "RECEIVED",
          revisionNumber: 1,
          subtotal,
          vatAmount,
          grandTotal,
          sharepointUrl: `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(dbClient.companyName)}/Quotations/${quoteNo}-1_${encodeURIComponent(dbClient.companyName)}.pdf`,
          items: {
            create: {
              itemNo: 1,
              productId: dbProduct.id,
              description: dbProduct.productName,
              specifications: dbProduct.specifications,
              quantity: 2,
              unitPrice: dbProduct.unitPrice,
              margin: 0.0,
              amount: subtotal,
            }
          }
        }
      })
      console.log("Demo Quotation seeded successfully.")
    }
  }

  console.log("Seeding complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
