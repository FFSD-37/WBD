async function resetTimeIfNewDay(user) {

  const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata"
  });

  if (user.lastActiveDate !== todayIST) {
    user.timeUsed = 0;
    user.lastActiveDate = todayIST;
    await user.save();
  }

}

export default resetTimeIfNewDay;