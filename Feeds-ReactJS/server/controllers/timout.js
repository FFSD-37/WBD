import seasonSchema from "../models/sessionSchema.js";
let timeId = {};

const logout = async (username) => {
  try {
    const userSession = await seasonSchema
      .findOne({ username })
      .sort({ createdAt: -1 })
      .limit(1);
    if (userSession === null) return;
    userSession.logoutAt = Date.now();
    userSession.duration = userSession.logoutAt - userSession.loginAt;
    await userSession.save();
    delete timeId[username];
  } catch (err) {
    console.log(err);
  }
};

const clearSession = async (username) => {
  try {
    timeId[username] = setTimeout(() => logout(username), 2000);
  } catch (err) {
    console.log(err);
  }
};

const setSession = async (username) => {
  if (!timeId[username]) await seasonSchema.create({ username });
  if (timeId[username]) clearTimeout(timeId[username]);
};

const getDailyusage = async (req, res) => {
  try {
    const { data } = req.userDetails;
    if (data[3] === "Channel")
      return res
        .status(404)
        .json({ error: "Channels do not have session data" });

    const user = await seasonSchema
      .find({ username: data[0] })
      .sort({ createdAt: -1 });
    return res.json({ user });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ err: err.message });
  }
};

export { setSession, clearSession, getDailyusage };
