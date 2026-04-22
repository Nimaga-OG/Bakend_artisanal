const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Categorie = require('./models/categorie.model');

const categories = [
  {
    nom: 'Tissus bogolan',
    description: 'Tissus traditionnels peints à la main du Mali',
    image: 'https://example.com/images/bogolan.jpg',
  },
  {
    nom: 'Bijoux artisanaux',
    description: 'Colliers, bracelets et boucles faits main',
    image: 'https://example.com/images/bijoux.jpg',
  },
  {
    nom: 'Objets en cuir',
    description: 'Sacs, chaussures et portefeuilles en cuir artisanal',
    image: 'https://example.com/images/cuir.jpg',
  },
  {
    nom: 'Sculptures en bois',
    description: 'Masques et statues traditionnels sculptés à la main',
    image: 'https://example.com/images/bois.jpg',
  },
  {
    nom: 'Poteries & céramiques',
    description: 'Objets décoratifs et vaisselle en argile',
    image: 'https://example.com/images/poterie.jpg',
  },
  {
    nom: 'Vêtements traditionnels',
    description: 'Bazin, boubous, tenues traditionnelles brodées',
    image: 'https://example.com/images/vetements.jpg',
  }
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🟢 Connecté à MongoDB');
    
    // Optionnel : vider les anciennes catégories
    await Categorie.deleteMany();

    // Insérer les nouvelles
    await Categorie.insertMany(categories);

    console.log('✅ Catégories insérées avec succès');
    process.exit();
  })
  .catch(err => {
    console.error('❌ Erreur de connexion MongoDB :', err);
    process.exit(1);
  });
