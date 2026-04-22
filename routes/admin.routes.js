const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const User = require('../models/utilisateur.model');
const Produit = require('../models/produit.model');
const Commande = require('../models/commande.model');
const Categorie = require('../models/categorie.model');

const adminOnly = [auth, roleGuard('admin')];

// ==================== VÉRIFICATION D'ACCÈS ====================
router.get('/check-access', ...adminOnly, (req, res) => {
  res.status(200).json(true);
});

// ==================== UTILISATEURS ====================
router.get('/utilisateurs', ...adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, actif, role } = req.query;
    const filter = {};
    
    if (actif !== undefined) filter.actif = actif === 'true';
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-mot_de_passe')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.status(200).json({
      utilisateurs: users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.get('/utilisateurs/:id', ...adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-mot_de_passe');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.patch('/utilisateurs/:id/statut', ...adminOnly, async (req, res) => {
  try {
    const { actif } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { actif },
      { new: true, runValidators: true }
    ).select('-mot_de_passe');

    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.status(200).json({ message: 'Statut utilisateur mis à jour', user });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.patch('/utilisateurs/:id/role', ...adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['utilisateur', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-mot_de_passe');

    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.status(200).json({ message: 'Rôle utilisateur mis à jour', user });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.delete('/utilisateurs/:id', ...adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ==================== PRODUITS ====================
router.get('/produits', ...adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, actif, categorie, stock } = req.query;
    const filter = {};

    if (actif !== undefined) filter.actif = actif === 'true';
    if (categorie) filter.categorie = categorie;
    if (stock === 'low') filter.stock = { $lt: 5 };
    if (stock === 'out') filter.stock = 0;

    const produits = await Produit.find(filter)
      .populate("categorie", "nom")
      .populate("utilisateur", "nom_utilisateur email") // ✅ singular
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
 
    const total = await Produit.countDocuments(filter);

    res.status(200).json({
      produits,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.get('/produits/recentes', ...adminOnly, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const produits = await Produit.find()
      .populate('categorie', 'nom')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json(produits);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.patch('/produits/:id/statut', ...adminOnly, async (req, res) => {
  try {
    const { actif } = req.body;
    const produit = await Produit.findByIdAndUpdate(
      req.params.id,
      { actif },
      { new: true, runValidators: true }
    ).populate('categorie', 'nom');

    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });
    res.status(200).json({ message: 'Statut produit mis à jour', produit });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.delete('/produits/:id', ...adminOnly, async (req, res) => {
  try {
    const produit = await Produit.findByIdAndDelete(req.params.id);
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });
    res.status(200).json({ message: 'Produit supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ==================== COMMANDES ====================
router.get('/commandes', ...adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, statut, modePaiement } = req.query;
    const filter = {};

    if (statut) filter.statut = statut;
    if (modePaiement) filter.modePaiement = modePaiement;

    const commandes = await Commande.find(filter)
      .populate('utilisateur', 'nom_utilisateur email')
      .populate('produits.produit', 'nom prix image')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Commande.countDocuments(filter);

    res.status(200).json({
      commandes,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.get('/commandes/recentes', ...adminOnly, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const commandes = await Commande.find()
      .populate('utilisateur', 'nom_utilisateur email')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json(commandes);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.get('/commandes/:id', ...adminOnly, async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id)
      .populate('utilisateur', 'nom_utilisateur email')
      .populate('produits.produit', 'nom prix image');

    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });
    res.status(200).json(commande);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.patch('/commandes/:id/statut', ...adminOnly, async (req, res) => {
  try {
    const { statut } = req.body;
    
    if (!['en_attente', 'paye', 'livre', 'annule'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const commande = await Commande.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true, runValidators: true }
    ).populate('utilisateur', 'nom_utilisateur email');

    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });
    res.status(200).json({ message: 'Statut commande mis à jour', commande });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.patch('/commandes/:id/annuler', ...adminOnly, async (req, res) => {
  try {
    const commande = await Commande.findByIdAndUpdate(
      req.params.id,
      { statut: 'annule' },
      { new: true, runValidators: true }
    );

    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });
    res.status(200).json({ message: 'Commande annulée', commande });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ==================== STATISTIQUES ====================
router.get('/stats', ...adminOnly, async (req, res) => {
  try {
    const [
      totalProduits,
      totalVentes,
      totalUtilisateurs,
      produitsEnStock,
      produitsRupture,
      chiffreAffairesTotal
    ] = await Promise.all([
      Produit.countDocuments(),
      Commande.countDocuments(),
      User.countDocuments(),
      Produit.countDocuments({ stock: { $gt: 0 } }),
      Produit.countDocuments({ stock: 0 }),
      Commande.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }])
    ]);

    // Statistiques du mois en cours
    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);

    const [
      ventesMois,
      chiffreAffairesMois,
      nouveauxUtilisateursMois
    ] = await Promise.all([
      Commande.countDocuments({ createdAt: { $gte: debutMois } }),
      Commande.aggregate([
        { $match: { createdAt: { $gte: debutMois } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      User.countDocuments({ createdAt: { $gte: debutMois } })
    ]);

    res.status(200).json({
      stats: {
        totalProduits,
        totalVentes,
        totalUtilisateurs,
        produitsEnStock,
        produitsRupture,
        chiffreAffairesTotal: chiffreAffairesTotal[0]?.total || 0,
        ventesMois,
        chiffreAffairesMois: chiffreAffairesMois[0]?.total || 0,
        nouveauxUtilisateursMois
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.get('/stats/ventes', ...adminOnly, async (req, res) => {
  try {
    const { debut, fin } = req.query;
    const filter = {};

    if (debut && fin) {
      filter.createdAt = {
        $gte: new Date(debut),
        $lte: new Date(fin)
      };
    }

    const stats = await Commande.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalVentes: { $sum: 1 },
          chiffreAffaires: { $sum: '$total' },
          moyenneCommande: { $avg: '$total' }
        }
      }
    ]);

    res.status(200).json(stats[0] || { totalVentes: 0, chiffreAffaires: 0, moyenneCommande: 0 });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ==================== DASHBOARD ====================
router.get('/dashboard', ...adminOnly, async (req, res) => {
  try {
    const [stats, recentProducts, recentOrders, recentUsers] = await Promise.all([
      // Stats globales
      (async () => {
        const [
          totalProduits,
          totalVentes,
          totalUtilisateurs,
          chiffreAffairesTotal
        ] = await Promise.all([
          Produit.countDocuments(),
          Commande.countDocuments(),
          User.countDocuments(),
          Commande.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }])
        ]);

        return {
          totalProduits,
          totalVentes,
          totalUtilisateurs,
          chiffreAffairesTotal: chiffreAffairesTotal[0]?.total || 0
        };
      })(),
      
      // Produits récents
      Produit.find()
        .populate('categorie', 'nom')
        .sort({ createdAt: -1 })
        .limit(10),
      
      // Commandes récentes
      Commande.find()
        .populate('utilisateur', 'nom_utilisateur email')
        .sort({ createdAt: -1 })
        .limit(10),
      
      // Utilisateurs récents
      User.find()
        .select('-mot_de_passe')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    res.status(200).json({
      stats,
      recentProducts,
      recentOrders,
      recentUsers
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// ==================== CATÉGORIES ====================
router.get('/categories', ...adminOnly, async (req, res) => {
  try {
    const categories = await Categorie.find().sort({ nom: 1 });
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.post('/categories', ...adminOnly, async (req, res) => {
  try {
    const { nom, description } = req.body;
    
    if (!nom) {
      return res.status(400).json({ message: 'Le nom de la catégorie est requis' });
    }

    const categorieExistante = await Categorie.findOne({ nom });
    if (categorieExistante) {
      return res.status(409).json({ message: 'Cette catégorie existe déjà' });
    }

    const nouvelleCategorie = new Categorie({ nom, description });
    await nouvelleCategorie.save();

    res.status(201).json({ message: 'Catégorie créée avec succès', categorie: nouvelleCategorie });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.patch('/categories/:id', ...adminOnly, async (req, res) => {
  try {
    const { nom, description } = req.body;
    const categorie = await Categorie.findByIdAndUpdate(
      req.params.id,
      { nom, description },
      { new: true, runValidators: true }
    );

    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvée' });
    res.status(200).json({ message: 'Catégorie mise à jour', categorie });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.delete('/categories/:id', ...adminOnly, async (req, res) => {
  try {
    const categorie = await Categorie.findByIdAndDelete(req.params.id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvée' });
    res.status(200).json({ message: 'Catégorie supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;