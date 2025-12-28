/**
 * Role-Based Access Control (RBAC) Middleware
 * Purpose: This logic ensures that only users with the correct 'role' 
 * (like 'host') can access specific features.
 */
const roleAuth = (requiredRole) => {
    return (req, res, next) => {
        // Checking if user data was attached by the previous 'auth' middleware
        // This helps us identify the user's role from their JWT token
        if (!req.user || req.user.role !== requiredRole) {
            return res.status(403).json({ 
                error: `Access denied. Only ${requiredRole}s can do this.` 
            });
        }
        
        // If the role matches, move to the next step (the controller)
        next();
    };
};

// This line is VERY important. It exports the function so 
// other files (like routes) can use it.
module.exports = roleAuth;