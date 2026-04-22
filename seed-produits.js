const mongoose = require('mongoose');
const Produit = require('./models/produit.model');
const User = require('./models/user.model');
const Categorie = require('./models/categorie.model');

mongoose.connect('mongodb://localhost:27017/artisanat')
  .then(async () => {
    console.log('✅ Connexion à MongoDB réussie');

    // Trouver un artisan
    const artisan = await User.findOne({ role: 'artisan' });
    if (!artisan) {
      console.error('❌ Aucun artisan trouvé.');
      return process.exit(1);
    }

    // Récupérer les catégories
    const textile = await Categorie.findOne({ nom: 'Textile' });
    const sculpture = await Categorie.findOne({ nom: 'Sculpture' });
    const bijoux = await Categorie.findOne({ nom: 'Bijoux' });

    if (!textile || !sculpture || !bijoux) {
      console.error('❌ Certaines catégories sont manquantes. Lance d’abord seed-categories.js');
      return process.exit(1);
    }

    // Supprimer les anciens produits
    await Produit.deleteMany();

    // Créer de nouveaux produits liés aux catégories
    const produits = [
      {
        nom: 'Pagne Bogolan',
        description: 'Tissu traditionnel malien fait à la main.',
        prix: 15000,
        image: 'https://example.com/images/bogolan.jpg',
        artisan: artisan._id,
        categorie: textile._id
      },
      {
        nom: 'Statue en bois',
        description: 'Sculpture artisanale en bois d’ébène.',
        prix: 25000,
        image: 'https://example.com/images/statue.jpg',
        artisan: artisan._id,
        categorie: sculpture._id
      },
      {
        nom: 'Bijoux Touareg',
        description: 'Collier en argent fabriqué par les artisans touaregs.',
        prix: 12000,
        image: 'https://example.com/images/bijoux.jpg',
        artisan: artisan._id,
        categorie: bijoux._id
      }
    ];

    await Produit.insertMany(produits);
    console.log('✅ Produits insérés avec catégories 🧵🪵💍');
    process.exit();
  })
  .catch(err => {
    console.error('❌ Erreur MongoDB :', err);
    process.exit(1);
  });
