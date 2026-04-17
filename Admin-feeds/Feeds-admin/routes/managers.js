import express from "express";
import { buildSchema, graphql, GraphQLError } from "graphql";
import { graphqlHTTP } from "express-graphql";
import Admin from "../models/admin.js";
import ManagerAction from "../models/managerAction.js";

export const manager = express.Router();
const VALID_MANAGER_TYPES = ["users", "posts", "feedback and revenue"];

const toISO = (value) => {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
};

const toSerializableManager = (managerDoc) => {
  const raw = managerDoc?.toObject ? managerDoc.toObject() : managerDoc;

  if (!raw) {
    return null;
  }

  const { password, ...safe } = raw;
  return {
    ...safe,
    _id: String(safe._id),
    createdAt: toISO(safe.createdAt),
    updatedAt: toISO(safe.updatedAt),
  };
};

const toSerializableAction = (actionDoc) => {
  const raw = actionDoc?.toObject ? actionDoc.toObject() : actionDoc;

  return {
    ...raw,
    _id: String(raw._id),
    managerId: String(raw.managerId),
    reportId: raw.reportId ? String(raw.reportId) : null,
    createdAt: toISO(raw.createdAt),
    updatedAt: toISO(raw.updatedAt),
  };
};

const managerSchema = buildSchema(`
  type PerformanceSummary {
    totalActions: Int!
    resolvedTickets: Int!
    postsRemoved: Int!
    lastActionAt: String
  }

  type Manager {
    _id: ID!
    username: String!
    email: String
    role: String!
    managerType: String
    status: String!
    twoFactorEnabled: Boolean
    createdAt: String
    updatedAt: String
  }

  type ManagerWithPerformance {
    _id: ID!
    username: String!
    email: String
    role: String!
    managerType: String
    status: String!
    twoFactorEnabled: Boolean
    createdAt: String
    updatedAt: String
    performance: PerformanceSummary!
  }

  type ManagerActionItem {
    _id: ID!
    managerId: ID!
    managerUsername: String!
    managerType: String!
    actionType: String!
    reportId: ID
    postId: String
    statusFrom: String
    statusTo: String
    notes: String
    createdAt: String
    updatedAt: String
  }

  type ManagerListPayload {
    success: Boolean!
    managers: [ManagerWithPerformance!]!
  }

  type ManagerPerformancePayload {
    success: Boolean!
    manager: Manager!
    summary: PerformanceSummary!
    actions: [ManagerActionItem!]!
  }

  type ManagerCreatePayload {
    success: Boolean!
    manager: Manager!
  }

  type ManagerUpdatePayload {
    success: Boolean!
    manager: Manager!
  }

  type ManagerDeletePayload {
    success: Boolean!
    msg: String!
  }

  type Query {
    managerList: ManagerListPayload!
    managerPerformance(id: ID!): ManagerPerformancePayload!
  }

  type Mutation {
    createManager(username: String, password: String, email: String, managerType: String): ManagerCreatePayload!
    updateManagerStatus(id: ID!, status: String): ManagerUpdatePayload!
    updateManagerType(id: ID!, managerType: String): ManagerUpdatePayload!
    deleteManager(id: ID!): ManagerDeletePayload!
  }
`);

const managerResolvers = {
  managerList: async () => {
    try {
      const managers = await Admin.find({ role: "manager" }).select("-password");
      const stats = await ManagerAction.aggregate([
        {
          $group: {
            _id: "$managerId",
            totalActions: { $sum: 1 },
            resolvedTickets: {
              $sum: {
                $cond: [{ $eq: ["$actionType", "report_resolved"] }, 1, 0],
              },
            },
            postsRemoved: {
              $sum: {
                $cond: [{ $eq: ["$actionType", "post_removed"] }, 1, 0],
              },
            },
            lastActionAt: { $max: "$createdAt" },
          },
        },
      ]);

      const statsByManager = new Map(stats.map((s) => [String(s._id), s]));

      return {
        success: true,
        managers: managers.map((m) => {
          const serializableManager = toSerializableManager(m);
          const s = statsByManager.get(serializableManager._id);

          return {
            ...serializableManager,
            performance: {
              totalActions: s?.totalActions || 0,
              resolvedTickets: s?.resolvedTickets || 0,
              postsRemoved: s?.postsRemoved || 0,
              lastActionAt: toISO(s?.lastActionAt),
            },
          };
        }),
      };
    } catch {
      throw new GraphQLError("Error fetching managers", {
        extensions: { statusCode: 500 },
      });
    }
  },

  managerPerformance: async ({ id }) => {
    try {
      const managerUser = await Admin.findOne({ _id: id, role: "manager" }).select(
        "-password"
      );

      if (!managerUser) {
        throw new GraphQLError("Manager not found", {
          extensions: { statusCode: 404 },
        });
      }

      const [summary] = await ManagerAction.aggregate([
        { $match: { managerId: managerUser._id } },
        {
          $group: {
            _id: "$managerId",
            totalActions: { $sum: 1 },
            resolvedTickets: {
              $sum: {
                $cond: [{ $eq: ["$actionType", "report_resolved"] }, 1, 0],
              },
            },
            postsRemoved: {
              $sum: {
                $cond: [{ $eq: ["$actionType", "post_removed"] }, 1, 0],
              },
            },
            lastActionAt: { $max: "$createdAt" },
          },
        },
      ]);

      const actions = await ManagerAction.find({ managerId: managerUser._id })
        .sort({ createdAt: -1 })
        .limit(200);

      return {
        success: true,
        manager: toSerializableManager(managerUser),
        summary: {
          totalActions: summary?.totalActions || 0,
          resolvedTickets: summary?.resolvedTickets || 0,
          postsRemoved: summary?.postsRemoved || 0,
          lastActionAt: toISO(summary?.lastActionAt),
        },
        actions: actions.map((a) => toSerializableAction(a)),
      };
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }

      throw new GraphQLError("Error fetching manager performance", {
        extensions: { statusCode: 500 },
      });
    }
  },

  createManager: async ({ username, password, email, managerType }) => {
    try {
      if (!username || !password) {
        throw new GraphQLError("Username and password are required", {
          extensions: { statusCode: 400 },
        });
      }

      if (!VALID_MANAGER_TYPES.includes(managerType)) {
        throw new GraphQLError(
          "managerType is required and must be one of: users, posts, feedback and revenue",
          { extensions: { statusCode: 400 } }
        );
      }

      const existing = await Admin.findOne({ username });
      if (existing) {
        throw new GraphQLError("Username already exists", {
          extensions: { statusCode: 409 },
        });
      }

      const created = await Admin.create({
        username,
        password,
        email,
        role: "manager",
        managerType,
        status: "active",
      });

      const serializable = toSerializableManager(created);
      return {
        success: true,
        manager: {
          _id: serializable._id,
          username: serializable.username,
          email: serializable.email,
          role: serializable.role,
          managerType: serializable.managerType,
          status: serializable.status,
          twoFactorEnabled: serializable.twoFactorEnabled,
          createdAt: serializable.createdAt,
          updatedAt: serializable.updatedAt,
        },
      };
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }

      throw new GraphQLError("Error creating manager", {
        extensions: { statusCode: 500 },
      });
    }
  },

  updateManagerStatus: async ({ id, status }) => {
    try {
      if (!["active", "suspended"].includes(status)) {
        throw new GraphQLError("Invalid status", {
          extensions: { statusCode: 400 },
        });
      }

      const updated = await Admin.findOneAndUpdate(
        { _id: id, role: "manager" },
        { status },
        { new: true }
      ).select("-password");

      if (!updated) {
        throw new GraphQLError("Manager not found", {
          extensions: { statusCode: 404 },
        });
      }

      return {
        success: true,
        manager: toSerializableManager(updated),
      };
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }

      throw new GraphQLError("Error updating manager status", {
        extensions: { statusCode: 500 },
      });
    }
  },

  updateManagerType: async ({ id, managerType }) => {
    try {
      if (!VALID_MANAGER_TYPES.includes(managerType)) {
        throw new GraphQLError(
          "Invalid managerType. Allowed: users, posts, feedback and revenue",
          { extensions: { statusCode: 400 } }
        );
      }

      const updated = await Admin.findOneAndUpdate(
        { _id: id, role: "manager" },
        { managerType },
        { new: true }
      ).select("-password");

      if (!updated) {
        throw new GraphQLError("Manager not found", {
          extensions: { statusCode: 404 },
        });
      }

      return {
        success: true,
        manager: toSerializableManager(updated),
      };
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }

      throw new GraphQLError("Error updating manager type", {
        extensions: { statusCode: 500 },
      });
    }
  },

  deleteManager: async ({ id }) => {
    try {
      const deleted = await Admin.findOneAndDelete({ _id: id, role: "manager" });

      if (!deleted) {
        throw new GraphQLError("Manager not found", {
          extensions: { statusCode: 404 },
        });
      }

      return {
        success: true,
        msg: "Manager removed",
      };
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }

      throw new GraphQLError("Error deleting manager", {
        extensions: { statusCode: 500 },
      });
    }
  },
};

const executeManagerGraphQL = async (source, variableValues) => {
  const result = await graphql({
    schema: managerSchema,
    source,
    rootValue: managerResolvers,
    variableValues,
  });

  if (result.errors?.length) {
    const firstError = result.errors[0];
    const err = new Error(firstError.message || "GraphQL execution error");
    err.statusCode = firstError.extensions?.statusCode || 500;
    throw err;
  }

  return result.data;
};

manager.use(
  "/graphql",
  graphqlHTTP({
    schema: managerSchema,
    rootValue: managerResolvers,
    graphiql: process.env.NODE_ENV !== "production",
  })
);

manager.get("/list", async (req, res, next) => {
  try {
    const data = await executeManagerGraphQL(
      `
        query ManagerList {
          managerList {
            success
            managers {
              _id
              username
              email
              role
              managerType
              status
              twoFactorEnabled
              createdAt
              updatedAt
              performance {
                totalActions
                resolvedTickets
                postsRemoved
                lastActionAt
              }
            }
          }
        }
      `
    );

    return res.status(200).json(data.managerList);
  } catch (e) {
    e.statusCode = e.statusCode || 500;
    e.message = e.statusCode === 500 ? "Error fetching managers" : e.message;
    return next(e);
  }
});

manager.get("/performance/:id", async (req, res, next) => {
  try {
    const data = await executeManagerGraphQL(
      `
        query ManagerPerformance($id: ID!) {
          managerPerformance(id: $id) {
            success
            manager {
              _id
              username
              email
              role
              managerType
              status
              twoFactorEnabled
              createdAt
              updatedAt
            }
            summary {
              totalActions
              resolvedTickets
              postsRemoved
              lastActionAt
            }
            actions {
              _id
              managerId
              managerUsername
              managerType
              actionType
              reportId
              postId
              statusFrom
              statusTo
              notes
              createdAt
              updatedAt
            }
          }
        }
      `,
      { id: req.params.id }
    );

    return res.status(200).json(data.managerPerformance);
  } catch (e) {
    e.statusCode = e.statusCode || 500;
    e.message =
      e.statusCode === 500 ? "Error fetching manager performance" : e.message;
    return next(e);
  }
});

manager.post("/create", async (req, res, next) => {
  try {
    const { username, password, email, managerType } = req.body;

    const data = await executeManagerGraphQL(
      `
        mutation CreateManager(
          $username: String
          $password: String
          $email: String
          $managerType: String
        ) {
          createManager(
            username: $username
            password: $password
            email: $email
            managerType: $managerType
          ) {
            success
            manager {
              _id
              username
              email
              role
              managerType
              status
            }
          }
        }
      `,
      { username, password, email, managerType }
    );

    return res.status(201).json(data.createManager);
  } catch (e) {
    e.statusCode = e.statusCode || 500;
    e.message = e.statusCode === 500 ? "Error creating manager" : e.message;
    return next(e);
  }
});

manager.patch("/status/:id", async (req, res, next) => {
  try {
    const { status } = req.body;

    const data = await executeManagerGraphQL(
      `
        mutation UpdateManagerStatus($id: ID!, $status: String) {
          updateManagerStatus(id: $id, status: $status) {
            success
            manager {
              _id
              username
              email
              role
              managerType
              status
              twoFactorEnabled
              createdAt
              updatedAt
            }
          }
        }
      `,
      { id: req.params.id, status }
    );

    return res.status(200).json(data.updateManagerStatus);
  } catch (e) {
    e.statusCode = e.statusCode || 500;
    e.message =
      e.statusCode === 500 ? "Error updating manager status" : e.message;
    return next(e);
  }
});

manager.patch("/type/:id", async (req, res, next) => {
  try {
    const { managerType } = req.body;

    const data = await executeManagerGraphQL(
      `
        mutation UpdateManagerType($id: ID!, $managerType: String) {
          updateManagerType(id: $id, managerType: $managerType) {
            success
            manager {
              _id
              username
              email
              role
              managerType
              status
              twoFactorEnabled
              createdAt
              updatedAt
            }
          }
        }
      `,
      { id: req.params.id, managerType }
    );

    return res.status(200).json(data.updateManagerType);
  } catch (e) {
    e.statusCode = e.statusCode || 500;
    e.message = e.statusCode === 500 ? "Error updating manager type" : e.message;
    return next(e);
  }
});

manager.delete("/:id", async (req, res, next) => {
  try {
    const data = await executeManagerGraphQL(
      `
        mutation DeleteManager($id: ID!) {
          deleteManager(id: $id) {
            success
            msg
          }
        }
      `,
      { id: req.params.id }
    );

    return res.status(200).json(data.deleteManager);
  } catch (e) {
    e.statusCode = e.statusCode || 500;
    e.message = e.statusCode === 500 ? "Error deleting manager" : e.message;
    return next(e);
  }
});

