import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Validate a session token
export const validate = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    if (session.role === "retailer" && session.retailerId) {
      const retailer = await ctx.db.get(session.retailerId);
      return { role: "retailer" as const, retailer, session };
    }

    if (session.role === "customer" && session.customerId) {
      const customer = await ctx.db.get(session.customerId);
      return { role: "customer" as const, customer, session };
    }

    return null;
  },
});

// Delete session (logout)
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

// Generate a file upload URL
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get a file URL from storage ID
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
