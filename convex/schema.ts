import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  retailers: defineTable({
    email: v.string(),
    shopName: v.string(),
    phoneNumber: v.string(),
    location: v.string(),
    authProvider: v.optional(v.string()),
    fullName: v.optional(v.string()),
    password: v.optional(v.string()), // hashed password for email/password auth
  }).index("by_email", ["email"]),

  clothes: defineTable({
    retailerId: v.id("retailers"),
    type: v.string(),
    sizes: v.array(v.string()),
    imageUrl: v.string(),
    category: v.union(v.literal("top"), v.literal("bottom")),
  }).index("by_retailer", ["retailerId"]),

  customers: defineTable({
    name: v.string(),
    mobile: v.string(),
  }).index("by_mobile", ["mobile"]),

  sessions: defineTable({
    retailerId: v.optional(v.id("retailers")),
    customerId: v.optional(v.id("customers")),
    role: v.union(v.literal("retailer"), v.literal("customer")),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),
});
