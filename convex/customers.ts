import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get or create customer by mobile
export const getOrCreate = mutation({
  args: {
    name: v.string(),
    mobile: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_mobile", (q) => q.eq("mobile", args.mobile))
      .first();

    if (existing) {
      // Update name if changed
      if (existing.name !== args.name) {
        await ctx.db.patch(existing._id, { name: args.name });
      }

      // Create session
      const token = generateToken();
      await ctx.db.insert("sessions", {
        customerId: existing._id,
        role: "customer",
        token,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      return { customerId: existing._id, token };
    }

    const customerId = await ctx.db.insert("customers", {
      name: args.name,
      mobile: args.mobile,
    });

    const token = generateToken();
    await ctx.db.insert("sessions", {
      customerId,
      role: "customer",
      token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    return { customerId, token };
  },
});

// Get customer by ID
export const getById = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
