const Commande = require('../models/commande.model');
const Produit = require('../models/produit.model');

// ✅ Créer une nouvelle commande
exports.creerCommande = async (req, res) => {
  try {
    console.log('Requête reçue pour création de commande :', req.body);
    const { produits, adresseLivraison, modePaiement, infosPaiement, note, nomComplet, telephone } = req.body;

    // Validation des données
    if (!produits || !Array.isArray(produits) || produits.length === 0) {
      return res.status(400).json({ message: 'La commande doit contenir au moins un produit.' });
    }

    if (!adresseLivraison) {
      return res.status(400).json({ message: 'L\'adresse de livraison est requise.' });
    }

    if (!modePaiement) {
      return res.status(400).json({ message: 'Le mode de paiement est requis.' });
    }

    // Vérifier le stock et préparer les produits
    let total = 0;
    const produitsAvecDetails = [];

    for (const item of produits) {
      const produit = await Produit.findById(item.produit);
      
      if (!produit) {
        return res.status(404).json({ message: `Produit ${item.produit} non trouvé` });
      }

      if (produit.stock < item.quantite) {
        return res.status(400).json({ 
          message: `Stock insuffisant pour ${produit.nom}. Disponible: ${produit.stock}, Demandé: ${item.quantite}` 
        });
      }

      const sousTotal = produit.prix * item.quantite;
      total += sousTotal;

      produitsAvecDetails.push({
        produit: item.produit,
        quantite: item.quantite,
        prixUnitaire: produit.prix,
        nomProduit: produit.nom
      });

      // Réduire le stock
      produit.stock -= item.quantite;
      await produit.save();
    }

    // Créer la commande
    const commande = new Commande({
      utilisateur: req.user._id,
      produits: produitsAvecDetails,
      total,
      adresseLivraison,
      modePaiement,
      infosPaiement,
      note,
      nomComplet,   // <-- AJOUT
      telephone,    // <-- AJOUT      // <-- AJOUT
      statutPaiement: modePaiement === 'especes' ? 'non_paye' : 'paye'
    });

    await commande.save();
    await commande.populate('utilisateur', 'nom_utilisateur email');
    await commande.populate('produits.produit');

    res.status(201).json({
      message: 'Commande créée avec succès',
      commande
    });

  } catch (err) {
    console.error('Erreur lors de la création de la commande :', err);
    res.status(500).json({ message: 'Erreur lors de la création de la commande', error: err.message });
  }
};

// ✅ Commandes passées par l'utilisateur connecté
exports.commandesUtilisateur = async (req, res) => {
  try {
    const commandes = await Commande.find({ utilisateur: req.user._id })
      .populate('produits.produit')
      .sort({ createdAt: -1 });

    res.json(commandes);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des commandes', error: err.message });
  }
};

// ✅ Récupérer toutes les commandes (admin uniquement)
exports.toutesCommandes = async (req, res) => {
  try {
    const { page = 1, limit = 10, statut } = req.query;
    const filter = {};

    if (statut) {
      filter.statut = statut;
    }

    const commandes = await Commande.find(filter)
      .populate('utilisateur', 'nom_utilisateur email')
      .populate('produits.produit')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Commande.countDocuments(filter);

    res.json({
      commandes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des commandes', error: err.message });
  }
};

// ✅ Récupérer les ventes d'un vendeur
exports.ventesParVendeur = async (req, res) => {
  try {
    const vendeurId = req.params.userId;

    // Trouver toutes les commandes qui contiennent des produits de ce vendeur
    const commandes = await Commande.find()
      .populate('utilisateur', 'nom_utilisateur email telephone')
      .populate('produits.produit')
      .sort({ createdAt: -1 });

    // Filtrer pour ne garder que les produits du vendeur
    const ventes = commandes.map(commande => {
      const produitsVendeur = commande.produits.filter(item => 
        item.produit && item.produit.utilisateur && item.produit.utilisateur.toString() === vendeurId
      );

      if (produitsVendeur.length === 0) return null;

      const totalVente = produitsVendeur.reduce((sum, item) => 
        sum + (item.prixUnitaire * item.quantite), 0
      );

      return {
        _id: commande._id,
        acheteur: commande.utilisateur,
        produits: produitsVendeur,
        total: totalVente,
        adresseLivraison: commande.adresseLivraison,
        statut: commande.statut,
        modePaiement: commande.modePaiement,
        statutPaiement: commande.statutPaiement,
        createdAt: commande.createdAt,
        nomComplet: commande.nomComplet,      // <-- AJOUT
        telephone: commande.telephone,        // <-- AJOUT
        note: commande.note                   // <-- AJOUT
      };
    }).filter(vente => vente !== null);

    res.json(ventes);
  } catch (err) {
    console.error('Erreur dans ventesParVendeur:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des ventes.', error: err.message });
  }
};

// ✅ Mettre à jour le statut d'une commande
exports.modifierStatutCommande = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!['en_attente', 'paye', 'livre', 'annule'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const commande = await Commande.findByIdAndUpdate(
      id,
      { statut },
      { new: true, runValidators: true }
    ).populate('utilisateur', 'nom_utilisateur email')
     .populate('produits.produit');

    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    res.json({ message: 'Statut de la commande mis à jour', commande });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du statut', error: err.message });
  }
};

// ✅ Obtenir une commande spécifique
exports.getCommandeById = async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id)
      .populate('utilisateur', 'nom_utilisateur email')
      .populate('produits.produit');

    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Vérifier que l'utilisateur peut voir cette commande
    if (req.user.role !== 'admin' && commande.utilisateur._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    res.json(commande);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération de la commande', error: err.message });
  }
};

exports.annulerCommande = async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);

    if (!commande) {
      return res.status(404).json({ message: "Commande introuvable" });
    }

    if (commande.statut !== "en_attente") {
      return res.status(400).json({ message: "Seules les commandes en attente peuvent être annulées" });
    }

    // 👉 Soit tu changes juste le statut :
    commande.statut = "annule";
    await commande.save();

    // 👉 Ou tu supprimes complètement :
    // await Commande.findByIdAndDelete(req.params.id);

    res.json({ message: "Commande annulée avec succès", commande });
  } catch (error) {
    console.error("Erreur annulation commande :", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
