const authorizeRoles = (...allowedRoles) => {
    // normalize allowed roles so routes can continue to use 'driver'
    const normalizedAllowed = allowedRoles.map(r => r === 'driver' ? 'user' : r);
    return (req, res, next) => {
        const userRole = (req.user && req.user.role) === 'driver' ? 'user' : (req.user && req.user.role);
        if (!normalizedAllowed.includes(userRole)) {
            return res.status(403).json({ message: 'Access Denied!' });
        }
        next();
    };
};

module.exports = authorizeRoles;