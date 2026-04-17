import { GraphQLBoolean, GraphQLID, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import User from "../models/user_schema.js";
import Channel from "../models/channelSchema.js";
import Report from "../models/report_schema.js";
import Post from "../models/post.js";

const POSTS_MANAGER_REPORT_IDS = [3, 4, 5, 6];

const requireManagerType = (context, allowedTypes) => {
  const managerType = context?.actor?.managerType;
  console.log("Manager type from context:", managerType);
  if (!context?.actor) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }

  if (!allowedTypes.includes(managerType)) {
    const error = new Error("Access denied for this module");
    error.statusCode = 403;
    throw error;
  }
};

const getScopeFromReportId = (reportId) => {
  if (reportId === 3) return "normal_or_kids_post";
  if (reportId === 4) return "channel_post";
  if (reportId === 5) return "normal_chat";
  if (reportId === 6) return "channel_chat";
  if (reportId === 1) return "normal_or_kids_account";
  if (reportId === 2) return "channel_account";
  return "unknown";
};

const UserListItemType = new GraphQLObjectType({
  name: "ManagerUserListItem",
  fields: {
    _id: { type: GraphQLID },
    username: { type: GraphQLString },
    fullName: { type: GraphQLString },
    email: { type: GraphQLString },
    type: { type: GraphQLString },
    visibility: { type: GraphQLString },
    phone: { type: GraphQLString },
    profilePicture: { type: GraphQLString },
    bio: { type: GraphQLString },
    isPremium: { type: GraphQLBoolean },
    coins: { type: GraphQLInt },
    dob: { type: GraphQLString },
    gender: { type: GraphQLString },
    createdAt: { type: GraphQLString },
  },
});

const ChannelListItemType = new GraphQLObjectType({
  name: "ManagerChannelListItem",
  fields: {
    _id: { type: GraphQLID },
    channelName: { type: GraphQLString },
    channelDescription: { type: GraphQLString },
    channelCategory: { type: new GraphQLList(GraphQLString) },
  },
});

const PostPreviewType = new GraphQLObjectType({
  name: "ManagerPostPreview",
  fields: {
    id: { type: GraphQLString },
    author: { type: GraphQLString },
    type: { type: GraphQLString },
    url: { type: GraphQLString },
    content: { type: GraphQLString },
  },
});

const UserPostType = new GraphQLObjectType({
  name: "ManagerUserPost",
  fields: {
    _id: { type: GraphQLID },
    id: { type: GraphQLString },
    type: { type: GraphQLString },
    content: { type: GraphQLString },
    url: { type: GraphQLString },
    likes: { type: GraphQLInt },
    dislikes: { type: GraphQLInt },
    isArchived: { type: GraphQLBoolean },
    warnings: { type: GraphQLInt },
    createdAt: { type: GraphQLString },
  },
});

const ReportListItemType = new GraphQLObjectType({
  name: "ManagerReportListItem",
  fields: {
    _id: { type: GraphQLID },
    report_id: { type: GraphQLInt },
    post_id: { type: GraphQLString },
    report_number: { type: GraphQLInt },
    user_reported: { type: GraphQLString },
    status: { type: GraphQLString },
    reason: { type: GraphQLString },
    scopeType: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
    postPreview: { type: PostPreviewType },
  },
});

const ReportDetailsType = new GraphQLObjectType({
  name: "ManagerReportDetails",
  fields: {
    report: { type: ReportListItemType },
    post: { type: PostPreviewType },
  },
});

const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    usersList: {
      type: new GraphQLList(UserListItemType),
      resolve: async (_, __, context) => {
        requireManagerType(context, ["users"]);

        return User.find({ type: { $in: ["Normal", "Kids"] } })
          .select("username fullName email phone profilePicture bio type isPremium coins visibility dob gender createdAt followers")
          .sort({ followers: -1 })
          .lean();
      },
    },
    users: {
      type: new GraphQLList(UserListItemType),
      resolve: async (_, __, context) => {
        requireManagerType(context, ["users"]);

        return User.find({ type: { $in: ["Normal", "Kids"] } })
          .select("username fullName email phone profilePicture bio type isPremium coins visibility dob gender createdAt followers")
          .sort({ followers: -1 })
          .lean();
      },
    },
    channelsList: {
      type: new GraphQLList(ChannelListItemType),
      resolve: async (_, __, context) => {
        requireManagerType(context, ["users"]);

        return Channel.find({})
          .select("channelName channelDescription channelCategory")
          .lean();
      },
    },
    reportsList: {
      type: new GraphQLList(ReportListItemType),
      resolve: async (_, __, context) => {
        requireManagerType(context, ["posts"]);

        const allReports = await Report.find({
          report_id: { $in: POSTS_MANAGER_REPORT_IDS },
        })
          .sort({ createdAt: -1 })
          .lean();

        const postIds = allReports
          .map((report) => report.post_id)
          .filter((postId) => postId && postId !== "On account");

        const posts = await Post.find({ id: { $in: postIds } })
          .select("id author type url content")
          .lean();

        const postById = new Map(posts.map((post) => [post.id, post]));

        return allReports.map((report) => ({
          ...report,
          scopeType: getScopeFromReportId(report.report_id),
          postPreview:
            report.post_id === "On account"
              ? null
              : postById.get(report.post_id) || null,
        }));
      },
    },
  },
});

export const managerGraphQLSchema = new GraphQLSchema({
  query: RootQuery,
});
