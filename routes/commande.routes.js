const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const controller = require('../controllers/commande.controller');
const Commande = require('../models/commande.model'); 

// ➕ Créer une commande
router.post("/", auth, async (req, res) => {
  try {
    const { produits, total, adresseLivraison, modePaiement, infosPaiement, nomComplet, telephone, adresse } = req.body;

    if (!produits || produits.length === 0 || !adresseLivraison || !modePaiement) {
      return res.status(400).json({ message: "Champs requis manquants" });
    }

    const commande = new Commande({
      utilisateur: req.user.id, // ✅ récupéré du JWT
      produits,
      total,
      adresseLivraison,
      modePaiement,
      infosPaiement,
      nomComplet,      // <-- à ajouter
      telephone,       // <-- à ajouter
      adresse          // <-- à ajouter
    });

    await commande.save();
    res.status(201).json({ commandeId: commande._id });
  } catch (error) {
    console.error("Erreur backend /api/commandes :", error); // ✅ log clair
    res.status(500).json({ message: "Erreur serveur", error });
  }
});


// 👤 Récupérer les commandes de l'utilisateur connecté
router.get('/mes-commandes', auth, controller.commandesUtilisateur);

// 🛍️ Récupérer les ventes pour un vendeur
router.get('/mes-ventes/:userId', auth, controller.ventesParVendeur);

// 🔍 Obtenir une commande spécifique
router.get('/:id', auth, controller.getCommandeById);

// 🔄 Mettre à jour le statut d'une commande
router.patch('/:id/statut', auth, controller.modifierStatutCommande);

// 🔐 Récupérer toutes les commandes (admin uniquement)
router.get('/', auth, isAdmin, controller.toutesCommandes);

// 🗑️ Annuler une commande
router.delete('/:id', auth, controller.annulerCommande);


module.exports = router;