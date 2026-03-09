const { jwtDecode } = require("jwt-decode");

module.exports = function (req, res, next) {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(401).json({ error: "No token, authorization denied" });
  }

  try {
    const decoded = jwtDecode(token);

    req.user = {
      id: decoded.user_id || decoded.sub,
      email: decoded.email || "",
    };

    next();
  } catch (err) {
    console.error("Token Decode Error:", err.message);
    return res.status(401).json({ error: "Token is not valid" });
  }
};