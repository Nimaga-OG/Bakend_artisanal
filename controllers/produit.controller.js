const Produit = require('../models/produit.model');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Mots interdits (exemples de marques ou produits industriels)
const motsInterdits = ['nike', 'adidas', 'samsung', 'iphone', 'louis vuitton', 'voiture', 'téléphone', 'ordinateur'];
const categoriesInterdites = ['smartphone', 'téléphone', 'électronique', 'tv', 'automobile'];

function contientMotInterdit(texte) {
  if (!texte) return false;
  return motsInterdits.some(mot => texte.toLowerCase().includes(mot));
}

// === CONFIGURATION MULTER POUR MULTI-IMAGES ===
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/produits/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'produit-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 4 // 1 principale + 3 supplémentaires
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  }
});

// ➕ Ajouter un produit artisanal
exports.ajouterProduit = [
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'imagesSupplementaires', maxCount: 3 }
  ]),
  async (req, res) => {
    try {
      const { nom, description, prix, categorie, ville, stock } = req.body;

      // Validation des champs requis
      if (!nom || !description || !prix || !categorie) {
        return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
      }

      // Vérifier l'image principale
      if (!req.files['image']) {
        return res.status(400).json({ message: 'Image principale requise' });
      }

      // Récupérer les fichiers
      const imagePrincipale = req.files['image'][0] ? `/uploads/produits/${req.files['image'][0].filename}` : '';
      let imagesSupplementaires = [];
      if (req.files['imagesSupplementaires']) {
        imagesSupplementaires = req.files['imagesSupplementaires'].map(file => `/uploads/produits/${file.filename}`);
      }

      // Création du produit
      const produit = new Produit({
        nom,
        description,
        prix: parseFloat(prix),
        categorie,
        ville: ville || '',
        stock: stock ? parseInt(stock) : 1,
        image: imagePrincipale,
        imagesSupplementaires,
        utilisateur: req.user._id
      });

      await produit.save();
      await produit.populate('utilisateur', 'nom_utilisateur email');

      res.status(201).json({
        message: 'Produit ajouté avec succès',
        produit
      });
    } catch (err) {
      console.error('Erreur ajout produit', err);
      res.status(500).json({ 
        message: 'Erreur lors de l\'ajout du produit', 
        error: err.message 
      });
    }
  }
];

// 🔍 Lister tous les produits
exports.listerProduits = async (req, res) => {
  try {
    const { ville, categorie, search, page = 1, limit = 20 } = req.query;
    let filter = {};
    
    if (ville) filter.ville = new RegExp(ville, 'i');
    if (categorie) filter.categorie = new RegExp(categorie, 'i');
    if (search) {
      filter.$or = [
        { nom: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: 'utilisateur',
      sort: { createdAt: -1 }
    };

    const produits = await Produit.paginate(filter, options);
    res.json(produits);
  } catch (err) {
    console.error('Erreur liste produits', err);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des produits', 
      error: err.message 
    });
  }
};

// 🔍 Obtenir un produit par ID
exports.getProduitParId = async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id)
      .populate('utilisateur', 'nom_utilisateur email photo ville')
      .populate('categorie', 'nom');
    
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    res.json(produit);
  } catch (err) {
    console.error('Erreur produit par ID', err);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du produit', 
      error: err.message 
    });
  }
};

// ❌ Supprimer un produit
exports.supprimerProduit = async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id);
    
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    // Vérifier les permissions
    if (produit.utilisateur.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé à supprimer ce produit' });
    }

    // Supprimer l'image si elle existe
    if (produit.image) {
      const imagePath = path.join(__dirname, '..', produit.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Produit.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Produit supprimé avec succès' });
  } catch (err) {
    console.error('Erreur suppression produit', err);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du produit', 
      error: err.message 
    });
  }
};

// ❤️ Ajouter ou retirer des favoris
exports.toggleFavori = async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id);
    
    if (!produit) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }

    const userId = req.user._id.toString();
    const index = produit.favoris.findIndex(id => id.toString() === userId);

    if (index > -1) {
      produit.favoris.splice(index, 1);
    } else {
      produit.favoris.push(userId);
    }

    await produit.save();
    res.json(produit);
  } catch (err) {
    console.error('Erreur toggle favori', err);
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour des favoris', 
      error: err.message 
    });
  }
};

// ❤️ Obtenir les produits favoris
exports.produitsFavoris = async (req, res) => {
  try {
    const favoris = await Produit.find({ favoris: req.user._id })
      .populate('utilisateur', 'nom_utilisateur')
      .populate('categorie', 'nom');
    
    res.json(favoris);
  } catch (err) {
    console.error('Erreur produits favoris', err);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des favoris', 
      error: err.message 
    });
  }
};

// ✏️ Modifier un produit
exports.modifierProduit = async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id);
    
    if (!produit) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }

    // Vérifier les permissions
    if (produit.utilisateur.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé à modifier ce produit' });
    }

    const { nom, description, prix, categorie, ville, stock } = req.body;

    // Vérification des mots interdits
    const contenu = `${nom} ${description}`.toLowerCase();
    if (contientMotInterdit(contenu)) {
      return res.status(400).json({ message: 'Ce produit ne semble pas artisanal. Modification refusée.' });
    }

    // Mise à jour des champs
    if (nom) produit.nom = nom;
    if (description) produit.description = description;
    if (prix) produit.prix = parseFloat(prix);
    if (categorie) produit.categorie = categorie;
    if (ville !== undefined) produit.ville = ville;
    if (stock !== undefined) produit.stock = parseInt(stock);

    // Gestion de la nouvelle image
    if (req.file) {
      // Supprimer l'ancienne image
      if (produit.image) {
        const oldImagePath = path.join(__dirname, '..', produit.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      produit.image = `/uploads/${req.file.filename}`;
    }

    await produit.save();
    await produit.populate('utilisateur', 'nom_utilisateur');
    
    res.json({
      message: 'Produit modifié avec succès',
      produit
    });
  } catch (err) {
    console.error('Erreur modification produit', err);
    res.status(500).json({ 
      message: 'Erreur lors de la modification du produit', 
      error: err.message 
    });
  }
};

// ✅ Mes produits
exports.mesProduits = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: 'categorie',
      sort: { createdAt: -1 }
    };

    const produits = await Produit.paginate(
      { utilisateur: req.user._id }, 
      options
    );
    
    res.json(produits);
  } catch (err) {
    console.error('Erreur mes produits', err);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération de vos produits',
      error: err.message,
    });
  }
};

// 🔍 Produits par catégorie
exports.getProduitsParCategorie = async (req, res) => {
  try {
    const { categorieId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: 'utilisateur',
      sort: { createdAt: -1 }
    };

    const produits = await Produit.paginate(
      { categorie: categorieId }, 
      options
    );
    
    res.json(produits);
  } catch (err) {
    console.error('Erreur produits par catégorie', err);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des produits', 
      error: err.message 
    });
  }
};