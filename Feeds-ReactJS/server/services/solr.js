import solr from "solr-client";

const DEFAULT_TIMEOUT_MS = 2500;
let cachedClient = null;

function getSolrBaseUrl() {
  return (process.env.SOLR_BASE_URL || "").replace(/\/+$/, "");
}

function getSolrUrlCredentials() {
  const baseUrl = getSolrBaseUrl();
  if (!baseUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(baseUrl);
    if (parsedUrl.username && parsedUrl.password) {
      return {
        username: decodeURIComponent(parsedUrl.username),
        password: decodeURIComponent(parsedUrl.password),
      };
    }
  } catch {
    return null;
  }

  return null;
}

function getSolrCore() {
  return process.env.SOLR_CORE || "";
}

function getSolrTimeoutMs() {
  const parsed = Number.parseInt(process.env.SOLR_TIMEOUT_MS || `${DEFAULT_TIMEOUT_MS}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function getAuthorizationValue() {
  const bearerToken = process.env.SOLR_BEARER_TOKEN;
  if (bearerToken) {
    return `Bearer ${bearerToken}`;
  }

  const urlCredentials = getSolrUrlCredentials();
  const username =
    process.env.SOLR_USERNAME ||
    urlCredentials?.username ||
    (process.env.SOLR_API_KEY ? "opensolr" : "");
  const password =
    process.env.SOLR_PASSWORD || urlCredentials?.password || process.env.SOLR_API_KEY;
  if (username && password) {
    return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  }

  return "";
}

function getDefaultPort(protocol) {
  return protocol === "https:" ? "443" : "80";
}

function buildClientOptions() {
  const baseUrl = getSolrBaseUrl();
  const parsedUrl = new URL(baseUrl);
  const isHttps = parsedUrl.protocol === "https:";
const buildClientOptions = {
  host: parsedUrl.hostname,
  port: parsedUrl.port || getDefaultPort(parsedUrl.protocol),
  path: parsedUrl.pathname || "/solr",
  core: getSolrCore(),
  secure: isHttps,
  tls: isHttps ? {} : undefined,
}
  console.log(buildClientOptions);
  
  return {
    host: parsedUrl.hostname,
    port: parsedUrl.port || getDefaultPort(parsedUrl.protocol),
    path: parsedUrl.pathname || "/solr",
    core: getSolrCore(),
    secure: isHttps,
    tls: isHttps ? {} : undefined,
  };
}

function getSolrClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const client = solr.createClient(buildClientOptions());
  const authorization = getAuthorizationValue();

  if (authorization.startsWith("Basic ")) {
    const encoded = authorization.slice("Basic ".length);
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex !== -1) {
      client.basicAuth(
        decoded.slice(0, separatorIndex),
        decoded.slice(separatorIndex + 1),
      );
    }
  } else if (authorization) {
    client.options.authorization = authorization;
  }

  cachedClient = client;
  return client;
}

function buildUserDocument(user) {
  return {
    id: `user:${user.username}`,
    entityType: "user",
    username: user.username,
    display_name: user.display_name || user.fullName || user.username,
    fullName: user.fullName || "",
    bio: user.bio || "",
    visibility: user.visibility || "Public",
    accountType: user.type || "Normal",
  };
}

function escapeSolrTerm(value) {
  return value.replace(/([+\-!(){}\[\]^"~*?:\\/]|&&|\|\|)/g, "\\$1");
}

function buildUserQuery(query) {
  const trimmed = (query || "").trim();
  if (!trimmed) {
    return "*:*";
  }

  const tokens = trimmed
    .split(/\s+/)
    .map(token => escapeSolrTerm(token))
    .filter(Boolean);

  if (!tokens.length) {
    return "*:*";
  }

  return tokens.map(token => `${token}*`).join(" AND ");
}

async function withTimeout(task) {
  return Promise.race([
    task,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Solr request timed out")), getSolrTimeoutMs()),
    ),
  ]);
}

export function isSolrEnabled() {
  return Boolean(getSolrBaseUrl() && getSolrCore());
}

export async function upsertUsersInSolr(users) {
  if (!isSolrEnabled() || !Array.isArray(users) || users.length === 0) {
    return false;
  }

  const documents = users
    .filter(user => user?.username)
    .map(user => buildUserDocument(user));

  if (!documents.length) {
    return false;
  }

  try {
    const client = getSolrClient();
    await withTimeout(client.add(documents, { commitWithin: 1000 }));
    return true;
  } catch (error) {
    console.error("Solr bulk user upsert failed:", error.message);
    return false;
  }
}

export async function upsertUserInSolr(user) {
  return upsertUsersInSolr([user]);
}

export async function removeUserFromSolr(username) {
  if (!isSolrEnabled() || !username) {
    return false;
  }

  try {
    const client = getSolrClient();
    await withTimeout(client.deleteByID(`user:${username}`, { commitWithin: 1000 }));
    return true;
  } catch (error) {
    console.error("Solr user delete failed:", error.message);
    return false;
  }
}

export async function searchUsersInSolr({
  query = "",
  excludeUsername,
  limit = 50,
} = {}) {
  if (!isSolrEnabled()) {
    return null;
  }

  try {
    const client = getSolrClient();
    const solrQuery = client
      .query()
      .edismax()
      .q(buildUserQuery(query))
      .qf({
        username: 8,
        display_name: 5,
        fullName: 4,
        bio: 2,
      })
      .fl("username")
      .rows(Math.max(1, Math.min(100, Number(limit) || 50)))
      .sort({
        score: "desc",
        username: "asc",
      })
      .fq({ field: "entityType", value: "user" });

    if (excludeUsername) {
      solrQuery.set(`fq=-username:${encodeURIComponent(`"${excludeUsername}"`)}`);
    }

    const response = await withTimeout(client.search(solrQuery));
    const docs = response?.response?.docs || [];
    return docs.map(doc => doc.username).filter(Boolean);
  } catch (error) {
    console.error("Solr user search failed:", error.message);
    return null;
  }
}
