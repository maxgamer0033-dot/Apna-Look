import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get a retailer by their ID
export const getById = query({
  args: { id: v.id("retailers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get a retailer by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("retailers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Create or update a retailer (upsert by email)
export const upsert = mutation({
  args: {
    email: v.string(),
    shopName: v.string(),
    phoneNumber: v.string(),
    location: v.string(),
    authProvider: v.optional(v.string()),
    fullName: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("retailers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        shopName: args.shopName,
        phoneNumber: args.phoneNumber,
        location: args.location,
        authProvider: args.authProvider,
        fullName: args.fullName,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("retailers", {
        email: args.email,
        shopName: args.shopName,
        phoneNumber: args.phoneNumber,
        location: args.location,
        authProvider: args.authProvider || "email",
        fullName: args.fullName || "",
        password: args.password,
      });
    }
  },
});

// Sign up a retailer with email/password
export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existing = await ctx.db
      .query("retailers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("An account with this email already exists");
    }

    const retailerId = await ctx.db.insert("retailers", {
      email: args.email,
      password: args.password, // In production, hash this!
      shopName: "",
      phoneNumber: "",
      location: "",
      authProvider: "email",
      fullName: args.fullName,
    });

    // Create session
    const token = generateToken();
    await ctx.db.insert("sessions", {
      retailerId,
      role: "retailer",
      token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return { retailerId, token };
  },
});

// Sign in a retailer with email/password
export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const retailer = await ctx.db
      .query("retailers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!retailer) {
      throw new Error("Invalid email or password");
    }

    if (retailer.password !== args.password) {
      throw new Error("Invalid email or password");
    }

    // Create session
    const token = generateToken();
    await ctx.db.insert("sessions", {
      retailerId: retailer._id,
      role: "retailer",
      token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    return { retailerId: retailer._id, token };
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
