import jwt from "jsonwebtoken";

const DAY = 24 * 60 * 60;

export function signUser(user) {
  return jwt.sign({ uid: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "30d"
  });
}

export function authMiddleware(req, res, next) {
  try {
    const token = req.signedCookies?.token;
    if (!token) return res.status(401).json({ message: "Unauthenticated" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Unauthenticated" });
  }
}

export const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: false,              // set true in prod behind HTTPS
  signed: true,
  maxAge: 30 * DAY * 1000
};
