import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all clothes for a retailer
export const getByRetailer = query({
  args: { retailerId: v.id("retailers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clothes")
      .withIndex("by_retailer", (q) => q.eq("retailerId", args.retailerId))
      .collect();
  },
});

// Add a clothing item
export const add = mutation({
  args: {
    retailerId: v.id("retailers"),
    type: v.string(),
    sizes: v.array(v.string()),
    imageUrl: v.string(),
    category: v.union(v.literal("top"), v.literal("bottom")),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("clothes", {
      retailerId: args.retailerId,
      type: args.type,
      sizes: args.sizes,
      imageUrl: args.imageUrl,
      category: args.category,
    });
    return await ctx.db.get(id);
  },
});

// Delete a clothing item
export const remove = mutation({
  args: { id: v.id("clothes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
