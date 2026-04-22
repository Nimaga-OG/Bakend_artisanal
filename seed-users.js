const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/user.model');

// ⚙️ Connexion MongoDB
mongoose.connect('mongodb://localhost:27017/artisanat')
  .then(async () => {
    console.log('✅ Connexion réussie à MongoDB');

    // 🔐 Hash des mots de passe
    
    const hash1 = await bcrypt.hash('admin123', 10);
    const hash2 = await bcrypt.hash('artisan123', 10);
    const hash3 = await bcrypt.hash('client123', 10);

    // 👥 Utilisateurs à insérer
    const utilisateurs = [
      { email: 'admin@gmail.com', mot_de_passe: hash1, role: 'admin' },
      { email: 'artisan1@gmail.com', mot_de_passe: hash2, role: 'artisan' },
      { email: 'client1@gmail.com', mot_de_passe: hash3, role: 'client' }
    ];

    // 🔄 Nettoie la collection (facultatif)
    await User.deleteMany({});
    console.log('🧹 Utilisateurs existants supprimés');

    // 💾 Insertion
    await User.insertMany(utilisateurs);
    console.log('✅ Utilisateurs insérés avec succès');
    process.exit();
  })
  .catch(err => {
    console.error('❌ Erreur MongoDB :', err.message);
    process.exit(1);
  });
