const mongoose = require('mongoose');

const infosPaiementSchema = new mongoose.Schema({
  numero: {
    type: String,
    validate: {
      validator: function (value) {
        if (['orange', 'moov'].includes(this.modePaiement)) {
          return typeof value === 'string' && value.trim() !== '';
        }
        return true;
      },
      message: 'Le numéro de paiement est requis pour Orange ou Moov.'
    }
  },
  transactionId: {
    type: String,
    required: function () {
      return ['orange', 'moov'].includes(this.modePaiement);
    }
  }
}, { _id: false });

const CommandeSchema = new mongoose.Schema({
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  produits: [{
    produit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Produit',
      required: true
    },
    quantite: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    prixUnitaire: {
      type: Number,
      required: true
    },
    nomProduit: {
      type: String,
      required: true
    }
  }],
  total: {
    type: Number,
    required: true,
    min: 0
  },
  statut: {
    type: String,
    enum: ['en_attente', 'paye', 'livre', 'annule'],
    default: 'en_attente'
  },
  adresseLivraison: {
    type: String,
    required: true
  },
  modePaiement: {
    type: String,
    enum: ['orange', 'moov', 'espèces','mobile_money', 'carte_bancaire'],
    required: true
  },
  statutPaiement: {
    type: String,
    enum: ['non_paye', 'paye'],
    default: 'non_paye'
  },
  infosPaiement: {
    type: infosPaiementSchema,
    default: null
  },
  note: {
    type: String,
    maxlength: 500
  },
  nomComplet: { type: String },
  telephone: { type: String },
}, {
  timestamps: true
});

// Index pour améliorer les performances
CommandeSchema.index({ utilisateur: 1, createdAt: -1 });
CommandeSchema.index({ statut: 1 });
CommandeSchema.index({ createdAt: 1 });

// Méthode pour calculer le total
CommandeSchema.methods.calculerTotal = function() {
  this.total = this.produits.reduce((total, item) => {
    return total + (item.prixUnitaire * item.quantite);
  }, 0);
  return this.total;
};

module.exports = mongoose.model('Commande', CommandeSchema);