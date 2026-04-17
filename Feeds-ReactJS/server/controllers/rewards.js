import { rewardUserByUsername } from "../services/coinRewards.js";

const claimGamePlayReward = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const username = data?.[0];
    const userType = data?.[3];

    if (!username || userType === "Channel" || userType === "Kids") {
      return res.status(403).json({
        success: false,
        message: "Only normal users can earn coins from games.",
      });
    }

    const reward = await rewardUserByUsername(username, {
      activity: "game_play",
    });

    return res.status(200).json({
      success: true,
      awarded: reward.awarded,
      reason: reward.reason || null,
    });
  } catch (error) {
    console.error("Game reward error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process game reward.",
    });
  }
};

export { claimGamePlayReward };
