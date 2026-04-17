import { verify_JWTtoken } from "cookie-string-parser";
import User from "../models/users_schema.js";

const isAuthuser = async (req, res, next) => {
  try {
    const isAuth = verify_JWTtoken(
      req.cookies.uuid || req.cookies.cuid,
      process.env.USER_SECRET
    );
    // console.log(isAuth);
    const { data } = isAuth;
    if (data[3] === 'Kids'){
      const user = await User.findOne({username: data[0]});
      if (user.timeUsed > user.timeLimit){
        res.cookie("uuid", "", { maxAge: 1 });
        return res.status(401).json({ message: "You exhausted today usage limit!!" });
      }
    }
    if (isAuth) {
      req.userDetails = isAuth;
      next();
    } else return res.status(401).json({ message: "Unauthorized Access" });
  } catch (e) {
    res.cookie("uuid", "", { maxAge: 1 });
    return res.status(401).json({ message: "Unauthorized Access" });
  }
};

export { isAuthuser };
