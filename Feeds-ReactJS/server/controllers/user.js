import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { create_JWTtoken } from "cookie-string-parser";
import User from "../models/users_schema.js";
import Post from "../models/postSchema.js";
import Report from "../models/reports.js";
import Payment from "../models/payment.js";
import ActivityLog from "../models/activityLogSchema.js";
import ResetPassword from "../models/reset_pass_schema.js";
import bcrypt, { compare } from "bcrypt";
import Feedback from "../models/feedbackForm.js";
import DelUser from "../models/SoftDelUsers.js";
import Notification from "../models/notification_schema.js";
import Chat from "../models/chatSchema.js";
import Channel from "../models/channelSchema.js";
import channelPost from "../models/channelPost.js";
import Story from "../models/storiesSchema.js";
import Comment from "../models/comment_schema.js";
import { rewardUserByUsername } from "../services/coinRewards.js";
import resetTimeIfNewDay from "../services/resetTime.js";
import {
  removeUserFromSolr,
  upsertUserInSolr,
} from "../services/solr.js";
// import Adpost from "../models/ad_schema.js";

async function storeOtp(email, otp) {
  try {
    const existing = await ResetPassword.findOne({ email });

    if (existing) {
      existing.otp = otp;
      await existing.save();
      console.log(`✅ OTP for ${email} updated successfully.`);
    } else {
      await ResetPassword.create({ email, otp });
      console.log(`✅ OTP for ${email} saved successfully.`);
    }
  } catch (err) {
    console.error(`❌ Error storing OTP for ${email}:`, err);
  }
}

async function getOtp(email) {
  try {
    const record = await ResetPassword.findOne({ email });
    return record ? record.otp : null;
  } catch (err) {
    console.error(`❌ Error retrieving OTP for ${email}:`, err);
    return null;
  }
}

const handleSignup = async (req, res) => {
  try {
    const pass = await bcrypt.hash(req.body.password, 10);
    if (req.body.acctype === "Kids") {
      if (!req.body.parentalPassword) {
        return res.status(400).json({
          success: false,
          message: "Parental password is required for kids accounts",
        });
      }

      if (req.body.parentalPassword !== req.body.confirmParentalPassword) {
        return res.status(400).json({
          success: false,
          message: "Parental passwords do not match",
        });
      }
    }

    const userData = {
      fullName: req.body.fullName,
      username: req.body.username,
      email: req.body.email,
      phone: req.body.phone,
      password: pass,
      dob: req.body.dob,
      profilePicture: req.body.profileImageUrl || process.env.DEFAULT_USER_IMG,
      bio: req.body.bio || "",
      gender: req.body.gender,
      type: req.body.acctype || "Normal",
      isPremium: false,
      termsAccepted: req.body.terms === true,
      parentPassword: req.body.parentalPassword,
    };

    const newUser = new User(userData);
    await newUser.save();
    await upsertUserInSolr(newUser.toObject());

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      redirect: "/dashboard",
      userType: req.body.acctype,
    });
  } catch (error) {
    console.error("Signup error:", error);

    // Handle duplicate username/email
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during signup",
    });
  }
};

const handledelacc = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const user = await User.findOne({ username: data[0] });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Password verification
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect password" });
    }

    // Backup user data in Soft Deleted Users collection
    await DelUser.create(user.toObject());

    // 1️⃣ Delete user’s own posts (and related comments)
    const userPosts = await Post.find({ author: user.username });
    for (const post of userPosts) {
      await Comment.deleteMany({ _id: { $in: post.comments } });
    }
    await Post.deleteMany({ author: user.username });

    // 2️⃣ Delete user’s comments and replies across all posts
    await Comment.deleteMany({ username: user.username });

    // 3️⃣ Delete stories by user
    await Story.deleteMany({ username: user.username });

    // 4️⃣ Remove user’s posts and memberships from channels
    await channelPost.deleteMany({ channel: { $in: user.channelName } });
    await Channel.updateMany(
      {},
      {
        $pull: {
          channelMembers: user._id,
          postIds: { $in: user.postIds },
        },
      }
    );

    // 5️⃣ Delete user’s activity logs
    await ActivityLog.deleteMany({ username: user.username });

    // 6️⃣ Delete the actual user
    await User.deleteOne({ _id: user._id });
    await removeUserFromSolr(user.username);

    // 7️⃣ Send confirmation email
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Account Deleted - FEEDS",
      text: `Hello ${user.username},

Your FEEDS account has been deleted on ${new Date().toLocaleString()}.

If you didn’t perform this action, please restore your account using /restore on the login page.

Best regards,
Team FEEDS`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting account:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting account",
    });
  }
};

function generateOTP() {
  const characters = "0123456789";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return otp;
}

const sendotp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with this email",
      });
    }

    const otp = generateOTP();

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code - FEEDS",
      text: `Hello ${user.username},

Your One-Time Password (OTP) for resetting your FEEDS account password is: ${otp}

This OTP is valid for a limited time. Please do not share it with anyone.

Best regards,
Team FEEDS`,
    };

    await transporter.sendMail(mailOptions);

    await storeOtp(email, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      email,
    });
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again later.",
    });
  }
};

const verifyotp = async (req, res) => {
  try {
    const { email, otp, action } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const storedOtp = await getOtp(email);

    if (!storedOtp) {
      return res.status(404).json({
        success: false,
        message: "No OTP found. Please request a new one.",
      });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while verifying OTP",
    });
  }
};

const handlefpadmin = async (req, res) => {
  try {
    const otp = generateOTP();

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.adminEmail,
      subject: "Admin Password Reset OTP - FEEDS",
      text: `Hello Admin,

Your One-Time Password (OTP) to reset your admin credentials is: ${otp}

This OTP is valid for a limited time. Please do not share it with anyone.

- FEEDS Security`,
    };

    // Send mail
    await transporter.sendMail(mailOptions);

    // Save OTP in the database
    await storeOtp(process.env.adminEmail, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to admin email",
    });
  } catch (error) {
    console.error("❌ Error sending admin OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send admin OTP",
    });
  }
};

const adminPassUpdate = async (req, res) => {
  try {
    const { otp, newPassword, confirmPassword } = req.body;

    if (!otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields (OTP, newPassword, confirmPassword) are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Verify stored OTP
    const storedOtp = await getOtp(process.env.adminEmail);
    if (!storedOtp) {
      return res.status(404).json({
        success: false,
        message: "No OTP found. Please request a new one.",
      });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    // Update admin password (in-memory)
    process.env.adminPass = newPassword;

    // Optional: Persist the new admin password securely (e.g., to a .env or config file)
    // Note: This should ideally be replaced with a DB entry if admin creds are stored there.

    await ActivityLog.create({
      username: "ADMIN",
      id: `#${Date.now()}`,
      message: "Admin password updated successfully.",
    });

    return res.status(200).json({
      success: true,
      message: "Admin password updated successfully.",
    });
  } catch (error) {
    console.error("❌ Error in adminPassUpdate:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating admin password",
    });
  }
};

const updatepass = async (req, res) => {
  try {
    const { email, new_password, confirm_password } = req.body;

    if (!email || !new_password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isSamePassword = await bcrypt.compare(new_password, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as the old password",
      });
    }

    user.password = await bcrypt.hash(new_password, 10);
    await user.save();

    await ActivityLog.create({
      username: user.username,
      id: `#${Date.now()}`,
      message: "Your password has been changed successfully.",
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully. You can now log in.",
    });
  } catch (error) {
    console.error("❌ Error updating password:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating password",
    });
  }
};

const handlelogout = async (req, res) => {
  try {
    res.clearCookie("uuid", {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    res.clearCookie("cuid", {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("❌ Error during logout:", error);
    return res.status(500).json({
      success: false,
      message: "Error while logging out",
    });
  }
};

const handleContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, email, subject, message) are required",
      });
    }

    // Save feedback in database
    await Feedback.create({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      email,
      subject,
      message,
    });

    return res.status(200).json({
      success: true,
      message: "Your response has been recorded. We'll get back to you soon!",
    });
  } catch (error) {
    console.error("❌ Error in handleContact:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit feedback. Please try again later.",
    });
  }
};

const handleadminlogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // Validate admin credentials
    if (
      username !== process.env.adminUsername ||
      password !== process.env.adminPass
    ) {
      return res.status(401).json({
        success: false,
        message: "Incorrect credentials",
      });
    }

    // Fetch all necessary admin stats
    const [users, posts, reports, orders, feedbacks] = await Promise.all([
      User.find({}).sort({ createdAt: -1 }).lean(),
      Post.find({}).lean(),
      Report.find({}).lean(),
      Payment.find({}).lean(),
      Feedback.find({}).lean(),
    ]);

    // Calculate revenue
    let revenue = 0;
    const completedOrders = orders.filter((o) => o.status !== "Pending");
    completedOrders.forEach((order) => (revenue += Number(order.amount || 0)));

    // Ensure premium flag is up-to-date
    for (const order of completedOrders) {
      await User.updateOne(
        { username: order.username },
        { $set: { isPremium: true } }
      );
    }

    // Structure the admin dashboard response
    const dashboardData = {
      totalRevenue: revenue,
      totalUsers: users.length,
      totalPosts: posts.length,
      totalReports: reports.length,
      totalOrders: orders.length,
      totalFeedbacks: feedbacks.length,
      users,
      posts,
      reports,
      orders,
      feedbacks,
    };

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      dashboard: dashboardData,
    });
  } catch (error) {
    console.error("❌ Error in handleadminlogin:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while logging in admin",
    });
  }
};

const fetchOverlayUser = async (req, res) => {
  const { user_id, username, email } = req.body;
  const user = await User.findOne({ username: username });
  return res.json(user);
};

const handlegetHome = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profileUrl, type, isPremium]
    const username = data[0];
    const userType = data[3];
    const createdAt = req.query.createdAt || new Date();
    const categories = req.query.categories
      ? req.query.categories.split(",").map((c) => c.trim())
      : [];

    // Base query
    const baseFilter = { createdAt: { $lt: createdAt }, isArchived: false };

    // For kids: filter posts based on selected/allowed categories
    let posts = [];

    if (userType === "Kids") {
      if (!categories.length) {
        return res.status(400).json({
          success: false,
          message: "Categories are required for Kids account feed",
        });
      }

      posts = await channelPost
        .find({ ...baseFilter, category: { $in: categories } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    } else {
      posts = await Post.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    }

    if (!posts.length) {
      return res.status(404).json({
        success: false,
        message: "No posts found for the given filters",
      });
    }

    // User metadata
    const user = await User.findOne({ username }).lean();
    const likedIds = user.likedPostsIds || [];
    const savedIds = user.savedPostsIds || [];

    // Mark liked/saved posts
    const updatedPosts = posts.map((post) => ({
      ...post,
      liked: likedIds.includes(post.id),
      saved: savedIds.includes(post.id),
    }));

    return res.status(200).json({
      success: true,
      message: "Posts fetched successfully",
      posts: updatedPosts,
      user: {
        username,
        profilePicture: data[2],
        type: userType,
      },
    });
  } catch (error) {
    console.error("❌ Error in handlegetHome:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching posts",
    });
  }
};

const handlegetpayment = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profileUrl, type, isPremium]
    const username = data[0];

    const user = await User.findOne({ username }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fetch payment history for this user
    const payments = await Payment.find({ username })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Payment data fetched successfully",
      user: {
        username,
        isPremium: user.isPremium,
        coins: user.coins,
        profilePicture: user.profilePicture,
      },
      payments,
    });
  } catch (error) {
    console.error("❌ Error in handlegetpayment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching payment details",
    });
  }
};

const handlegetprofile = async (req, res) => {
  try {
    const { username } = req.params;
    const { data } = req.userDetails; // [loggedUsername, email, profilePicture, type, isPremium]
    const loggedInUser = data[0];

    // Find the requested profile
    const profileUser = await User.findOne({ username }).lean();
    if (!profileUser) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    // Check if current user is blocked by the profile owner
    if (profileUser.blockedUsers.includes(loggedInUser)) {
      return res.status(403).json({
        success: false,
        message: "You are blocked by this user",
      });
    }

    // Fetch posts created by this user
    const postIds = profileUser.postIds || [];
    const posts = await Post.find({
      _id: { $in: postIds },
      isArchived: false,
    }).lean();

    // Fetch saved, liked, and archived posts
    const savedIds = profileUser.savedPostsIds || [];
    const likedIds = profileUser.likedPostsIds || [];
    const archiveIds = profileUser.archivedPostsIds || [];

    const [saved, liked, archived] = await Promise.all([
      Post.find({ id: { $in: savedIds } }).lean(),
      Post.find({ id: { $in: likedIds } }).lean(),
      Post.find({ id: { $in: archiveIds } }).lean(),
    ]);

    // Relationship info
    const loggedUser = await User.findOne({ username: loggedInUser }).lean();
    const isFollowing = loggedUser.followings.some(
      (f) => f.username === username
    );
    const isFollowedBy = loggedUser.followers.some(
      (f) => f.username === username
    );
    const isFriend = isFollowing && isFollowedBy;
    const isFollower = isFollowedBy && !isFollowing;
    const isRequested = isFollowing && !isFollowedBy;
    const isOwnProfile = username === loggedInUser;

    // Kids profile logic
    const isKid = profileUser.type === "Kids";

    // If the viewed user is premium, give the viewer a small coin bonus
    if (!isOwnProfile && profileUser.isPremium) {
      await Notification.create({
        mainUser: username,
        mainUserType: profileUser.type || "Normal",
        msgSerial: 5, // Normal user views a premium user
        userInvolved: loggedInUser,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      userProfile: {
        username: profileUser.username,
        fullName: profileUser.fullName,
        display_name: profileUser.display_name,
        bio: profileUser.bio,
        gender: profileUser.gender,
        profilePicture: profileUser.profilePicture,
        followers: profileUser.followers.length,
        followings: profileUser.followings.length,
        isPremium: profileUser.isPremium,
        type: profileUser.type,
        visibility: profileUser.visibility,
        isKid,
      },
      posts,
      saved,
      liked,
      archived,
      relationship: {
        isOwnProfile,
        isFollowing,
        isFollowedBy,
        isFriend,
        isFollower,
        isRequested,
      },
    });
  } catch (error) {
    console.error("❌ Error in handlegetprofile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching profile",
    });
  }
};

const handlegeteditprofile = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const username = data[0];

    const user = await User.findOne({ username }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User data fetched successfully",
      user: {
        username: user.username,
        fullName: user.fullName,
        display_name: user.display_name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        gender: user.gender,
        dob: user.dob,
        type: user.type,
        isPremium: user.isPremium,
        profilePicture: user.profilePicture,
        visibility: user.visibility,
        links: Array.isArray(user.links) ? user.links : [],
      },
    });
  } catch (error) {
    console.error("❌ Error in handlegeteditprofile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching user data",
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const username = data[0];
    const {
      profileImageUrl,
      display_name,
      fullName,
      bio,
      gender,
      phone,
      links,
    } = req.body;

    const updateData = {};
    if (display_name) updateData.display_name = display_name.trim();
    if (fullName) updateData.fullName = fullName.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (gender) updateData.gender = gender;
    if (phone) updateData.phone = phone.trim();
    if (profileImageUrl) updateData.profilePicture = profileImageUrl;

    // Validate & process links
    if (links !== undefined) {
      let processedLinks = [];

      if (Array.isArray(links)) {
        processedLinks = links
          .map((l) => (typeof l === "string" ? l.trim() : ""))
          .filter(Boolean);
      } else if (typeof links === "string") {
        processedLinks = links
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean);
      }

      // Limit = 3
      if (processedLinks.length > 3) {
        return res.status(400).json({
          success: false,
          message: "You can add a maximum of 3 links only.",
        });
      }

      // URL validation regex
      const isValidUrl = (str) => {
        const pattern =
          /^(https?:\/\/)?([a-zA-Z0-9.-]+|\blocalhost\b|\b\d{1,3}(\.\d{1,3}){3}\b)(:\d+)?(\/.*)?$/i;
        return pattern.test(str);
      };

      for (const link of processedLinks) {
        if (!isValidUrl(link)) {
          return res.status(400).json({
            success: false,
            message: `Invalid link format: ${link}`,
          });
        }
      }

      updateData.links = processedLinks;
    }

    const updatedUser = await User.findOneAndUpdate(
      { username },
      { $set: updateData },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await upsertUserInSolr(updatedUser);

    const newToken = create_JWTtoken(
      [
        username,
        updatedUser.email,
        updatedUser.profilePicture,
        updatedUser.type,
        updatedUser.isPremium,
      ],
      process.env.USER_SECRET,
      "30d"
    );
    res.cookie("uuid", newToken, { httpOnly: true });

    await ActivityLog.create({
      username,
      id: `#${Date.now()}`,
      message: "Your profile has been updated successfully!",
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        username,
        profilePicture: updatedUser.profilePicture,
        fullName: updatedUser.fullName,
        display_name: updatedUser.display_name,
        bio: updatedUser.bio,
        gender: updatedUser.gender,
        phone: updatedUser.phone,
        links: Array.isArray(updatedUser.links) ? updatedUser.links : [],
      },
    });
  } catch (error) {
    console.error("❌ Error in updateUserProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating profile",
    });
  }
};

const handlegetcreatepost = (req, res) => {
  const { data } = req.userDetails;
  return res.render("create_post", {
    img: data[2],
    currUser: data[0],
    msg: null,
  });
};

const handlecreatepost = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const { postType, mediaUrl, caption } = req.body;

    if (!postType || !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing post type or media URL",
      });
    }

    const username = data[0];

    // Handle story upload
    if (postType === "story") {
      const story = await Story.create({
        username,
        url: mediaUrl,
      });

      await ActivityLog.create({
        username,
        id: `#${Date.now()}`,
        message: "Story uploaded successfully!",
      });

      return res.status(201).json({
        success: true,
        message: "Story uploaded successfully",
        story,
      });
    }

    // For posts (image or reel), we just return prepared data for frontend confirmation
    if (["reel", "image"].includes(postType.toLowerCase())) {
      return res.status(200).json({
        success: true,
        message: "Proceed to caption and finalize post",
        preview: {
          type: postType.toLowerCase() === "reel" ? "Reels" : "Img",
          url: mediaUrl,
          caption: caption || "",
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid post type",
    });
  } catch (error) {
    console.error("❌ Error in handlecreatepost:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating post",
    });
  }
};

const handlegetcreatepost2 = (req, res) => {
  const { data } = req.userDetails;
  return res.render("create_post_second", {
    img2: "https://ik.imagekit.io/FFSD0037/esrpic-609a6f96bb3031_OvyeHGHcB.jpg?updatedAt=1744145583878",
    currUser: data[0],
    img: data[2],
  });
};

const followSomeone = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const followerUsername = data[0];
    const { username: targetUsername } = req.params;

    if (followerUsername === targetUsername) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself.",
      });
    }

    const [me, targetUser] = await Promise.all([
      User.findOne({ username: followerUsername }),
      User.findOne({ username: targetUsername }),
    ]);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!me) {
      return res.status(403).json({
        success: false,
        message: "Only user accounts can follow profiles.",
      });
    }

    if (
      (me.type === "Kids" && targetUser.type !== "Kids") ||
      (me.type !== "Kids" && targetUser.type === "Kids")
    ) {
      return res.status(403).json({
        success: false,
        message: "Kids accounts cannot follow non-kids users and vice-versa.",
      });
    }

    if (targetUser.blockedUsers.includes(followerUsername)) {
      return res.status(403).json({
        success: false,
        message: "You are blocked by this user.",
      });
    }

    if (me.blockedUsers.includes(targetUsername)) {
      return res.status(400).json({
        success: false,
        message: "Unblock this user before following.",
      });
    }

    // 🔹 Already requested (stored on target/private user's document)
    if (targetUser.requested.some((r) => r.username === followerUsername)) {
      return res.status(200).json({
        success: true,
        status: "requested",
        message: `You already sent a follow request to @${targetUsername}`,
      });
    }

    // 🔹 Already following
    if (me.followings.some((f) => f.username === targetUsername)) {
      return res.status(200).json({
        success: true,
        status: "following",
        message: `You are already following @${targetUsername}`,
      });
    }

    if (targetUser.visibility === "Private") {
      // Always send follow request for private accounts
      await User.updateOne(
        { username: targetUsername },
        { $addToSet: { requested: { username: followerUsername } } }
      );

      await Notification.create({
        mainUser: targetUsername,
        mainUserType: "Normal",
        msgSerial: 4, // Normal user requested to follow another private normal user
        userInvolved: followerUsername,
      });

      await ActivityLog.create({
        username: followerUsername,
        id: `#${Date.now()}`,
        message: `You sent a follow request to @${targetUsername}`,
      });

      return res.status(200).json({
        success: true,
        status: "requested",
        message: `Follow request sent to @${targetUsername}`,
      });
    }

    // 🌍 Public account
    await Promise.all([
      User.updateOne(
        { username: followerUsername },
        { $addToSet: { followings: { username: targetUsername } } }
      ),
      User.updateOne(
        { username: targetUsername },
        { $addToSet: { followers: { username: followerUsername } } }
      ),
    ]);

    await ActivityLog.create({
      username: followerUsername,
      id: `#${Date.now()}`,
      message: `You started following @${targetUsername}`,
    });

    await Notification.create({
      mainUser: targetUsername,
      mainUserType: "Normal",
      msgSerial: 1, // Normal user follows another normal user
      userInvolved: followerUsername,
    });

    await User.updateOne(
      { username: followerUsername },
      { $inc: { coins: 1 } }
    );

    // Notification for getting coins
    await Notification.create({
      mainUser: targetUsername,
      mainUserType: "Normal",
      msgSerial: 6, // Normal user get some coins
      userInvolved: followerUsername,
    });

    return res.status(200).json({
      success: true,
      status: "following",
      message: `You are now following @${targetUsername}`,
    });
  } catch (error) {
    console.error("❌ Error in followSomeone:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while following user",
    });
  }
};

const unRequestSomeone = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const unrequesterUsername = data[0];
    const { username: targetUsername } = req.params;
    const [me, targetUser] = await Promise.all([
      User.findOne({ username: unrequesterUsername }),
      User.findOne({ username: targetUsername }),
    ]);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!me) {
      return res.status(403).json({
        success: false,
        message: "Only user accounts can unrequest profiles.",
      });
    }

    if (
      (me.type === "Kids" && targetUser.type !== "Kids") ||
      (me.type !== "Kids" && targetUser.type === "Kids")
    ) {
      return res.status(403).json({
        success: false,
        message: "Kids accounts cannot follow non-kids users and vice-versa.",
      });
    }
    if (targetUser.requested.some((r) => r.username === unrequesterUsername)) {
      await User.updateOne(
        { username: targetUsername },
        { $pull: { requested: { username: unrequesterUsername } } }
      );
      await Notification.deleteMany({
        mainUser: targetUsername,
        userInvolved: unrequesterUsername,
        msgSerial: 4,
      });
      await ActivityLog.create({
        username: unrequesterUsername,
        id: `#${Date.now()}`,
        message: `You canceled your follow request to @${targetUsername}`,
      });
      await User.updateOne(
        { username: unrequesterUsername },
        { $inc: { coins: -1 } }
      );
      return res.status(200).json({
        success: true,
        status: "request_canceled",
        message: `You canceled your follow request to @${targetUsername}`,
      });
    }
    return res.status(400).json({
      success: false,
      message: `You haven't requested to follow @${targetUsername}.`,
    });
  } catch (error) {
    console.error("❌ Error in unRequestSomeone:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while unrequesting user",
    });
  }
};

const unfollowSomeone = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const unfollowerUsername = data[0];
    const { username: targetUsername } = req.params;

    if (unfollowerUsername === targetUsername) {
      return res.status(400).json({
        success: false,
        message: "You cannot unfollow yourself.",
      });
    }

    const [me, targetUser] = await Promise.all([
      User.findOne({ username: unfollowerUsername }),
      User.findOne({ username: targetUsername }),
    ]);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!me) {
      return res.status(403).json({
        success: false,
        message: "Only user accounts can unfollow profiles.",
      });
    }

    if (
      (me.type === "Kids" && targetUser.type !== "Kids") ||
      (me.type !== "Kids" && targetUser.type === "Kids")
    ) {
      return res.status(403).json({
        success: false,
        message: "Kids accounts cannot follow non-kids users and vice-versa.",
      });
    }

    // 🧩 Case 1: Cancel follow request (Private account)
    if (targetUser.requested.some((r) => r.username === unfollowerUsername)) {
      await User.updateOne(
        { username: targetUsername },
        { $pull: { requested: { username: unfollowerUsername } } }
      );
      await Notification.deleteMany({
        mainUser: targetUsername,
        userInvolved: unfollowerUsername,
        msgSerial: 4,
      });

      await ActivityLog.create({
        username: unfollowerUsername,
        id: `#${Date.now()}`,
        message: `You canceled your follow request to @${targetUsername}`,
      });

      // No notification needed when canceling a follow request

      return res.status(200).json({
        success: true,
        status: "request_canceled",
        message: `Follow request to @${targetUsername} canceled.`,
      });
    }

    // 🧩 Case 2: Unfollow someone you follow
    const isFollowing = me.followings.some(
      (f) => f.username === targetUsername
    );
    if (isFollowing) {
      await Promise.all([
        User.updateOne(
          { username: unfollowerUsername },
          { $pull: { followings: { username: targetUsername } } }
        ),
        User.updateOne(
          { username: targetUsername },
          { $pull: { followers: { username: unfollowerUsername } } }
        ),
      ]);

      await ActivityLog.create({
        username: unfollowerUsername,
        id: `#${Date.now()}`,
        message: `You unfollowed @${targetUsername}`,
      });

      await Notification.create({
        mainUser: targetUsername,
        mainUserType: "Normal",
        msgSerial: 7, // Normal user unfollows another normal user
        userInvolved: unfollowerUsername,
      });

      await User.updateOne(
        { username: unfollowerUsername },
        { $inc: { coins: -1 } }
      );

      return res.status(200).json({
        success: true,
        status: "unfollowed",
        message: `You unfollowed @${targetUsername}`,
      });
    }

    // 🧩 Case 3: Invalid action
    return res.status(400).json({
      success: false,
      message: `You are not following or haven't requested @${targetUsername}.`,
    });
  } catch (error) {
    console.error("❌ Error in unfollowSomeone:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while unfollowing user",
    });
  }
};

const acceptFollowRequest = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const accepterUsername = data[0];
    const { username: requesterUsername } = req.params;

    if (!requesterUsername || requesterUsername === accepterUsername) {
      return res.status(400).json({
        success: false,
        message: "Invalid requester username.",
      });
    }

    const [accepter, requester] = await Promise.all([
      User.findOne({ username: accepterUsername }),
      User.findOne({ username: requesterUsername }),
    ]);

    if (!accepter || !requester) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (
      (accepter.type === "Kids" && requester.type !== "Kids") ||
      (accepter.type !== "Kids" && requester.type === "Kids")
    ) {
      return res.status(403).json({
        success: false,
        message: "Kids accounts cannot follow non-kids users and vice-versa.",
      });
    }

    const accepterBlocked = Array.isArray(accepter.blockedUsers)
      ? accepter.blockedUsers
      : [];
    const requesterBlocked = Array.isArray(requester.blockedUsers)
      ? requester.blockedUsers
      : [];

    if (
      accepterBlocked.includes(requesterUsername) ||
      requesterBlocked.includes(accepterUsername)
    ) {
      return res.status(403).json({
        success: false,
        message: "Follow request cannot be accepted due to blocking.",
      });
    }

    const pendingRequests = Array.isArray(accepter.requested)
      ? accepter.requested
      : [];
    const hasPendingRequest = pendingRequests.some(
      (r) => r.username === requesterUsername
    );

    if (!hasPendingRequest) {
      return res.status(400).json({
        success: false,
        message: `No pending follow request from @${requesterUsername}.`,
      });
    }

    await Promise.all([
      User.updateOne(
        { username: accepterUsername },
        {
          $pull: { requested: { username: requesterUsername } },
        }
      ),
      User.updateOne(
        { username: requesterUsername },
        {
          $addToSet: { followings: { username: accepterUsername } },
          $inc: { coins: 1 },
        }
      ),
      User.updateOne(
        { username: accepterUsername },
        { $addToSet: { followers: { username: requesterUsername } } }
      ),
      Notification.deleteOne({
        mainUser: accepterUsername,
        userInvolved: requesterUsername,
        msgSerial: 4,
      }),
    ]);

    await Promise.allSettled([
      Notification.create({
        mainUser: requesterUsername,
        mainUserType: requester.type || "Normal",
        msgSerial: 1,
        userInvolved: accepterUsername,
      }),
      ActivityLog.create({
        username: accepterUsername,
        id: `#${Date.now()}`,
        message: `You accepted @${requesterUsername}'s follow request`,
      }),
      ActivityLog.create({
        username: requesterUsername,
        id: `#${Date.now()}`,
        message: `Your follow request to @${accepterUsername} was accepted`,
      }),
    ]);

    return res.status(200).json({
      success: true,
      status: "accepted",
      message: `Follow request from @${requesterUsername} accepted.`,
    });
  } catch (error) {
    console.error("❌ Error in acceptFollowRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while accepting follow request.",
    });
  }
};

const handlegetnotification = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const username = data[0];

    const notifications = await Notification.find({ mainUser: username })
      .sort({ createdAt: -1 })
      .lean();

    if (!notifications || notifications.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No notifications found.",
        notifications: [],
      });
    }

    // Optionally enrich notifications with user info
    const enrichedNotifications = await Promise.all(
      notifications.map(async (n) => {
        const user = await User.findOne({ username: n.userInvolved }).lean();
        return {
          id: n._id,
          userInvolved: n.userInvolved,
          profilePicture: user?.profilePicture || process.env.DEFAULT_USER_IMG,
          msgSerial: n.msgSerial,
          createdAt: n.createdAt,
          message: getNotificationMessage(n.msgSerial, n.userInvolved),
        };
      })
    );

    return res.status(200).json({
      success: true,
      notifications: enrichedNotifications,
    });
  } catch (error) {
    console.error("❌ Error in handlegetnotification:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching notifications",
    });
  }
};

const handlegetsettings = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const username = data[0];

    const user = await User.findOne({ username }).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Settings loaded successfully",
      settings: {
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        display_name: user.display_name,
        phone: user.phone,
        visibility: user.visibility,
        gender: user.gender,
        type: user.type,
        bio: user.bio || "",
        isPremium: user.isPremium,
        profilePicture: user.profilePicture,
        followersCount: user.followers.length,
        followingsCount: user.followings.length,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error in handlegetsettings:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading settings",
    });
  }
};

const togglePP = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const username = data[0];

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Toggle visibility
    const newVisibility = user.visibility === "Public" ? "Private" : "Public";
    user.visibility = newVisibility;
    await user.save();
    await upsertUserInSolr(user.toObject());

    // Reflect visibility on user's posts
    const isPublicValue = newVisibility === "Public";
    await Post.updateMany(
      { author: username },
      { $set: { ispublic: isPublicValue } }
    );

    // Log this activity
    await ActivityLog.create({
      username,
      id: `#${Date.now()}`,
      message: `Profile visibility changed to ${newVisibility}`,
    });

    return res.status(200).json({
      success: true,
      message: `Profile and posts are now ${newVisibility}`,
      newVisibility,
    });
  } catch (error) {
    console.error("❌ Error in togglePP:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while toggling visibility",
    });
  }
};

const signupChannel = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const username = data[0];

    const user = await User.findOne({ username }).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please log in again.",
      });
    }

    // Define all allowed categories for channels
    const channelCategories = [
      "Entertainment",
      "Comedy",
      "Education",
      "Science",
      "Tech",
      "Gaming",
      "Animations",
      "Memes",
      "Music",
      "Sports",
      "Fitness",
      "Lifestyle",
      "Fashion",
      "Beauty",
      "Food",
      "Travel",
      "Vlog",
      "Nature",
      "DIY",
      "Art",
      "Photography",
      "Business",
      "Finance",
      "Marketing",
      "News",
      "Movies",
      "Pets",
      "Automotive"
    ];

    return res.status(200).json({
      success: true,
      message: "Ready for channel registration",
      user: {
        username: user.username,
        profilePicture: user.profilePicture,
        type: user.type,
      },
      availableCategories: channelCategories,
    });
  } catch (error) {
    console.error("❌ Error in signupChannel:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while preparing channel registration",
    });
  }
};

const registerChannel = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const username = data[0];
    const {
      channelName,
      channelDescription,
      channelCategory,
      channelPassword,
      profileImageUrl,
    } = req.body;

    if (
      !channelName ||
      !channelDescription ||
      !channelPassword ||
      !channelCategory
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled.",
      });
    }

    // Check if channel already exists
    const existing = await Channel.findOne({ channelName });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Channel name already exists. Choose another one.",
      });
    }

    // Find the user creating the channel
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Hash channel password for security
    const hashedPassword = await bcrypt.hash(channelPassword, 10);

    // Parse or validate categories
    const parsedCategories = Array.isArray(channelCategory)
      ? channelCategory
      : JSON.parse(channelCategory);

    const validOptions = [
      "Entertainment",
      "Comedy",
      "Education",
      "Science",
      "Tech",
      "Gaming",
      "Animations",
      "Memes",
      "Music",
      "Sports",
      "Fitness",
      "Lifestyle",
      "Fashion",
      "Beauty",
      "Food",
      "Travel",
      "Vlog",
      "Nature",
      "DIY",
      "Art",
      "Photography",
      "Business",
      "Finance",
      "Marketing",
      "News",
      "Movies",
      "Pets",
      "Automotive"
    ];

    const invalid = parsedCategories.find((cat) => !validOptions.includes(cat));
    if (invalid) {
      return res.status(400).json({
        success: false,
        message: `Invalid category: ${invalid}`,
      });
    }

    // Create the new channel
    const newChannel = await Channel.create({
      channelName,
      channelDescription,
      channelCategory: parsedCategories,
      channelLogo: profileImageUrl || process.env.DEFAULT_USER_IMG,
      channelPassword: hashedPassword,
      channelAdmin: user._id,
      channelMembers: [user._id],
      channelSettings: {
        allowProfileSharing: true,
        supportEmail: "",
        supportPhone: "",
        supportUrl: "",
      },
    });

    // Add channel reference to user
    await User.updateOne(
      { username },
      { $addToSet: { channelName: channelName } }
    );

    // Log creation
    await ActivityLog.create({
      username,
      id: `#${Date.now()}`,
      message: `Channel '${channelName}' created successfully!`,
    });

    return res.status(201).json({
      success: true,
      message: "Channel registered successfully",
      channel: {
        name: newChannel.channelName,
        description: newChannel.channelDescription,
        logo: newChannel.channelLogo,
        categories: newChannel.channelCategory,
        createdAt: newChannel.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error in registerChannel:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating channel",
    });
  }
};

const createPostfinalize = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const { profileImageUrl, type, caption } = req.body;

    if (!profileImageUrl || !type) {
      return res.status(400).json({
        success: false,
        message: "Post type and media URL are required.",
      });
    }

    // Validate post type
    const validTypes = ["Img", "Reel", "Story"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid post type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Return preview data to frontend for confirmation
    return res.status(200).json({
      success: true,
      message: "Post data ready for finalization",
      preview: {
        username: data[0],
        mediaUrl: profileImageUrl,
        caption: caption || "",
        type,
        profilePicture: data[2],
      },
    });
  } catch (error) {
    console.error("❌ Error in createPostfinalize:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while finalizing post creation",
    });
  }
};

const handlegetlog = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const username = data[0];

    // Optional pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find({ username })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalLogs = await ActivityLog.countDocuments({ username });

    return res.status(200).json({
      success: true,
      message: "Activity logs fetched successfully",
      logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLogs / limit),
        totalLogs,
      },
    });
  } catch (error) {
    console.error("❌ Error in handlegetlog:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching activity logs",
    });
  }
};

const uploadFinalPost = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const username = data[0];
    const { type, avatar, caption } = req.body;

    if (!avatar || !type) {
      return res.status(400).json({
        success: false,
        message: "Post type and media URL are required.",
      });
    }

    // Find the user for visibility and validation
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const postId = `${username}-${Date.now()}`;

    // Determine visibility (sync with user profile)
    const isPublic = user.visibility === "Public";

    // Create post object
    const postObj = {
      id: postId,
      type: type === "Img" ? "Img" : "Reels",
      url: avatar,
      content: caption || "",
      author: username,
      ispublic: isPublic,
      likes: 0,
      comments: [],
    };

    const post = await Post.create(postObj);

    // Add post ID to user document
    await User.findOneAndUpdate(
      { username },
      { $push: { postIds: post._id } },
      { new: true }
    );

    // Log the action
    await ActivityLog.create({
      username,
      id: `#${Date.now()}`,
      message: `You uploaded a new ${post.type === "Reel" ? "reel" : "post"}!`,
    });

    if (user.type !== "Kids") {
      await rewardUserByUsername(username, {
        activity: "post_create",
      });
    }

    return res.status(201).json({
      success: true,
      message: `${post.type === "Reel" ? "Reel" : "Post"
        } uploaded successfully.`,
      post: {
        id: post.id,
        url: post.url,
        content: post.content,
        type: post.type,
        ispublic: post.ispublic,
        createdAt: post.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error in uploadFinalPost:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while uploading post",
    });
  }
};

const reportAccount = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const reporterUsername = data[0];
    const { username: targetName } = req.params;
    const { reason } = req.body;

    // Validate target account (normal/kids user or channel)
    const [reportedUser, reportedChannel] = await Promise.all([
      User.findOne({ username: targetName }),
      Channel.findOne({ channelName: targetName }),
    ]);

    if (!reportedUser && !reportedChannel) {
      return res.status(404).json({
        success: false,
        message: "Account to be reported not found.",
      });
    }

    // Prevent self-reporting
    if (reporterUsername === targetName) {
      return res.status(400).json({
        success: false,
        message: "You cannot report your own account.",
      });
    }

    const reportId = reportedChannel ? 2 : 1;

    // Create report record
    const report = await Report.create({
      report_id: reportId,
      post_id: "On account",
      report_number: Date.now(),
      user_reported: targetName,
      reason: reason || "No reason provided",
      status: "Pending",
    });

    // Optional: add activity log
    await ActivityLog.create({
      username: reporterUsername,
      id: `#${Date.now()}`,
      message: `You reported the account of @${targetName}.`,
    });

    return res.status(201).json({
      success: true,
      message: "Account reported successfully.",
      reportId: report._id,
    });
  } catch (error) {
    console.error("❌ Error in reportAccount:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while reporting account.",
    });
  }
};

const handleloginchannel = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const { channelName, channelPassword } = req.body;

    if (!channelName || !channelPassword) {
      return res.status(400).json({
        success: false,
        message: "Channel name and password are required.",
      });
    }

    const channel = await Channel.findOne({ channelName });
    const user = await User.findOne({ username: data[0] });

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found.",
      });
    }

    if (channel.isDeactivated) {
      return res.status(403).json({
        success: false,
        message: "This channel is deactivated. Contact support to reactivate.",
      });
    }

    if (!user || String(channel.channelAdmin) !== String(user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to manage this channel.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      channelPassword,
      channel.channelPassword
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid channel password.",
      });
    }

    // Generate a new JWT token for channel login
    const token = create_JWTtoken(
      [
        channel.channelName,
        user.username,
        channel.channelLogo,
        "Channel",
        true,
      ],
      process.env.USER_SECRET,
      "30d"
    );

    // Clear user token and set channel token
    res.cookie("uuid", "", { maxAge: 0 });
    res.cookie("cuid", token, { httpOnly: true });

    // Log channel login
    await ActivityLog.create({
      username: user.username,
      id: `#${Date.now()}`,
      message: `Logged into channel '${channel.channelName}'`,
    });

    return res.status(200).json({
      success: true,
      message: "Channel logged in successfully.",
      channel: {
        name: channel.channelName,
        logo: channel.channelLogo,
        categories: channel.channelCategory,
      },
    });
  } catch (error) {
    console.error("❌ Error in handleloginchannel:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during channel login.",
    });
  }
};

const handlegetallnotifications = async (req, res) => {
  try {
    const { data } = req.userDetails;
    // data = [username, email, profilePicture, type, isPremium]

    if (!data || !data[0]) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access. Please log in again.",
      });
    }
    const username = data[0];
    const userType = data[3]; // Kids / Normal / Channel
    let allowedSerials = [];

    if (userType === "Kids" || userType === "Normal") {
      allowedSerials = { $gte: 1, $lte: 8 };
    } else if (userType === "Channel") {
      allowedSerials = { $gte: 9, $lte: 18 };
    } else {
      allowedSerials = { $gte: 1, $lte: 18 };
    }
    const notifications = await Notification.find({
      mainUser: username,
      msgSerial: allowedSerials,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully.",
      notifications,
    });
  } catch (error) {
    console.error("❌ Error in handlegetallnotifications:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching notifications.",
    });
  }
};

const markNotificationsAsSeen = async (req, res) => {
  try {
    const { data } = req.userDetails;
    if (!data || !data[0]) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access. Please log in again.",
      });
    }

    const username = data[0];
    const result = await Notification.updateMany(
      { mainUser: username, seen: false },
      { $set: { seen: true } }
    );

    return res.status(200).json({
      success: true,
      message: "Notifications marked as seen.",
      updatedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error("❌ Error in markNotificationsAsSeen:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while marking notifications as seen.",
    });
  }
};

const getUnseenCounts = async (req, res) => {
  try {
    const { data } = req.userDetails;
    if (!data || !data[0]) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access. Please log in again.",
      });
    }

    const username = data[0];
    const userType = data[3];

    const notificationsPromise = Notification.countDocuments({
      mainUser: username,
      seen: false,
    });

    const chatsPromise =
      userType === "Kids"
        ? Promise.resolve(0)
        : Chat.countDocuments({
            to: username,
            toType: userType === "Channel" ? "Channel" : "Normal",
            seen: false,
          });

    const [unseenNotifications, unseenChats] = await Promise.all([
      notificationsPromise,
      chatsPromise,
    ]);

    return res.status(200).json({
      success: true,
      counts: {
        notifications: unseenNotifications,
        chats: unseenChats,
      },
    });
  } catch (error) {
    console.error("❌ Error in getUnseenCounts:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching unseen counts.",
    });
  }
};

const handleloginsecond = async (req, res) => {
  if (req.body.type === "Standard Account") {
    try {
      const user = await User.findOne(
        req.body.userTypeiden === "Email"
          ? { email: req.body.identifier }
          : { username: req.body.identifier }
      );
      if (!user) return res.json({ success: false, reason: "Invalid creds" });
      if (user.type !== "Normal") {
        return res.json({
          success: false,
          reason: "Not a Standard account, switch to respective type",
        });
      }
      const isPasswordMatch = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (!isPasswordMatch)
        return res.json({ success: false, reason: "Incorrect password" });
      const token = create_JWTtoken(
        [
          user.username,
          user.email,
          user.profilePicture,
          user.type,
          user.isPremium,
        ],
        process.env.USER_SECRET,
        "30d"
      );
      res.cookie("uuid", token, { httpOnly: true });
      return res.json({ success: true });
    } catch (e) {
      console.log(e);
      return res.json({ success: false, reason: "Something went wrong" });
    }
  }
  if (req.body.type === "Child Account") {
    try {
      // console.log(req.body);
      const user = await User.findOne({ email: req.body.childEmail });
      if (!user) return res.json({ success: false, reason: "Email invalid" });
      if (user.type !== "Kids") {
        return res.json({
          success: false,
          reason: "Not a kids account, switch to respective type first",
        });
      }
      const isPasswordMatch = await bcrypt.compare(
        req.body.parentPassword,
        user.password
      );
      if (!isPasswordMatch)
        return res.json({
          success: false,
          reason: "Incorrect parent password",
        });
      await resetTimeIfNewDay(user);
      const token = create_JWTtoken(
        [
          user.username,
          user.email,
          user.profilePicture,
          user.type,
          user.isPremium,
        ],
        process.env.USER_SECRET,
        "30d"
      );
      res.cookie("uuid", token, { httpOnly: true });
      return res.json({ success: true });
    } catch (e) {
      console.log(e);
      return res.json({ success: false, reason: "Something went wrong" });
    }
  }
  try {
    const user = await Channel.findOne({ channelName: req.body.channelName });
    if (!user)
      return res.json({ success: false, reason: "Invalid channel Name" });
    if (user.isDeactivated) {
      return res.json({
        success: false,
        reason: "This channel is currently deactivated",
      });
    }
    // console.log(user);
    const mainUser = await User.findOne({ _id: user.channelAdmin._id });
    // console.log(mainUser);
    if (mainUser.username !== req.body.adminName) {
      return res.json({ success: false, reason: "Invalid Admin name" });
    }
    const isPasswordMatch = await bcrypt.compare(
      req.body.channelPassword,
      user.channelPassword
    );
    if (!isPasswordMatch)
      return res.json({ success: false, reason: "Incorrect password" });
    const token = create_JWTtoken(
      [user.channelName, mainUser.username, user.channelLogo, "Channel", true],
      process.env.USER_SECRET,
      "30d"
    );
    res.cookie("uuid", "", { maxAge: 0 });
    res.cookie("cuid", token, { httpOnly: true });
    return res.json({ success: true });
  } catch (e) {
    console.log(e);
    return res.json({ success: false, reason: "Something went wrong" });
  }
};

const handlelikereel = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const username = data[0];
    const { reel_id } = req.body;

    if (!reel_id) {
      return res.status(400).json({
        success: false,
        message: "Reel ID is required.",
      });
    }

    const user = await User.findOne({ username });
    const post = await Post.findOne({ _id: reel_id });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Reel not found.",
      });
    }

    if (post.type !== "Reels") {
      return res.status(400).json({
        success: false,
        message: "The specified post is not a reel.",
      });
    }

    const hasLiked = user.likedPostsIds.includes(reel_id);

    if (hasLiked) {
      // Unlike the reel
      await Post.findByIdAndUpdate(reel_id, { $inc: { likes: -1 } });
      await User.findOneAndUpdate(
        { username },
        { $pull: { likedPostsIds: reel_id } }
      );

      await ActivityLog.create({
        username,
        id: `#${Date.now()}`,
        message: `You unliked a reel by @${post.author}.`,
      });
    } else {
      // Like the reel
      await Post.findByIdAndUpdate(reel_id, { $inc: { likes: 1 } });
      await User.findOneAndUpdate(
        { username },
        { $addToSet: { likedPostsIds: reel_id } } // avoids duplicates
      );

      if (data[3] !== "Kids") {
        await rewardUserByUsername(username, {
          activity: "engagement",
        });
      }

      await ActivityLog.create({
        username,
        id: `#${Date.now()}`,
        message: `You liked a reel by @${post.author}.`,
      });
    }

    // Fetch updated likes
    const updatedPost = await Post.findById(reel_id).select("likes");

    return res.status(200).json({
      success: true,
      message: hasLiked
        ? "Reel unliked successfully."
        : "Reel liked successfully.",
      likes: updatedPost.likes,
    });
  } catch (error) {
    console.error("❌ Error in handlelikereel:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while liking reel.",
    });
  }
};

const handlereportpost = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const reporterUsername = data[0];
    const { reason, post_id } = req.body;

    if (!post_id || !reason) {
      return res.status(400).json({
        success: false,
        message: "Post ID and reason are required.",
      });
    }

    const [userPost, reportedChannelPost] = await Promise.all([
      Post.findOne({ id: post_id }),
      channelPost.findOne({ id: post_id }),
    ]);

    if (!userPost && !reportedChannelPost) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const isChannelPost = Boolean(reportedChannelPost);
    const reportId = isChannelPost ? 4 : 3;
    const reportedOwner = isChannelPost
      ? reportedChannelPost.channel
      : userPost.author;

    // Create new report entry
    const report = await Report.create({
      report_id: reportId,
      post_id,
      report_number: Date.now(),
      user_reported: reportedOwner,
      reason,
      status: "Pending",
    });

    // Add to activity log
    await ActivityLog.create({
      username: reporterUsername,
      id: `#${Date.now()}`,
      message: `You reported a post by @${reportedOwner} for "${reason}".`,
    });

    return res.status(201).json({
      success: true,
      message: "Post reported successfully.",
      reportId: report._id,
    });
  } catch (error) {
    console.error("❌ Error in handlereportpost:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while reporting post.",
    });
  }
};

const handleReportChat = async (req, res) => {
  try {
    const { data } = req.userDetails; // [username, email, profilePicture, type, isPremium]
    const reporterUsername = data[0];
    const reporterType = data[3] === "Channel" ? "Channel" : "Normal";
    const { chat_id, reason } = req.body;

    if (!chat_id || !reason) {
      return res.status(400).json({
        success: false,
        message: "Chat ID and reason are required.",
      });
    }

    const chat = await Chat.findById(chat_id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat message not found.",
      });
    }

    const isFromMe = chat.from === reporterUsername && chat.fromType === reporterType;
    const isToMe = chat.to === reporterUsername && chat.toType === reporterType;

    if (!isFromMe && !isToMe) {
      return res.status(403).json({
        success: false,
        message: "You can report only chats that involve your account.",
      });
    }

    const userReported = isFromMe ? chat.to : chat.from;
    const userReportedType = isFromMe ? chat.toType : chat.fromType;
    const reportId = userReportedType === "Channel" ? 6 : 5;

    const report = await Report.create({
      report_id: reportId,
      post_id: String(chat._id),
      report_number: Date.now(),
      user_reported: userReported,
      reason,
      status: "Pending",
    });

    await ActivityLog.create({
      username: reporterUsername,
      id: `#${Date.now()}`,
      message: `You reported a chat with @${userReported}.`,
    });

    return res.status(201).json({
      success: true,
      message: "Chat reported successfully.",
      reportId: report._id,
    });
  } catch (error) {
    console.error("❌ Error in handleReportChat:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while reporting chat.",
    });
  }
};

const handlegetads = async (req, res) => {
  const ads = await Adpost.find({}).lean();
  return res.json({ success: true, allAds: ads });
};

const handlelikecomment = async (req, res) => {
  const { id } = req.params;
  const { data } = req.userDetails;
  const { post_id, commUser } = req.body;
  const comment = await Comment.findOne({ _id: id });
  if (comment.likes.includes(data[0])) {
    // Unlike - remove from array
    comment.likes = comment.likes.filter((uname) => uname !== data[0]);
    await comment.save();
    // No notification for unlike
    await ActivityLog.create({
      username: data[0],
      id: `#${Date.now()}`,
      message: `You unliked the comment on post ${post_id}`,
    });
    return res.json({ data: true });
    } else {
      // Like - add to array
      comment.likes.push(data[0]);
      await comment.save();
      if (data[3] !== "Kids") {
        await rewardUserByUsername(data[0], {
          activity: "engagement",
        });
      }
      if (commUser != data[0]) {
        await Notification.create({
          mainUser: commUser,
        mainUserType: "Normal",
        msgSerial: 2, // Normal user likes a normal post-comment
        userInvolved: data[0],
      });
      await User.findOneAndUpdate(
        { username: commUser },
        { $inc: { coins: 1 } }
      );
    }
    await ActivityLog.create({
      username: data[0],
      id: `#${Date.now()}`,
      message: `You liked the comment on post ${post_id}`,
    });
    return res.json({ data: true });
  }
};

const handleblockuser = async (req, res) => {
  // console.log("BLOCK HIT");
  const { username } = req.params;
  const { data } = req.userDetails;
  const user = await User.findOne({ username: data[0] });

  if (!user) {
    return res.status(404).json({ flag: "user_not_found" });
  }

  if (user.blockedUsers.includes(username)) {
    await User.findOneAndUpdate(
      { username: data[0] },
      { $pull: { blockedUsers: username } }
    );
    await ActivityLog.create({
      username: data[0],
      id: `#${Date.now()}`,
      message: `You unblocked ${username}`,
    });
    return res.json({ flag: "unblocked" });
  } else {
    await User.findOneAndUpdate(
      { username: data[0] },
      { $push: { blockedUsers: username } }
    );
    await ActivityLog.create({
      username: data[0],
      id: `#${Date.now()}`,
      message: `You blocked ${username}`,
    });
    return res.json({ flag: "blocked" });
  }
};

const handledeletepost = async (req, res) => {
  const { id } = req.params;
  const { data } = req.userDetails;
  const post = await Post.findOne({ id: id });
  await User.findOneAndUpdate(
    { username: data[0] },
    { $pull: { postIds: post._id } }
  );
  for (const commentId of post.comments) {
    const comment = await Comment.findOne({ _id: commentId });
    if (comment) {
      for (const replyId of comment.reply_array) {
        await Comment.deleteOne({ _id: replyId });
      }
      await Comment.deleteOne({ _id: commentId });
    }
  }
  await Post.deleteOne({ id: id });
  await ActivityLog.create({
    username: data[0],
    id: `#${Date.now()}`,
    message: `You deleted your own post ${id}`,
  });
  return res.json({ data: true });
};

const handlearchivepost = async (req, res) => {
  const { id } = req.params;
  const { data } = req.userDetails;
  await User.findOneAndUpdate(
    { username: data[0] },
    { $push: { archivedPostsIds: id } }
  );
  return res.json({ data: true });
};

const handleunarchivepost = async (req, res) => {
  const { id } = req.params;
  const { data } = req.userDetails;
  await User.findOneAndUpdate(
    { username: data[0] },
    { $pull: { archivedPostsIds: id } }
  );
  return res.json({ data: true });
};

const handleunsavepost = async (req, res) => {
  const { id } = req.params;
  const { data } = req.userDetails;
  await User.findOneAndUpdate(
    { username: data[0] },
    { $pull: { savedPostsIds: id } }
  );
  return res.json({ data: true });
};

const handlepostcomment = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const { postID, commentText } = req.body;

    if (!commentText || commentText.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Comment cannot be empty" });
    }

    // Find the target post
    const post = await Post.findOne({ id: postID });
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Create the new comment document
    const newComment = await Comment.create({
      text: commentText,
      username: data[0],
      avatarUrl: data[2],
      postID: post._id,
      reply_array: [],
    });

    // Push this comment’s ID to the post’s comment array
    await Post.findOneAndUpdate(
      { id: postID },
      { $push: { comments: newComment._id } },
      { new: true }
    );

    // Add activity log entry
    await ActivityLog.create({
      username: data[0],
      id: `#${Date.now()}`,
      message: `You commented on a post by #${post.author}!`,
    });

    // Create notification for post author
    // console.log(post.author);
    if (data[0] !== post.author) {
      await Notification.create({
        mainUser: post.author,
        mainUserType: "Normal",
        msgSerial: 8, // Normal user comments on normal posts
        userInvolved: data[0],
      });
    }

    if (data[3] !== "Kids") {
      await rewardUserByUsername(data[0], {
        activity: "engagement",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comment added successfully",
      comment: newComment,
    });
  } catch (error) {
    console.error("❌ Error in handlepostcomment:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// RELAXED URL VALIDATION
const validateUrl = (url) => {
  const pattern =
    /^(https?:\/\/)?([a-zA-Z0-9.-]+|\blocalhost\b|\b\d{1,3}(\.\d{1,3}){3}\b)(:\d+)?(\/.*)?$/i;
  return pattern.test(url);
};

const handleGetEditChannel = async (req, res) => {
  try {
    const { data } = req.userDetails; // from cuid
    const channel = await Channel.findOne({ channelName: data[0] });

    if (!channel) {
      return res.status(404).json({ msg: "Channel not found" });
    }

    return res.json({
      img: channel.channelLogo,
      currChannel: channel.channelName,
      CurrentChannel: channel,
      links: channel.links || [],
      type: data[3],
    });
  } catch (err) {
    console.error("❌ Error in handleGetEditChannel:", err);
    return res.status(500).json({ msg: "Server Error while fetching channel" });
  }
};

const updateChannelProfile = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const { logo, logoUrl, channelDescription, links } = req.body;

    const updatedFields = { channelDescription };

    // Validate and Process Links
    if (links !== undefined) {
      let processedLinks = [];

      if (Array.isArray(links)) {
        processedLinks = links
          .map((l) => (typeof l === "string" ? l.trim() : ""))
          .filter(Boolean);
      } else if (typeof links === "string") {
        processedLinks = links
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean);
      }

      // Limit = 3
      if (processedLinks.length > 3) {
        return res.status(400).json({
          success: false,
          msg: "You can add a maximum of 3 links only.",
        });
      }

      // Validate URLs
      for (const link of processedLinks) {
        if (!validateUrl(link)) {
          return res.status(400).json({
            success: false,
            msg: `Invalid link format: ${link}`,
          });
        }
      }

      updatedFields.links = processedLinks;
    }

    // Logo Update
    if (logo && logo !== "") {
      updatedFields.channelLogo = logoUrl;
    }

    const channel = await Channel.findOneAndUpdate(
      { channelName: data[0] },
      { $set: updatedFields },
      { new: true }
    );

    if (!channel) {
      return res.status(404).json({ msg: "Channel not found" });
    }

    // Refresh JWT token
    const token = create_JWTtoken(
      [
        channel.channelName,
        data[1],
        channel.channelLogo || data[2],
        "Channel",
        true,
      ],
      process.env.USER_SECRET,
      "30d"
    );

    res.cookie("cuid", token, { httpOnly: true });

    await ActivityLog.create({
      username: data[0],
      id: `#${Date.now()}`,
      message: "Your Channel Profile has been Updated!!",
    });

    return res.json({ success: true, msg: "Channel updated successfully!" });
  } catch (err) {
    console.error("❌ Error in updateChannelProfile:", err);
    return res.status(500).json({ msg: "Server Error while updating channel" });
  }
};

export {
  handleSignup,
  sendotp,
  verifyotp,
  updatepass,
  handleContact,
  handledelacc,
  handlelogout,
  handlegetHome,
  handlegetpayment,
  handlegetprofile,
  handleadminlogin,
  generateOTP,
  handlefpadmin,
  adminPassUpdate,
  handlegeteditprofile,
  handlegetcreatepost,
  handlecreatepost,
  handlegetcreatepost2,
  updateUserProfile,
  fetchOverlayUser,
  followSomeone,
  acceptFollowRequest,
  unfollowSomeone,
  handlegetnotification,
  handlegetsettings,
  togglePP,
  signupChannel,
  registerChannel,
  handlegetlog,
  createPostfinalize,
  uploadFinalPost,
  reportAccount,
  handleloginchannel,
  handlegetallnotifications,
  markNotificationsAsSeen,
  getUnseenCounts,
  handleloginsecond,
  handlelikereel,
  handlereportpost,
  handleReportChat,
  handlegetads,
  handlelikecomment,
  handleblockuser,
  handledeletepost,
  handlearchivepost,
  handleunarchivepost,
  handleunsavepost,
  handlepostcomment,
  handleGetEditChannel,
  updateChannelProfile,
  unRequestSomeone,
};

