const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, isAdmin } = require('../middleware/auth');
const utilisateurController = require('../controllers/utilisateur.controller');
const User = require('../models/utilisateur.model');

// Configuration multer directe
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

// ✅ Routes pour admin
router.get('/', auth, isAdmin, utilisateurController.listerUtilisateurs);
router.delete('/:id', auth, isAdmin, utilisateurController.supprimerUtilisateur);

// ✅ Routes pour utilisateur connecté
router.get('/me', auth, utilisateurController.monProfil);
router.put('/me', auth, utilisateurController.modifierProfil);
router.put('/me/mot-de-passe', auth, utilisateurController.changerMotDePasse);

// 📸 Upload photo de profil
router.post('/me/photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image reçue' });
    }

    const utilisateur = await User.findById(req.user._id);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    utilisateur.photo = `/uploads/${req.file.filename}`;
    await utilisateur.save();

    res.json({ 
      message: 'Photo mise à jour avec succès', 
      photo: utilisateur.photo 
    });
  } catch (err) {
    console.error('Erreur lors de l\'upload de la photo:', err);
    res.status(500).json({ 
      message: 'Erreur lors de l\'upload de la photo', 
      error: err.message 
    });
  }
});

// Middleware de gestion d'erreurs pour multer
router.use('/me/photo', (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Le fichier est trop volumineux (max 5MB)' });
    }
  }
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
});

module.exports = router;