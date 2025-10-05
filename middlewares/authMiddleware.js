import jwt from "jsonwebtoken"
import userService from "../services/userService.js";

const authMiddleware = (requiredRole = undefined) => {
  return async (req, res, next) => {
    try {
      const jwt_secret = process.env.JWT_SECRET;
      const tokenArray = req.headers['authorization'].split(' ');
      const decodedToken = jwt.verify(tokenArray[1], jwt_secret);
      const user = await userService.getUserById(decodedToken.userId);
      if(user){
        req['user'] = decodedToken.userId;
        next();
      } else {
        res.status(401).json({
          message: "Unauthorized"
        });
      }
    } catch (err) {
      res.status(401).json({
        message: "Unauthorized"
      })
    }
  }
}

export default authMiddleware