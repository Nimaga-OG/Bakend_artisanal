// ✅ roleGuard.js
module.exports = function roleGuard(...rolesAutorises) {
  return (req, res, next) => {
    console.log("🛡️ roleGuard - req.user:", req.user, '| roles autorisés:', rolesAutorises);

    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    if (!rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé : rôle non autorisé' });
    }

    next();
  };
  
};