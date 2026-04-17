import { gql } from "@apollo/client";

export const GET_USERS_LIST = gql`
  query GetUsersList {
    usersList {
      _id
      username
      fullName
      email
      type
      visibility
    }
  }
`;

export const GET_CHANNELS_LIST = gql`
  query GetChannelsList {
    channelsList {
      _id
      channelName
      channelDescription
      channelCategory
    }
  }
`;

export const GET_REPORTS_LIST = gql`
  query GetReportsList {
    reportsList {
      _id
      report_id
      post_id
      report_number
      user_reported
      status
      reason
      scopeType
      createdAt
      updatedAt
      postPreview {
        id
        author
        type
        url
        content
      }
    }
  }
`;
