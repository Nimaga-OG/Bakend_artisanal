const User = require('../models/utilisateur.model');
const bcrypt = require('bcryptjs');

// 📋 Admin : lister tous les utilisateurs
exports.listerUtilisateurs = async (req, res) => {
  try {
    const utilisateurs = await User.find().select('-mot_de_passe');
    res.json(utilisateurs);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: err.message });
  }
};

// 👤 Obtenir son propre profil
exports.monProfil = async (req, res) => {
  try {
    const utilisateur = await User.findById(req.user._id).select('-mot_de_passe');
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json(utilisateur);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// 🔁 Modifier son profil
exports.modifierProfil = async (req, res) => {
  try {
    const { nom_utilisateur, email, biographie, ville } = req.body;
    const utilisateur = await User.findById(req.user._id);

    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur introuvable' });

    // Vérifier si l'email ou le nom d'utilisateur existe déjà
    if (email && email !== utilisateur.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (emailExists) return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    if (nom_utilisateur && nom_utilisateur !== utilisateur.nom_utilisateur) {
      const usernameExists = await User.findOne({ nom_utilisateur, _id: { $ne: req.user._id } });
      if (usernameExists) return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà pris' });
    }

    utilisateur.nom_utilisateur = nom_utilisateur || utilisateur.nom_utilisateur;
    utilisateur.email = email || utilisateur.email;
    utilisateur.biographie = biographie || utilisateur.biographie;
    utilisateur.ville = ville || utilisateur.ville;

    await utilisateur.save();
    
    // Retourner sans le mot de passe
    const userResponse = utilisateur.toObject();
    delete userResponse.mot_de_passe;
    
    res.json({ message: 'Profil mis à jour', utilisateur: userResponse });
  } catch (err) {
    res.status(500).json({ message: 'Erreur de mise à jour', error: err.message });
  }
};

// ❌ Supprimer un utilisateur (admin)
exports.supprimerUtilisateur = async (req, res) => {
  try {
    const utilisateur = await User.findByIdAndDelete(req.params.id);
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur suppression', error: err.message });
  }
};

// 🔐 Changer le mot de passe
exports.changerMotDePasse = async (req, res) => {
  try {
    const { motActuel, nouveauMot } = req.body;

    if (!motActuel || !nouveauMot) {
      return res.status(400).json({ message: 'Les deux mots de passe sont requis' });
    }

    if (nouveauMot.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }

    const utilisateur = await User.findById(req.user._id);
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur introuvable' });

    const correspond = await bcrypt.compare(motActuel, utilisateur.mot_de_passe);
    if (!correspond) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    utilisateur.mot_de_passe = await bcrypt.hash(nouveauMot, salt);
    
    await utilisateur.save();

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur de modification', error: err.message });
  }
};