import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const currentUser = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return {
      userId: userId.toString(),
      name: user?.name || user?.email || userId.toString(),
      email: user?.email || null,
    };
  },
});

export const getUser = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, { userId }) => {
    try {
      const user: any = await ctx.db.get(userId as any);
      if (!user) return { userId, name: userId, email: null };
      return {
        userId,
        name: user.name || user.email || userId,
        email: user.email || null,
      };
    } catch {
      return { userId, name: userId, email: null };
    }
  },
});

export const findByEmail = query({
  args: { email: v.string() },
  returns: v.any(),
  handler: async (ctx, { email }) => {
    const users = await ctx.db.query("users").collect();
    const user = users.find((u: any) => u.email === email);
    if (!user) return null;
    return {
      userId: user._id.toString(),
      name: user.name || user.email,
      email: user.email,
    };
  },
});

export const getUsers = query({
  args: { userIds: v.array(v.string()) },
  returns: v.any(),
  handler: async (ctx, { userIds }) => {
    const users: Record<string, { name: string; email: string | null }> = {};
    for (const userId of userIds) {
      try {
        const user: any = await ctx.db.get(userId as any);
        users[userId] = {
          name: user?.name || user?.email || userId,
          email: user?.email || null,
        };
      } catch {
        users[userId] = { name: userId, email: null };
      }
    }
    return users;
  },
});
