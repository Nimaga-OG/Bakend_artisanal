const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UtilisateurSchema = new mongoose.Schema({
  nom_utilisateur: { type: String, required: true, unique: true },
  email:           { type: String, required: true, unique: true },
  mot_de_passe:    { type: String, required: true },
  biographie:      { type: String },
  photo:           { type: String },
  ville:           { type: String },
  telephone:       { type: String },
  role:            { type: String, enum: ['utilisateur', 'admin'], default: 'utilisateur' }
}, { timestamps: true });

UtilisateurSchema.pre('save', async function (next) {
  if (!this.isModified('mot_de_passe')) return next();
  const salt = await bcrypt.genSalt(10);
  this.mot_de_passe = await bcrypt.hash(this.mot_de_passe, salt);
  next();
});

UtilisateurSchema.methods.verifierMotDePasse = async function (mot) {
  return await bcrypt.compare(mot, this.mot_de_passe);
};

module.exports = mongoose.model('User', UtilisateurSchema);
