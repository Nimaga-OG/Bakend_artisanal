const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const Categorie = require('../models/categorie.model');

// ➕ Ajouter une catégorie
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const cat = new Categorie({ nom: req.body.nom });
    await cat.save();
    res.status(201).json(cat);
  } catch (err) {
    res.status(400).json({ message: 'Erreur catégorie', error: err });
  }
});

// 📄 Lister les catégories
router.get('/', async (req, res) => {
  const categories = await Categorie.find();
  res.json(categories);
});

// ❌ Supprimer une catégorie
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    await Categorie.findByIdAndDelete(req.params.id);
    res.json({ message: 'Catégorie supprimée' });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

module.exports = router;
