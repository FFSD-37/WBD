import Notification from "../models/notification_schema.js";

const createNotification = async (req, res) => {
    try {
        const { to_username, from_username, body, title } = req.body;

        if (!to_username || !body || !title) {
            return res.status(400).json({ error: "to_username, body, and title are required." });
        }

        const existing = await Notification.findOne({ body: body.trim() });
        if (existing) {
            return res.status(409).json({ error: "Notification with the same body already exists." });
        }

        const notification = new Notification({
            to_username,
            from_username: from_username?.trim() || "",
            body: body.trim(),
            title: title.trim()
        });

        await notification.save();

        return res.status(201).json({
            message: "Notification created successfully.",
            notification
        });

    } catch (error) {
        console.error("Error creating notification:", error);
        return res.status(500).json({ error: error.message });
    }
};

export { createNotification };
