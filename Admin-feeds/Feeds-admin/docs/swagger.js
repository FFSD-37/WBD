import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Admin Feeds API",
      version: "1.0.0",
      description:
        "Complete API documentation for Admin Feeds backend routes.",
    },
    servers: [
      {
        url: "http://localhost:{port}",
        description: "Local development server",
        variables: {
          port: {
            default: "8080",
          },
        },
      },
    ],
    tags: [
      { name: "System", description: "Service health and status" },
      { name: "Auth", description: "Admin authentication routes" },
      { name: "Home", description: "Dashboard and analytics routes" },
      { name: "Users", description: "User listing routes" },
      { name: "Feedback", description: "Feedback routes" },
      { name: "Reports", description: "Report management routes" },
      { name: "Payments", description: "Payment listing routes" },
      { name: "Channels", description: "Channel listing routes" },
      { name: "Settings", description: "Admin settings routes" },
      { name: "Managers", description: "Manager CRUD and performance routes" },
    ],
    components: {
      securitySchemes: {
        AdminCookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "auth_token",
          description: "Admin JWT token stored in cookie",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            statusCode: { type: "integer", example: 401 },
            message: { type: "string", example: "Not authenticated" },
          },
          required: ["success", "statusCode", "message"],
        },
        HealthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            msg: { type: "string", example: "admin server is healthy" },
          },
          required: ["success", "msg"],
        },
        BasicSuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            msg: { type: "string", example: "Operation successful" },
          },
          required: ["success", "msg"],
        },
        Admin: {
          type: "object",
          properties: {
            _id: { type: "string", example: "65fb8f1e7c4f43e8fe62e3aa" },
            username: { type: "string", example: "superadmin" },
            email: { type: "string", example: "admin@feeds.com" },
            role: { type: "string", enum: ["admin", "manager"], example: "admin" },
            managerType: {
              oneOf: [
                { type: "string", enum: ["users", "posts", "feedback and revenue"] },
                { type: "null" },
              ],
            },
            status: { type: "string", enum: ["active", "suspended"], example: "active" },
            twoFactorEnabled: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: { type: "string", example: "65fb8f1e7c4f43e8fe62e3ab" },
            fullName: { type: "string", example: "Riya Sharma" },
            username: { type: "string", example: "riya" },
            display_name: { type: "string", example: "Riya Sharma" },
            email: { type: "string", example: "riya@example.com" },
            phone: { type: "string", example: "+919876543210" },
            dob: { type: "string", format: "date-time" },
            visibility: { type: "string", enum: ["Public", "Private"], example: "Public" },
            profilePicture: { type: "string", example: "https://cdn.example.com/profile.png" },
            followers: { type: "array", items: { type: "object", properties: { username: { type: "string" } } } },
            followings: { type: "array", items: { type: "object", properties: { username: { type: "string" } } } },
            requested: { type: "array", items: { type: "object", properties: { username: { type: "string" } } } },
            channelFollowings: {
              type: "array",
              items: { type: "object", properties: { channelName: { type: "string" } } },
            },
            blockedUsers: { type: "array", items: { type: "string" } },
            bio: { type: "string", example: "Content creator" },
            gender: { type: "string", enum: ["Male", "Female", "Other"], example: "Other" },
            termsAccepted: { type: "boolean", example: true },
            isPremium: { type: "boolean", example: false },
            coins: { type: "integer", example: 120 },
            type: { type: "string", enum: ["Kids", "Normal", "Admin"], example: "Normal" },
            links: { type: "array", items: { type: "string" } },
            savedPostsIds: { type: "array", items: { type: "string" } },
            likedPostsIds: { type: "array", items: { type: "string" } },
            likedStoriesIds: { type: "array", items: { type: "string" } },
            archivedPostsIds: { type: "array", items: { type: "string" } },
            postIds: { type: "array", items: { type: "string" } },
            socketId: { type: "string", nullable: true },
            channelName: { type: "array", items: { type: "string" } },
            parentPassword: { type: "string", nullable: true },
            timeLimit: { type: "integer", example: 180 },
            kidPreferredCategories: { type: "array", items: { type: "string" } },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Channel: {
          type: "object",
          properties: {
            _id: { type: "string", example: "65fb8f1e7c4f43e8fe62e3ac" },
            channelName: { type: "string", example: "Tech Sparks" },
            channelDescription: { type: "string", example: "Daily tech explainers" },
            channelCategory: { type: "array", items: { type: "string" } },
            channelLogo: { type: "string", example: "https://cdn.example.com/logo.png" },
            channelAdmin: { type: "string", example: "65fb8f1e7c4f43e8fe62e3ab" },
            links: { type: "array", items: { type: "string" } },
            channelMembers: { type: "array", items: { type: "string" } },
            archivedPostsIds: { type: "array", items: { type: "string" } },
            likedPostsIds: { type: "array", items: { type: "string" } },
            savedPostsIds: { type: "array", items: { type: "string" } },
            postIds: { type: "array", items: { type: "string" } },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Feedback: {
          type: "object",
          properties: {
            _id: { type: "string", example: "65fb8f1e7c4f43e8fe62e3ad" },
            id: { type: "string", example: "FB-19321" },
            name: { type: "string", example: "Mehul" },
            email: { type: "string", example: "mehul@example.com" },
            subject: { type: "string", example: "Feature request" },
            message: { type: "string", example: "Please add more analytics filters" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Report: {
          type: "object",
          properties: {
            _id: { type: "string", example: "65fb8f1e7c4f43e8fe62e3ae" },
            report_id: { type: "integer", enum: [1, 2, 3, 4, 5, 6], example: 3 },
            post_id: { type: "string", example: "POST-1234" },
            report_number: { type: "integer", example: 514 },
            user_reported: { type: "string", example: "riya" },
            status: { type: "string", example: "Pending" },
            reason: { type: "string", example: "Harassment" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Payment: {
          type: "object",
          properties: {
            _id: { type: "string", example: "65fb8f1e7c4f43e8fe62e3af" },
            id: { type: "string", example: "TX-7781" },
            username: { type: "string", example: "riya" },
            type: { type: "string", example: "subscription" },
            status: { type: "string", example: "Completed" },
            reference_id: { type: "string", example: "pay_38298AB" },
            amount: { type: "string", example: "299" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ManagerAction: {
          type: "object",
          properties: {
            _id: { type: "string", example: "65fb8f1e7c4f43e8fe62e3b0" },
            managerId: { type: "string", example: "65fb8f1e7c4f43e8fe62e3aa" },
            managerUsername: { type: "string", example: "manager-1" },
            managerType: {
              type: "string",
              enum: ["users", "posts", "feedback and revenue"],
            },
            actionType: {
              type: "string",
              enum: [
                "report_status_changed",
                "report_resolved",
                "post_removed",
                "user_warned",
                "user_banned"
              ],
            },
            reportId: { type: "string", nullable: true },
            postId: { type: "string", nullable: true },
            statusFrom: { type: "string", nullable: true },
            statusTo: { type: "string", nullable: true },
            notes: { type: "string", example: "Escalated after review" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ManagerSummary: {
          type: "object",
          properties: {
            totalActions: { type: "integer", example: 45 },
            resolvedTickets: { type: "integer", example: 18 },
            postsRemoved: { type: "integer", example: 6 },
            lastActionAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        ManagerWithPerformance: {
          allOf: [
            { $ref: "#/components/schemas/Admin" },
            {
              type: "object",
              properties: {
                performance: { $ref: "#/components/schemas/ManagerSummary" },
              },
            },
          ],
        },
        LoginRequest: {
          type: "object",
          properties: {
            username: { type: "string", example: "superadmin" },
            password: { type: "string", example: "admin123" },
          },
          required: ["username", "password"],
        },
        UpdateReportStatusRequest: {
          type: "object",
          properties: {
            reportId: { type: "string", example: "65fb8f1e7c4f43e8fe62e3ae" },
            status: { type: "string", example: "Resolved" },
          },
          required: ["reportId", "status"],
        },
        UpdateSettingsRequest: {
          oneOf: [
            {
              type: "object",
              properties: {
                tab: { type: "string", enum: ["security"] },
                data: {
                  type: "object",
                  properties: {
                    currentPassword: { type: "string" },
                    newPassword: { type: "string" },
                    confirmPassword: { type: "string" },
                    twoFactorEnabled: { type: "boolean" },
                  },
                  required: ["currentPassword"],
                },
              },
              required: ["tab", "data"],
            },
            {
              type: "object",
              properties: {
                tab: { type: "string", enum: ["profile"] },
                data: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                  },
                  required: ["name", "email"],
                },
              },
              required: ["tab", "data"],
            },
          ],
        },
        Verify2FARequest: {
          type: "object",
          properties: {
            otp: { type: "string", example: "123456" },
          },
          required: ["otp"],
        },
        CreateManagerRequest: {
          type: "object",
          properties: {
            username: { type: "string", example: "manager-1" },
            password: { type: "string", example: "manager123" },
            email: { type: "string", example: "manager1@feeds.com" },
            managerType: {
              type: "string",
              enum: ["users", "posts", "feedback and revenue"],
            },
          },
          required: ["username", "password", "managerType"],
        },
        ManagerStatusRequest: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["active", "suspended"] },
          },
          required: ["status"],
        },
        ManagerTypeRequest: {
          type: "object",
          properties: {
            managerType: {
              type: "string",
              enum: ["users", "posts", "feedback and revenue"],
            },
          },
          required: ["managerType"],
        },
      },
    },
    paths: {
      "/healthCheck": {
        get: {
          tags: ["System"],
          summary: "Health check",
          responses: {
            200: {
              description: "Server is healthy",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" },
                },
              },
            },
          },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Admin login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful and auth cookie set",
              headers: {
                "Set-Cookie": {
                  schema: { type: "string" },
                  description: "Auth cookie containing JWT",
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/BasicSuccessResponse" },
                },
              },
            },
            400: {
              description: "Validation or fetch error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            401: {
              description: "Invalid credentials",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            403: {
              description: "Forbidden for role or suspended account",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/auth/status": {
        get: {
          tags: ["Auth"],
          summary: "Validate auth cookie and get admin profile",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "Authenticated admin",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      isAuthenticated: { type: "boolean", example: true },
                      user: { $ref: "#/components/schemas/Admin" },
                    },
                    required: ["isAuthenticated", "user"],
                  },
                },
              },
            },
            401: {
              description: "Not authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            403: {
              description: "Forbidden for role or suspended account",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout and clear auth cookie",
          responses: {
            200: {
              description: "Logout successful",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/BasicSuccessResponse" },
                },
              },
            },
          },
        },
      },
      "/home/": {
        get: {
          tags: ["Home"],
          summary: "Home route ping",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "Home route response",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/BasicSuccessResponse" },
                },
              },
            },
            401: {
              description: "Not authenticated",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/home/getUsers": {
        get: {
          tags: ["Home"],
          summary: "Get top users by followers",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "Top users",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { type: "array", items: { $ref: "#/components/schemas/User" } },
                    },
                    required: ["success", "data"],
                  },
                },
              },
            },
            404: {
              description: "Users not found",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/home/getChannels": {
        get: {
          tags: ["Home"],
          summary: "Get top channels by followers",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "Top channels",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { type: "array", items: { $ref: "#/components/schemas/Channel" } },
                    },
                    required: ["success", "data"],
                  },
                },
              },
            },
            404: {
              description: "Channels not found",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/home/getRevenue": {
        get: {
          tags: ["Home"],
          summary: "Get total revenue from completed payments",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "Revenue summary",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      rev: { type: "number", example: 10342 },
                    },
                    required: ["success", "rev"],
                  },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/home/getUserCount": {
        get: {
          tags: ["Home"],
          summary: "Get total count of users plus channels",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "User count summary",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      count: { type: "integer", example: 1453 },
                    },
                    required: ["success", "count"],
                  },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/home/getReach": {
        get: {
          tags: ["Home"],
          summary: "Get monthly activity reach",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "Reach aggregation",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            _id: {
                              type: "object",
                              properties: {
                                year: { type: "integer", example: 2026 },
                                month: { type: "integer", example: 3 },
                              },
                            },
                            count: { type: "integer", example: 92 },
                          },
                        },
                      },
                      count: { type: "integer", example: 1400 },
                    },
                    required: ["success", "data", "count"],
                  },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/home/reportData": {
        get: {
          tags: ["Home"],
          summary: "Get report dashboard stats",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "Report stats",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          total: { type: "integer", example: 82 },
                          pending: { type: "integer", example: 23 },
                          resolvedToday: { type: "integer", example: 5 },
                        },
                        required: ["total", "pending", "resolvedToday"],
                      },
                    },
                    required: ["success", "data"],
                  },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/home/contentActivityToday": {
        get: {
          tags: ["Home"],
          summary: "Get today content activity",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "Content activity stats",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          postsToday: { type: "integer", example: 10 },
                          reelsToday: { type: "integer", example: 8 },
                          storiesToday: { type: "integer", example: 14 },
                        },
                        required: ["postsToday", "reelsToday", "storiesToday"],
                      },
                    },
                    required: ["success", "data"],
                  },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/user/list": {
        get: {
          tags: ["Users"],
          summary: "Get all users",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "All users",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { type: "array", items: { $ref: "#/components/schemas/User" } },
                    },
                    required: ["success", "data"],
                  },
                },
              },
            },
            404: {
              description: "Error fetching users",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/feedback/list": {
        get: {
          tags: ["Feedback"],
          summary: "Get all feedback entries",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "Feedback list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      feedbacks: { type: "array", items: { $ref: "#/components/schemas/Feedback" } },
                    },
                    required: ["success", "feedbacks"],
                  },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/report/list": {
        get: {
          tags: ["Reports"],
          summary: "Get all reports",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "Report list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      reports: { type: "array", items: { $ref: "#/components/schemas/Report" } },
                    },
                    required: ["success", "reports"],
                  },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/report/updateReportStatus": {
        post: {
          tags: ["Reports"],
          summary: "Update report status and send notification email",
          security: [{ AdminCookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateReportStatusRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Status updated or unchanged",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/BasicSuccessResponse" },
                },
              },
            },
            404: {
              description: "Report not found",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/payment/list": {
        get: {
          tags: ["Payments"],
          summary: "Get all payment transactions",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "Payments list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      payments: { type: "array", items: { $ref: "#/components/schemas/Payment" } },
                    },
                    required: ["success", "payments"],
                  },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/channel/list": {
        get: {
          tags: ["Channels"],
          summary: "Get all channels",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "Channel list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      allchannels: { type: "array", items: { $ref: "#/components/schemas/Channel" } },
                    },
                    required: ["success", "allchannels"],
                  },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/setting/updateSettings": {
        post: {
          tags: ["Settings"],
          summary: "Update admin security or profile settings",
          security: [{ AdminCookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateSettingsRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Settings updated",
              content: {
                "application/json": {
                  schema: {
                    oneOf: [
                      { $ref: "#/components/schemas/BasicSuccessResponse" },
                      {
                        type: "object",
                        properties: {
                          success: { type: "boolean", example: true },
                          msg: { type: "string", example: "Two-factor authentication enabled" },
                          qrCode: { type: "string", example: "data:image/png;base64,iVBORw..." },
                        },
                      },
                    ],
                  },
                },
              },
            },
            201: {
              description: "Profile updated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/BasicSuccessResponse" },
                },
              },
            },
            400: {
              description: "Validation error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/setting/verify-2fa": {
        post: {
          tags: ["Settings"],
          summary: "Verify 2FA OTP for admin",
          security: [{ AdminCookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Verify2FARequest" },
              },
            },
          },
          responses: {
            200: {
              description: "OTP verified",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/BasicSuccessResponse" },
                },
              },
            },
            400: {
              description: "Invalid OTP or 2FA not enabled",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/manager/list": {
        get: {
          tags: ["Managers"],
          summary: "Get all managers with performance summary",
          security: [{ AdminCookieAuth: [] }],
          responses: {
            200: {
              description: "Manager list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      managers: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ManagerWithPerformance" },
                      },
                    },
                    required: ["success", "managers"],
                  },
                },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/manager/performance/{id}": {
        get: {
          tags: ["Managers"],
          summary: "Get one manager performance detail",
          security: [{ AdminCookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Manager admin id",
            },
          ],
          responses: {
            200: {
              description: "Manager performance details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      manager: { $ref: "#/components/schemas/Admin" },
                      summary: { $ref: "#/components/schemas/ManagerSummary" },
                      actions: { type: "array", items: { $ref: "#/components/schemas/ManagerAction" } },
                    },
                    required: ["success", "manager", "summary", "actions"],
                  },
                },
              },
            },
            404: {
              description: "Manager not found",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/manager/create": {
        post: {
          tags: ["Managers"],
          summary: "Create a manager account",
          security: [{ AdminCookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateManagerRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "Manager created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      manager: { $ref: "#/components/schemas/Admin" },
                    },
                    required: ["success", "manager"],
                  },
                },
              },
            },
            400: {
              description: "Validation error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            409: {
              description: "Username already exists",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/manager/status/{id}": {
        patch: {
          tags: ["Managers"],
          summary: "Update manager status",
          security: [{ AdminCookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ManagerStatusRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Manager status updated",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      manager: { $ref: "#/components/schemas/Admin" },
                    },
                    required: ["success", "manager"],
                  },
                },
              },
            },
            400: {
              description: "Invalid status",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            404: {
              description: "Manager not found",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/manager/type/{id}": {
        patch: {
          tags: ["Managers"],
          summary: "Update manager type",
          security: [{ AdminCookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ManagerTypeRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Manager type updated",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      manager: { $ref: "#/components/schemas/Admin" },
                    },
                    required: ["success", "manager"],
                  },
                },
              },
            },
            400: {
              description: "Invalid managerType",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            404: {
              description: "Manager not found",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/manager/{id}": {
        delete: {
          tags: ["Managers"],
          summary: "Delete manager account",
          security: [{ AdminCookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Manager removed",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/BasicSuccessResponse" },
                },
              },
            },
            404: {
              description: "Manager not found",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            500: {
              description: "Internal server error",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app) => {
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: "Admin Feeds API Docs",
    })
  );
};
