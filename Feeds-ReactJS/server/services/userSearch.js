import User from "../models/users_schema.js";
import { searchUsersInSolr, upsertUserInSolr } from "./solr.js";

function buildMongoRegex(query) {
  return query && query.trim().length > 0 ? new RegExp(query, "i") : /.*/;
}

async function hydrateUsersInOrder(usernames) {
  if (!usernames?.length) {
    return [];
  }

  const users = await User.find({
    username: { $in: usernames },
  }).lean();

  const userByUsername = new Map(users.map(user => [user.username, user]));

  return usernames
    .map(username => userByUsername.get(username))
    .filter(Boolean);
}

export async function searchUsersWithFallback({
  query = "",
  excludeUsername,
  limit = 50,
} = {}) {
  const solrUsernames = await searchUsersInSolr({
    query,
    excludeUsername,
    limit,
  });

  if (Array.isArray(solrUsernames) && solrUsernames.length > 0) {
    return hydrateUsersInOrder(solrUsernames);
  }

  const regex = buildMongoRegex(query);
  const users = await User.find({
    username: { $ne: excludeUsername },
    $or: [{ username: regex }, { display_name: regex }, { fullName: regex }],
  })
    .limit(limit)
    .lean();

  await Promise.all(users.map(user => upsertUserInSolr(user)));

  return users;
}
