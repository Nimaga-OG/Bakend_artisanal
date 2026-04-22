// produit.model.js
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const ProduitSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    required: true,
    maxlength: 1000
  },
  prix: { 
    type: Number, 
    required: true,
    min: 0
  },
  image: { 
    type: String,
    default: ''
  },
  // ✅ NOUVEAU : Tableau d'images supplémentaires
  imagesSupplementaires: [{ 
    type: String 
  }],
  categorie: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Categorie',
    required: true
  },
  ville: { 
    type: String,
    trim: true
  },
  stock: { 
    type: Number, 
    default: 1,
    min: 0
  },
  disponible: { 
    type: Boolean, 
    default: true 
  },
  utilisateur: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  favoris: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  type: {
    type: String,
    enum: ['artisanal', 'autre'],
    default: 'artisanal'
  }
}, { 
  timestamps: true 
});

// Index pour les recherches
ProduitSchema.index({ nom: 'text', description: 'text' });
ProduitSchema.index({ categorie: 1 });
ProduitSchema.index({ utilisateur: 1 });
ProduitSchema.index({ disponible: 1 });

// Plugin de pagination
ProduitSchema.plugin(mongoosePaginate);

// Méthode pour vérifier si le produit est en stock
ProduitSchema.methods.estEnStock = function() {
  return this.stock > 0 && this.disponible;
};

// Méthode pour diminuer le stock
ProduitSchema.methods.diminuerStock = function(quantite = 1) {
  if (this.stock >= quantite) {
    this.stock -= quantite;
    if (this.stock === 0) {
      this.disponible = false;
    }
    return true;
  }
  return false;
};

module.exports = mongoose.model('Produit', ProduitSchema);