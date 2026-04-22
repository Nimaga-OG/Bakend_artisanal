const mongoose = require('mongoose');
const User = require('./models/utilisateur.model');

mongoose.connect('mongodb://localhost:27017/nom_de_ta_db', { useNewUrlParser: true, useUnifiedTopology: true });

async function seedAdmin() {
  const email = 'nimagabakary@gmail.com';
  const update = {
    nom_utilisateur: 'bn1',
    email,
    mot_de_passe: '$2a$10$gar8WWMVdHePd1Qwm0iHl.OpPaS4A5Bl1eS8SGkEHXqAEZ0.Mg.qe', // hash déjà généré
    photo: '/uploads/photo-1756377362287-996458264.jpg',
    role: 'admin',
    biographie: 'mcvnjf AAA',
    ville: 'Bamako'
  };

  await User.findOneAndUpdate({ email }, update, { upsert: true, new: true });
  console.log('Admin seedé ou mis à jour');
  mongoose.disconnect();
}

seedAdmin();