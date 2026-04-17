export const create_channel = async (req, res) => {
  try {
    const { channelName } = req.body || {};

    if (!channelName) {
      return res.status(400).json({
        success: false,
        message: "channelName is required",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Channel created",
      data: {
        channelName,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create channel",
    });
  }
};
