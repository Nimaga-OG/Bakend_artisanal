const User = require('../models/utilisateur.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
  try {
    const { nom_utilisateur, email, mot_de_passe } = req.body;
    const photo = req.file ? req.file.filename : null;

    // Valider les données
    if (!nom_utilisateur || !email || !mot_de_passe) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
    }

    // Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ 
      $or: [{ email }, { nom_utilisateur }] 
    });
    
    if (userExists) {
      if (userExists.email === email) {
        return res.status(409).json({ message: 'Cet email est déjà utilisé' });
      }
      if (userExists.nom_utilisateur === nom_utilisateur) {
        return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà pris' });
      }
    }

    // Créer le nouvel utilisateur
    const newUser = new User({
      nom_utilisateur,
      email,
      mot_de_passe,
      photo: photo ? `/uploads/${photo}` : null
    });

    await newUser.save();

    // Générer le token JWT
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '2d' }
    );

    // Retourner la réponse sans le mot de passe
    const userResponse = {
      _id: newUser._id,
      nom_utilisateur: newUser.nom_utilisateur,
      email: newUser.email,
      photo: newUser.photo,
      role: newUser.role,
      ville: newUser.ville,
      biographie: newUser.biographie
    };

    res.status(201).json({
      message: 'Inscription réussie',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription', error);
    res.status(500).json({ message: 'Erreur lors de l\'inscription', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    // Valider les données
    if (!email || !mot_de_passe) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '2d' }
    );

    // Retourner la réponse sans le mot de passe
    const userResponse = {
      _id: user._id,
      nom_utilisateur: user.nom_utilisateur,
      email: user.email,
      photo: user.photo,
      role: user.role,
      ville: user.ville,
      biographie: user.biographie,
      createdAt: user.createdAt
    };

    res.json({
      message: 'Connexion réussie',
      token,
      user: userResponse
    });

  } catch (err) {
    console.error('Erreur lors de la connexion', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};