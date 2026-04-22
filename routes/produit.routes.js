const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const controller = require('../controllers/produit.controller');

// ✅ Route pour créer un produit avec images multiples (1 principale + 2 ou 3 supplémentaires)
router.post(
  '/avec-images-multiples',
  auth,
  controller.ajouterProduit
);

// ✅ Modifier la route existante pour supporter plusieurs images aussi
router.post(
  '/',
  auth,
  controller.ajouterProduit
);

// ✏️ Modifier un produit (à adapter si tu veux gérer la modification de plusieurs images)
router.put('/:id', auth, controller.modifierProduit);

// ❌ Supprimer un produit
router.delete('/:id', auth, controller.supprimerProduit);

// ❤️ Favoris
router.get('/favoris/mes', auth, controller.produitsFavoris);
router.put('/:id/favori', auth, controller.toggleFavori);

// 🧍 Produits de l'utilisateur
router.get('/mes-produits', auth, controller.mesProduits);

// 🔍 Produits par catégorie
router.get('/categorie/:categorieId', controller.getProduitsParCategorie);

// 🔍 Obtenir tous les produits (public)
router.get('/', controller.listerProduits);

// 🔍 Obtenir un produit par ID (public)
router.get('/:id', controller.getProduitParId);

// 📊 Routes admin
router.get('/admin/tous', auth, isAdmin, async (req, res) => {
  try {
    const produits = await Produit.find().populate('utilisateur').populate('categorie');
    res.json(produits);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;