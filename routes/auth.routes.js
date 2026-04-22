const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const multer = require('multer'); // Ajout de multer

// Configuration de Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

router.post('/register', upload.single('photo'), authController.register);
router.post('/login', authController.login);

module.exports = router;