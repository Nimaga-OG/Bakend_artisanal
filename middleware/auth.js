const jwt = require('jsonwebtoken');
const User = require('../models/utilisateur.model');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Token manquant. Accès refusé.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-mot_de_passe');
    
    if (!user) {
      return res.status(401).json({ message: 'Token invalide. Utilisateur non trouvé.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur d\'authentification', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide.' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré.' });
    }

    res.status(500).json({ message: 'Erreur serveur d\'authentification' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé. Droits administrateur requis.' });
  }
  next();
};

module.exports = { auth, isAdmin };